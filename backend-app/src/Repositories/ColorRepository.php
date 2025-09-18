<?php
declare(strict_types=1);

namespace App\Repositories;

use App\Infrastructure\Database\Database;
use PDO;

class ColorRepository
{
    private PDO $pdo;

    public function __construct(Database $db)
    {
        $this->pdo = $db->getConnection();
    }

    /**
     * Fetch all colors.
     * @return array<int, array{id:int,name:string,hex_value:string}>
     */
    public function findAll(): array
    {
        $stmt = $this->pdo->query('SELECT id, name, hex_value FROM colors ORDER BY id ASC');
        return $stmt->fetchAll();
    }
}


