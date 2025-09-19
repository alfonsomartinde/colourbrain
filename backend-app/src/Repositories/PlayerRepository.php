<?php
declare(strict_types=1);

namespace App\Repositories;

use App\Infrastructure\Database\Database;
use PDO;

class PlayerRepository
{
    private PDO $pdo;

    public function __construct(Database $db)
    {
        $this->pdo = $db->getConnection();
    }

    /**
     * Fetch all players.
     * @return array<int, array{id:int,name:string,points:int}>
     */
    public function findAll(): array
    {
        $stmt = $this->pdo->query('SELECT id, name, points FROM players ORDER BY id ASC');
        return $stmt->fetchAll();
    }

    /**
     * Update a player's name.
     */
    public function updateName(int $id, string $name): void
    {
        $stmt = $this->pdo->prepare('UPDATE players SET name = :name WHERE id = :id');
        $stmt->execute([':name' => $name, ':id' => $id]);
    }

    /**
     * Count all players.
     */
    public function countAll(): int
    {
        $stmt = $this->pdo->query('SELECT COUNT(*) AS c FROM players');
        $row = $stmt->fetch();
        return (int)($row['c'] ?? 0);
    }
}


