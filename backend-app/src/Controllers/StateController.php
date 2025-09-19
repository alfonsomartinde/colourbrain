<?php
declare(strict_types=1);

namespace App\Controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Infrastructure\Database\Database;
use App\Repositories\ColorRepository;
use App\Repositories\PlayerRepository;
use App\Repositories\GameStateRepository;
use App\Repositories\QuestionRepository;
use App\Repositories\AnswerRepository;

class StateController
{
    /**
     * GET /api/colors — devuelve los colores desde BBDD.
     */
    public function getColors(Request $request, Response $response): Response
    {
        $db = new Database(
            $_ENV['DB_HOST'] ?? 'localhost',
            (int)($_ENV['DB_PORT'] ?? 3306),
            $_ENV['DB_DATABASE'] ?? 'colourbrain',
            $_ENV['DB_USERNAME'] ?? 'root',
            $_ENV['DB_PASSWORD'] ?? ''
        );
        $repo = new ColorRepository($db);
        $rows = $repo->findAll();
        // map to hexValue camelCase for frontend contract
        $colors = array_map(function(array $r){
            return ['id' => (int)$r['id'], 'name' => $r['name'], 'hexValue' => $r['hex_value']];
        }, $rows);
        $response->getBody()->write(json_encode($colors));
        return $response->withHeader('Content-Type', \App\Http\Http::CONTENT_TYPE_JSON);
    }

    /**
     * GET /api/players — jugadores desde BBDD
     */
    public function getPlayers(Request $request, Response $response): Response
    {
        $db = new Database(
            $_ENV['DB_HOST'] ?? 'localhost',
            (int)($_ENV['DB_PORT'] ?? 3306),
            $_ENV['DB_DATABASE'] ?? 'colourbrain',
            $_ENV['DB_USERNAME'] ?? 'root',
            $_ENV['DB_PASSWORD'] ?? ''
        );
        $repo = new PlayerRepository($db);
        $rows = $repo->findAll();
        $players = array_map(function(array $r){
            return ['id' => (int)$r['id'], 'name' => $r['name'], 'points' => (int)$r['points']];
        }, $rows);
        $response->getBody()->write(json_encode($players));
        return $response->withHeader('Content-Type', \App\Http\Http::CONTENT_TYPE_JSON);
    }

    /**
     * GET /api/state — snapshot mínimo de estado
     */
    public function getState(Request $request, Response $response): Response
    {
        $db = new Database(
            $_ENV['DB_HOST'] ?? 'localhost',
            (int)($_ENV['DB_PORT'] ?? 3306),
            $_ENV['DB_DATABASE'] ?? 'colourbrain',
            $_ENV['DB_USERNAME'] ?? 'root',
            $_ENV['DB_PASSWORD'] ?? ''
        );
        $stateRepo = new GameStateRepository($db);
        $questionRepo = new QuestionRepository($db);
        $row = $stateRepo->getOrCreate();
        $active = null;
        if ((int)$row['current_turn'] > 0) {
            $q = $questionRepo->findByTurnId((int)$row['current_turn']);
            if ($q) {
                $active = [
                    'id' => (int)$q['id'],
                    'text' => $q['text'],
                    'requiredColorsCount' => count(array_filter(explode(',', $q['correctColorIds']))),
                ];
            }
        }
        $state = [
            'phase' => $row['phase'] ?? 'idle',
            'current_turn' => (int)($row['current_turn'] ?? 0),
            'additional_points' => (int)($row['additional_points'] ?? 0),
            'correct_answer_shown' => (bool)($row['correct_answer_shown'] ?? 0),
            'turn_duration_seconds' => (int)($_ENV['TURN_DURATION_SECONDS'] ?? 90),
            'active_question' => $active,
            'turn_end_at' => $row['turn_end_at'] ?? null,
        ];
        // Compute a stable version/ETag based on relevant fields
        $versionSource = json_encode([
            'phase' => $state['phase'],
            'current_turn' => $state['current_turn'],
            'additional_points' => $state['additional_points'],
            'correct_answer_shown' => $state['correct_answer_shown'],
            'turn_end_at' => $state['turn_end_at'],
            'active_question_id' => $active ? $active['id'] : null,
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $etag = '"' . sha1((string)$versionSource) . '"';
        $since = $request->getQueryParams()['since'] ?? '';
        $ifNoneMatch = trim((string)$request->getHeaderLine('If-None-Match'));

        // Conditional responses to reduce payload
        if ($ifNoneMatch !== '' && $ifNoneMatch === $etag) {
            return $response
                ->withStatus(304)
                ->withHeader('ETag', $etag)
                ->withHeader('Cache-Control', 'no-cache');
        }
        if ($since !== '' && $since === $etag) {
            return $response
                ->withStatus(204)
                ->withHeader('ETag', $etag)
                ->withHeader('X-Resource-Version', $etag)
                ->withHeader('Cache-Control', 'no-cache');
        }

        $payload = $state + ['version' => $etag];
        $response->getBody()->write(json_encode($payload));
        return $response
            ->withHeader('Content-Type', \App\Http\Http::CONTENT_TYPE_JSON)
            ->withHeader('ETag', $etag)
            ->withHeader('X-Resource-Version', $etag)
            ->withHeader('Cache-Control', 'no-cache');
    }

    /**
     * GET /api/answers/current — respuestas del turno actual (stub vacío por ahora)
     */
    public function getCurrentAnswers(Request $request, Response $response): Response
    {
        $db = new Database(
            $_ENV['DB_HOST'] ?? 'localhost',
            (int)($_ENV['DB_PORT'] ?? 3306),
            $_ENV['DB_DATABASE'] ?? 'colourbrain',
            $_ENV['DB_USERNAME'] ?? 'root',
            $_ENV['DB_PASSWORD'] ?? ''
        );
        $stateRepo = new GameStateRepository($db);
        $answerRepo = new AnswerRepository($db);
        $questionRepo = new QuestionRepository($db);
        $state = $stateRepo->getOrCreate();
        $turnId = (int)($state['current_turn'] ?? 0);
        $question = $turnId > 0 ? $questionRepo->findByTurnId($turnId) : null;
        $answers = $turnId > 0 ? $answerRepo->findByTurn($turnId) : [];
        $payload = [
            'turn_id' => $turnId ?: null,
            'question_id' => $question ? (int)$question['id'] : null,
            'answers' => array_map(function(array $a) {
                $ids = array_values(array_filter(array_map('trim', explode(',', (string)$a['color_ids']))));
                sort($ids, SORT_NUMERIC);
                return [
                    'playerId' => (int)$a['player_id'],
                    'colorIds' => array_map('intval', $ids),
                ];
            }, $answers),
        ];
        // Compute ETag/version based on answers list
        $versionSource = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $etag = '"' . sha1((string)$versionSource) . '"';
        $since = $request->getQueryParams()['since'] ?? '';
        $ifNoneMatch = trim((string)$request->getHeaderLine('If-None-Match'));

        if ($ifNoneMatch !== '' && $ifNoneMatch === $etag) {
            return $response
                ->withStatus(304)
                ->withHeader('ETag', $etag)
                ->withHeader('Cache-Control', 'no-cache');
        }
        if ($since !== '' && $since === $etag) {
            return $response
                ->withStatus(204)
                ->withHeader('ETag', $etag)
                ->withHeader('X-Resource-Version', $etag)
                ->withHeader('Cache-Control', 'no-cache');
        }

        $payload['version'] = $etag;
        $response->getBody()->write(json_encode($payload));
        return $response
            ->withHeader('Content-Type', \App\Http\Http::CONTENT_TYPE_JSON)
            ->withHeader('ETag', $etag)
            ->withHeader('X-Resource-Version', $etag)
            ->withHeader('Cache-Control', 'no-cache');
    }

    /**
     * GET /api/reveal/current — solución correcta y ganadores del turno actual.
     */
    public function getCurrentReveal(Request $request, Response $response): Response
    {
        $db = new Database(
            $_ENV['DB_HOST'] ?? 'localhost',
            (int)($_ENV['DB_PORT'] ?? 3306),
            $_ENV['DB_DATABASE'] ?? 'colourbrain',
            $_ENV['DB_USERNAME'] ?? 'root',
            $_ENV['DB_PASSWORD'] ?? ''
        );
        $stateRepo = new GameStateRepository($db);
        $questionRepo = new QuestionRepository($db);
        $answerRepo = new AnswerRepository($db);

        $state = $stateRepo->getOrCreate();
        $turnId = (int)($state['current_turn'] ?? 0);
        $q = $turnId > 0 ? $questionRepo->findByTurnId($turnId) : null;
        if (!$q) {
            $response->getBody()->write(json_encode(['correctColorIds' => [], 'winners' => []]));
            return $response->withHeader('Content-Type', \App\Http\Http::CONTENT_TYPE_JSON);
        }
        $correctIds = array_map('intval', array_values(array_filter(array_map('trim', explode(',', (string)$q['correctColorIds'])))));
        sort($correctIds, SORT_NUMERIC);
        $answers = $answerRepo->findByTurn($turnId);
        $winners = [];
        foreach ($answers as $a) {
            $raw = explode(',', (string)$a['color_ids']);
            $trimmed = array_map('trim', $raw);
            $filtered = array_values(array_filter($trimmed, fn($v) => $v !== ''));
            $ids = array_map('intval', $filtered);
            sort($ids, SORT_NUMERIC);
            if ($ids === $correctIds) {
                $winners[] = (int)$a['player_id'];
            }
        }
        $payload = ['correctColorIds' => $correctIds, 'winners' => $winners];
        $versionSource = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $etag = '"' . sha1((string)$versionSource) . '"';
        $since = $request->getQueryParams()['since'] ?? '';
        $ifNoneMatch = trim((string)$request->getHeaderLine('If-None-Match'));

        if ($ifNoneMatch !== '' && $ifNoneMatch === $etag) {
            return $response
                ->withStatus(304)
                ->withHeader('ETag', $etag)
                ->withHeader('Cache-Control', 'no-cache');
        }
        if ($since !== '' && $since === $etag) {
            return $response
                ->withStatus(204)
                ->withHeader('ETag', $etag)
                ->withHeader('X-Resource-Version', $etag)
                ->withHeader('Cache-Control', 'no-cache');
        }

        $payload['version'] = $etag;
        $response->getBody()->write(json_encode($payload));
        return $response
            ->withHeader('Content-Type', \App\Http\Http::CONTENT_TYPE_JSON)
            ->withHeader('ETag', $etag)
            ->withHeader('X-Resource-Version', $etag)
            ->withHeader('Cache-Control', 'no-cache');
    }

    /**
     * POST /api/player/answer — registra la respuesta del jugador si procede.
     * Body: { playerId:number, colorIds:number[] }
     * Reglas: una respuesta por jugador/turno; fuera de tiempo o repetidas → ignored.
     */
    public function postPlayerAnswer(Request $request, Response $response): Response
    {
        $db = new Database(
            $_ENV['DB_HOST'] ?? 'localhost',
            (int)($_ENV['DB_PORT'] ?? 3306),
            $_ENV['DB_DATABASE'] ?? 'colourbrain',
            $_ENV['DB_USERNAME'] ?? 'root',
            $_ENV['DB_PASSWORD'] ?? ''
        );
        $stateRepo = new GameStateRepository($db);
        $questionRepo = new QuestionRepository($db);

        $status = 200;
        $result = ['ok' => true, 'accepted' => false, 'ignored' => true, 'reason' => 'unknown'];

        // 1) Parseo y validación básica
        [$playerId, $ids] = $this->parseAnswerPayload($request);
        if ($playerId <= 0 || empty($ids)) {
            $status = 400;
            $result = ['ok' => false, 'reason' => 'bad-input'];
        } else {
            // 2) Validar ventana temporal del turno
            $state = $stateRepo->getOrCreate();
            $turnId = (int)($state['current_turn'] ?? 0);
            if ($this->isTurnClosed($state)) {
                $result = ['ok' => true, 'accepted' => false, 'ignored' => true, 'reason' => 'timeout'];
            } else {
                // 3) Idempotencia
                $pdo = $db->getConnection();
                if ($this->existsAnswer($pdo, $playerId, $turnId)) {
                    $result = ['ok' => true, 'accepted' => false, 'ignored' => true, 'reason' => 'duplicate'];
                } else {
                    // 4) Pregunta del turno y guardado
                    $questionId = $this->getQuestionIdForTurn($questionRepo, $turnId);
                    if ($questionId === null) {
                        $result = ['ok' => true, 'accepted' => false, 'ignored' => true, 'reason' => 'no-question'];
                    } else {
                        $this->saveAnswer($pdo, $playerId, $ids, $questionId, $turnId);
                        $result = ['ok' => true, 'accepted' => true, 'ignored' => false];
                    }
                }
            }
        }

        $response->getBody()->write(json_encode($result));
        return $response->withStatus($status)->withHeader('Content-Type', \App\Http\Http::CONTENT_TYPE_JSON);
    }

    /**
     * Extrae y normaliza el payload del body.
     * @return array{0:int,1:array<int,int>}
     */
    private function parseAnswerPayload(Request $request): array
    {
        $body = $request->getParsedBody();
        $playerId = (int)($body['playerId'] ?? 0);
        $ids = is_array($body['colorIds'] ?? null) ? array_map('intval', (array)$body['colorIds']) : [];
        return [$playerId, $ids];
    }

    /**
     * Devuelve true si el turno no acepta más respuestas (timeout/sin turno).
     * @param array<string,mixed> $state
     */
    private function isTurnClosed(array $state): bool
    {
        $turnId = (int)($state['current_turn'] ?? 0);
        $endAtStr = $state['turn_end_at'] ?? null;
        // Interpret stored end time as UTC and compare using UTC now
        $tzUtc = new \DateTimeZone('UTC');
        $endAt = $endAtStr ? \DateTimeImmutable::createFromFormat('Y-m-d H:i:s', (string)$endAtStr, $tzUtc) : null;
        $now = new \DateTimeImmutable('now', $tzUtc);
        return $turnId <= 0 || !$endAt || $now > $endAt;
    }

    /**
     * Comprueba si ya existe respuesta para (player, turn).
     */
    private function existsAnswer(\PDO $pdo, int $playerId, int $turnId): bool
    {
        $chk = $pdo->prepare('SELECT id FROM answers WHERE player_id = :pid AND turn_id = :tid LIMIT 1');
        $chk->execute([':pid' => $playerId, ':tid' => $turnId]);
        return (bool)$chk->fetch();
    }

    /**
     * Obtiene el id de la pregunta del turno o null si no hay.
     */
    private function getQuestionIdForTurn(QuestionRepository $repo, int $turnId): ?int
    {
        $q = $repo->findByTurnId($turnId);
        return $q ? (int)$q['id'] : null;
    }

    /**
     * Guarda la respuesta del jugador para el turno (ids ordenados canónicamente).
     */
    private function saveAnswer(\PDO $pdo, int $playerId, array $colorIds, int $questionId, int $turnId): void
    {
        sort($colorIds, SORT_NUMERIC);
        $colorStr = implode(',', $colorIds);
        $ins = $pdo->prepare('INSERT INTO answers (player_id, color_ids, question_id, turn_id) VALUES (:pid, :cids, :qid, :tid)');
        $ins->execute([':pid' => $playerId, ':cids' => $colorStr, ':qid' => $questionId, ':tid' => $turnId]);
    }

    /**
     * GET /api/history — historial por turnos con respuestas y ganadores
     */
    public function getHistory(Request $request, Response $response): Response
    {
        $db = new Database(
            $_ENV['DB_HOST'] ?? 'localhost',
            (int)($_ENV['DB_PORT'] ?? 3306),
            $_ENV['DB_DATABASE'] ?? 'colourbrain',
            $_ENV['DB_USERNAME'] ?? 'root',
            $_ENV['DB_PASSWORD'] ?? ''
        );
        $questionRepo = new QuestionRepository($db);
        $answerRepo = new AnswerRepository($db);

        $asked = $questionRepo->findAskedInOrder();
        $items = [];
        foreach ($asked as $q) {
            $turnId = (int)$q['turn_id'];
            $correctIds = array_map('intval', array_values(array_filter(array_map('trim', explode(',', (string)$q['correctColorIds'])))));
            sort($correctIds, SORT_NUMERIC);
            $answers = $answerRepo->findByTurn($turnId);
            $winners = [];
            $ansPayload = [];
            foreach ($answers as $a) {
                $raw = explode(',', (string)$a['color_ids']);
                $trimmed = array_map('trim', $raw);
                $filtered = array_values(array_filter($trimmed, fn($v) => $v !== ''));
                $ids = array_map('intval', $filtered);
                sort($ids, SORT_NUMERIC);
                $isCorrect = ($ids === $correctIds);
                if ($isCorrect) { $winners[] = (int)$a['player_id']; }
                $ansPayload[] = [
                    'playerId' => (int)$a['player_id'],
                    'colorIds' => $ids,
                    'correct' => $isCorrect,
                    'pointsGained' => 0, // se puede calcular si guardamos bote por turno
                ];
            }
            $items[] = [
                'turn' => $turnId,
                'questionId' => (int)$q['id'],
                'text' => (string)$q['text'],
                'correctColorIds' => $correctIds,
                'winners' => $winners,
                'answers' => $ansPayload,
            ];
        }
        $response->getBody()->write(json_encode($items));
        return $response->withHeader('Content-Type', \App\Http\Http::CONTENT_TYPE_JSON);
    }
    /**
     * GET /api/events/stream — SSE básico con estado inicial
     */
    public function eventsStream(Request $request, Response $response): Response
    {
        $response = $response
            ->withHeader('Content-Type', 'text/event-stream')
            ->withHeader('Cache-Control', 'no-cache')
            ->withHeader('Connection', 'keep-alive');

        $payload = [
            'type' => 'state',
            'payload' => [
                'phase' => 'idle',
                'current_turn' => 0,
                'additional_points' => 0,
                'correct_answer_shown' => false,
                'turn_duration_seconds' => (int)($_ENV['TURN_DURATION_SECONDS'] ?? 90),
                'active_question' => null,
                'turn_end_at' => null,
            ],
        ];

        $stream = "event: state\n" . 'data: ' . json_encode($payload['payload']) . "\n\n";
        $response->getBody()->write($stream);
        return $response;
    }

    /**
     * PATCH /api/players/{id} — renombrar equipo
     */
    public function renamePlayer(Request $request, Response $response, array $args): Response
    {
        $id = isset($args['id']) ? (int)$args['id'] : 0;
        if ($id <= 0) {
            $response->getBody()->write(json_encode(['ok' => false, 'reason' => 'bad-id']));
            return $response->withStatus(400)->withHeader('Content-Type', \App\Http\Http::CONTENT_TYPE_JSON);
        }

        $parsed = $request->getParsedBody();
        $name = is_array($parsed) ? trim((string)($parsed['name'] ?? '')) : '';
        if ($name === '') {
            $response->getBody()->write(json_encode(['ok' => false, 'reason' => 'bad-name']));
            return $response->withStatus(400)->withHeader('Content-Type', \App\Http\Http::CONTENT_TYPE_JSON);
        }

        $db = new Database(
            $_ENV['DB_HOST'] ?? 'localhost',
            (int)($_ENV['DB_PORT'] ?? 3306),
            $_ENV['DB_DATABASE'] ?? 'colourbrain',
            $_ENV['DB_USERNAME'] ?? 'root',
            $_ENV['DB_PASSWORD'] ?? ''
        );
        $players = new PlayerRepository($db);
        $players->updateName($id, $name);

        // Return updated list (simple contract) so UIs puedan refrescar
        $rows = $players->findAll();
        $payload = array_map(function(array $r){
            return ['id' => (int)$r['id'], 'name' => $r['name'], 'points' => (int)$r['points']];
        }, $rows);
        $response->getBody()->write(json_encode(['ok' => true, 'players' => $payload]));
        return $response->withHeader('Content-Type', \App\Http\Http::CONTENT_TYPE_JSON);
    }
}



