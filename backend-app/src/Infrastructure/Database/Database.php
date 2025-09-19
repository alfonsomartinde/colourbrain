<?php
declare(strict_types=1);

namespace App\Infrastructure\Database;

use PDO;
use PDOException;

/**
 * Simple PDO provider with lazy connection.
 */
class Database
{
    private ?PDO $connection = null;

    private string $host;
    private int $port;
    private string $database;
    private string $username;
    private string $password;
    private string $charset = 'utf8mb4';

    public function __construct(
        string $host,
        int $port,
        string $database,
        string $username,
        string $password
    ) {
        $this->host = $host;
        $this->port = $port;
        $this->database = $database;
        $this->username = $username;
        $this->password = $password;
    }

    /**
     * Returns a shared PDO connection.
     */
    public function getConnection(): PDO
    {
        if ($this->connection instanceof PDO) {
            return $this->connection;
        }

        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $this->host, $this->port, $this->database, $this->charset);
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        try {
            $this->connection = new PDO($dsn, $this->username, $this->password, $options);
            // Ensure MySQL session runs in UTC to avoid timezone-induced drifts
            $this->connection->exec("SET time_zone = '+00:00'");
        } catch (PDOException $e) {
            throw $e;
        }
        return $this->connection;
    }
}


