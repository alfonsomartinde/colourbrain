<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Infrastructure\Database\Database;
use App\Repositories\GameStateRepository;
use App\Repositories\QuestionRepository;
use App\Repositories\AnswerRepository;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class PresenterController
{
    /**
     * POST /api/presenter/start-game — reset básico: turno=0, bote=0, flags.
     */
    public function startGame(Request $request, Response $response): Response
    {
        $db = $this->db();
        $stateRepo = new GameStateRepository($db);
        $questionRepo = new QuestionRepository($db);
        $pdo = $db->getConnection();
        // Reset full game in a transaction
        $pdo->beginTransaction();
        $stateRepo->getOrCreate();
        try {
            // Reset players points
            $pdo->exec('UPDATE players SET points = 0');
            // Reset questions
            $pdo->exec('UPDATE questions SET asked = 0, turn_id = 0');
            // Optionally clear answers
            $pdo->exec('DELETE FROM answers');
        } catch (\Throwable $e) {
            $pdo->rollBack();
            $response->getBody()->write(json_encode(['ok' => false, 'error' => 'reset-failed']));
            return $response->withStatus(500)->withHeader('Content-Type', \App\Http\Http::CONTENT_TYPE_JSON);
        }
        $stateRepo->update([
            'current_turn' => 0,
            'additional_points' => 0,
            'correct_answer_shown' => 0,
            'previous_points' => json_encode(new \stdClass()),
            'phase' => 'idle',
            'turn_end_at' => null,
        ]);
        $pdo->commit();
        $response->getBody()->write(json_encode(['ok' => true]));
        return $response->withHeader('Content-Type', \App\Http\Http::CONTENT_TYPE_JSON);
    }

    /**
     * POST /api/presenter/show-correct — fija fase 'reveal' y devuelve solución y ganadores.
     */
    public function showCorrect(Request $request, Response $response): Response
    {
        $db = $this->db();
        $stateRepo = new GameStateRepository($db);
        $questionRepo = new QuestionRepository($db);
        $answerRepo = new AnswerRepository($db);

        $state = $stateRepo->getOrCreate();
        $turnId = (int)($state['current_turn'] ?? 0);
        if ($turnId <= 0) {
            $response->getBody()->write(json_encode(['ok' => false, 'reason' => 'no-turn']));
            return $response->withStatus(409)->withHeader('Content-Type', \App\Http\Http::CONTENT_TYPE_JSON);
        }
        $q = $questionRepo->findByTurnId($turnId);
        if (!$q) {
            $response->getBody()->write(json_encode(['ok' => false, 'reason' => 'no-question']));
            return $response->withStatus(409)->withHeader('Content-Type', \App\Http\Http::CONTENT_TYPE_JSON);
        }
        $correctIds = array_map('intval', array_values(array_filter(array_map('trim', explode(',', (string)$q['correctColorIds'])))));
        sort($correctIds, SORT_NUMERIC);
        $answers = $answerRepo->findByTurn($turnId);
        $winners = [];
        foreach ($answers as $a) {
            $ids = array_map('intval', array_values(array_filter(array_map('trim', explode(',', (string)$a['color_ids'])))));            sort($ids, SORT_NUMERIC);
            if ($ids === $correctIds) {
                $winners[] = (int)$a['player_id'];
            }
        }
        // aplicar puntuaciones y actualizar bote de forma idempotente
        $alreadyRevealed = (int)($state['correct_answer_shown'] ?? 0) === 1;
        if (!$alreadyRevealed) {
            $pdo = $db->getConnection();
            $pdo->beginTransaction();
            try {
                $pot = (int)($state['additional_points'] ?? 0);
                if (!empty($winners)) {
                    $reward = 1 + $pot;
                    // sumar puntos a cada ganador
                    $upd = $pdo->prepare('UPDATE players SET points = points + :r WHERE id = :id');
                    foreach ($winners as $wid) {
                        $upd->execute([':r' => $reward, ':id' => $wid]);
                    }
                    // resetear bote
                    $stateRepo->update(['additional_points' => 0, 'phase' => 'reveal', 'correct_answer_shown' => 1]);
                } else {
                    // nadie acertó → incrementar bote
                    $stateRepo->update(['additional_points' => $pot + 1, 'phase' => 'reveal', 'correct_answer_shown' => 1]);
                }
                $pdo->commit();
            } catch (\Throwable $e) {
                $pdo->rollBack();
                $response->getBody()->write(json_encode(['ok' => false, 'error' => 'apply-points-failed']));
                return $response->withStatus(500)->withHeader('Content-Type', \App\Http\Http::CONTENT_TYPE_JSON);
            }
        } else {
            // asegurar flags de fase
            $stateRepo->update(['phase' => 'reveal', 'correct_answer_shown' => 1]);
        }

        $payload = [
            'correctColorIds' => $correctIds,
            'winners' => $winners,
        ];
        $response->getBody()->write(json_encode(['ok' => true, 'data' => $payload]));
        return $response->withHeader('Content-Type', \App\Http\Http::CONTENT_TYPE_JSON);
    }

    /**
     * POST /api/presenter/start-turn — seleccionar pregunta y fijar fin de turno.
     */
    public function startTurn(Request $request, Response $response): Response
    {
        $db = $this->db();
        $stateRepo = new GameStateRepository($db);
        $questionRepo = new QuestionRepository($db);

        $state = $stateRepo->getOrCreate();
        $currentTurn = ((int)$state['current_turn']) + 1;
        $stateRepo->update(['current_turn' => $currentTurn]);

        $existing = $questionRepo->findByTurnId($currentTurn);
        $question = $existing ?: $questionRepo->pickRandomUnasked();
        if (!$question) {
            // No more questions → set idle and clear timing
            $stateRepo->update(['phase' => 'idle', 'turn_end_at' => null]);
            $response->getBody()->write(json_encode(['ok' => false, 'reason' => 'no-questions']));
            return $response->withStatus(409)->withHeader('Content-Type', \App\Http\Http::CONTENT_TYPE_JSON);
        }
        if (!$existing) {
            $questionRepo->markAsked((int)$question['id'], $currentTurn);
        }

        $duration = (int)($_ENV['TURN_DURATION_SECONDS'] ?? 90);
        $endAt = (new \DateTimeImmutable('+'.$duration.' seconds'))->format('Y-m-d H:i:s');

        $stateRepo->update([
            'phase' => 'question',
            'correct_answer_shown' => 0,
            'turn_end_at' => $endAt,
        ]);

        $payload = [
            'turn' => $currentTurn,
            'question' => [
                'id' => (int)$question['id'],
                'text' => $question['text'],
                'requiredColorsCount' => count(array_filter(explode(',', $question['correctColorIds']))),
            ],
            'turnEndAt' => $endAt,
            'turnDurationSeconds' => $duration,
            'additionalPoints' => (int)$state['additional_points'],
        ];

        $response->getBody()->write(json_encode(['ok' => true, 'data' => $payload]));
        return $response->withHeader('Content-Type', \App\Http\Http::CONTENT_TYPE_JSON);
    }

    private function db(): Database
    {
        return new Database(
            $_ENV['DB_HOST'] ?? 'localhost',
            (int)($_ENV['DB_PORT'] ?? 3306),
            $_ENV['DB_DATABASE'] ?? 'colourbrain',
            $_ENV['DB_USERNAME'] ?? 'root',
            $_ENV['DB_PASSWORD'] ?? ''
        );
    }
}


