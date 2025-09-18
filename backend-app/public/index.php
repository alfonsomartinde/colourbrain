<?php
declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php'; // <-- primero

use Dotenv\Dotenv;
use App\AppKernel;

// Load env
$envPath = dirname(__DIR__);
if (file_exists($envPath . '/.env.local')) {
    Dotenv::createImmutable($envPath, '.env.local')->safeLoad();
} elseif (file_exists($envPath . '/.env')) {
    Dotenv::createImmutable($envPath)->safeLoad();
}

// CORS: Gestionado por el middleware en AppKernel

/** @var \Slim\App $app */
$app = AppKernel::create();
$app->run();



