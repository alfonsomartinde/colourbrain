<?php
declare(strict_types=1);

namespace App\Repositories;

use App\Infrastructure\Database\Database;
use PDO;

class AnswerRepository
{
    private PDO $pdo;

    public function __construct(Database $db)
    {
        $this->pdo = $db->getConnection();
    }

    /**
     * Returns answers for a given turn id.
     * @return array<int, array{player_id:int,color_ids:string,question_id:int,turn_id:int}>
     */
    public function findByTurn(int $turnId): array
    {
        $stmt = $this->pdo->prepare('SELECT player_id, color_ids, question_id, turn_id FROM answers WHERE turn_id = :turn');
        $stmt->execute([':turn' => $turnId]);
        return $stmt->fetchAll();
    }
}


