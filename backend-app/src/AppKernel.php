<?php
declare(strict_types=1);

namespace App;

use Slim\App;
use Slim\Factory\AppFactory;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface as RequestHandler;
use Psr\Http\Message\ResponseInterface as Response;
use App\routes\Routes;

final class AppKernel
{
    public static function create(): App
    {
        $app = AppFactory::create();
        // Detect and set base path when deployed under a subdirectory (e.g. /obs/colourbrain/backend-app/public)
        $scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
        $basePath = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');
        if ($basePath !== '' && $basePath !== '/') {
            $app->setBasePath($basePath);
        }
        $app->addBodyParsingMiddleware();
        $app->addRoutingMiddleware();

        // Handle preflight (scope to /api only)
        $app->options('/api/{routes:.+}', function ($request, Response $response): Response {
            return $response;
        });

        // Error middleware
        $displayErrorDetails = true;
        $logErrors = true;
        $logErrorDetails = true;
        $app->addErrorMiddleware($displayErrorDetails, $logErrors, $logErrorDetails);

        // Basic CORS middleware (added LAST so it wraps even error responses)
        $app->add(function (Request $request, RequestHandler $handler): Response {
            $response = $handler->handle($request);
            $origin = $request->getHeaderLine('Origin');
            $allowed = array_filter(array_map('trim', explode(',', (string)($_ENV['CORS_ORIGINS'] ?? 'http://localhost:4200,http://localhost:4201,http://localhost:4202'))));
            $allowOrigin = ($origin && in_array($origin, $allowed, true)) ? $origin : '*';
            $resp = $response
                ->withHeader('Access-Control-Allow-Origin', $allowOrigin)
                ->withHeader('Vary', 'Origin')
                ->withHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS')
                ->withHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept,X-Requested-With')
                ->withHeader('Access-Control-Expose-Headers', 'Content-Type');
            if ($allowOrigin !== '*') {
                $resp = $resp->withHeader('Access-Control-Allow-Credentials', 'true');
            }
            return $resp;
        });

        // Register routes
        Routes::register($app);

        return $app;
    }
}


