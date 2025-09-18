<?php
declare(strict_types=1);

namespace App\Repositories;

use App\Infrastructure\Database\Database;
use PDO;

class GameStateRepository
{
    private PDO $pdo;

    public function __construct(Database $db)
    {
        $this->pdo = $db->getConnection();
    }

    /**
     * Ensure a single game_state row (id=1) exists. Returns the row as array.
     * @return array<string,mixed>
     */
    public function getOrCreate(): array
    {
        $stmt = $this->pdo->prepare('SELECT id, current_turn, additional_points, correct_answer_shown, previous_points, phase, turn_end_at FROM game_state WHERE id = 1');
        $stmt->execute();
        $row = $stmt->fetch();
        if ($row) {
            return $row;
        }
        $this->pdo->exec("INSERT INTO game_state (id, current_turn, additional_points, correct_answer_shown, previous_points, phase, turn_end_at) VALUES (1, 0, 0, 0, '{}', 'idle', NULL)");
        $stmt->execute();
        return $stmt->fetch();
    }

    /**
     * Update state fields.
     */
    public function update(array $fields): void
    {
        if (empty($fields)) {
            return;
        }
        $sets = [];
        $params = [];
        foreach ($fields as $k => $v) {
            $sets[] = "$k = :$k";
            $params[":$k"] = $v;
        }
        $sql = 'UPDATE game_state SET ' . implode(', ', $sets) . ' WHERE id = 1';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
    }
}


