<?php
declare(strict_types=1);

namespace App\Repositories;

use App\Infrastructure\Database\Database;
use PDO;

class QuestionRepository
{
    private PDO $pdo;

    public function __construct(Database $db)
    {
        $this->pdo = $db->getConnection();
    }

    /**
     * Returns the question for the given turn id, or null.
     * @return array<string,mixed>|null
     */
    public function findByTurnId(int $turnId): ?array
    {
        $stmt = $this->pdo->prepare('SELECT id, text, correctColorIds, asked, turn_id FROM questions WHERE turn_id = :turn LIMIT 1');
        $stmt->execute([':turn' => $turnId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * Picks a random unasked question.
     * @return array<string,mixed>|null
     */
    public function pickRandomUnasked(): ?array
    {
        $stmt = $this->pdo->query("SELECT id, text, correctColorIds FROM questions WHERE asked = 0 AND turn_id = 0 ORDER BY RAND() LIMIT 1");
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * Returns all asked questions ordered by turn_id ascending.
     * @return array<int,array<string,mixed>>
     */
    public function findAskedInOrder(): array
    {
        $stmt = $this->pdo->query('SELECT id, text, correctColorIds, turn_id FROM questions WHERE asked = 1 AND turn_id > 0 ORDER BY turn_id ASC');
        return $stmt->fetchAll() ?: [];
    }

    /**
     * Marks a question as asked in the given turn.
     */
    public function markAsked(int $questionId, int $turnId): void
    {
        $stmt = $this->pdo->prepare('UPDATE questions SET asked = 1, turn_id = :turn WHERE id = :id');
        $stmt->execute([':turn' => $turnId, ':id' => $questionId]);
    }
}


