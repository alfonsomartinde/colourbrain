<?php
declare(strict_types=1);

namespace App\routes;

use Slim\App;
use App\Controllers\StateController;
use App\Controllers\PresenterController;

final class Routes
{
    public static function register(App $app): void
    {
        $state = new StateController();
        $presenter = new PresenterController();

        $app->get('/api/colors', [$state, 'getColors']);
        $app->get('/api/players', [$state, 'getPlayers']);
        $app->get('/api/state', [$state, 'getState']);
        $app->get('/api/answers/current', [$state, 'getCurrentAnswers']);
        $app->get('/api/reveal/current', [$state, 'getCurrentReveal']);
        $app->get('/api/events/stream', [$state, 'eventsStream']);
        $app->get('/api/history', [$state, 'getHistory']);

        // presenter controls
        $app->post('/api/presenter/start-game', [$presenter, 'startGame']);
        $app->post('/api/presenter/start-turn', [$presenter, 'startTurn']);
        $app->post('/api/presenter/show-correct', [$presenter, 'showCorrect']);

        // players
        $app->patch('/api/players/{id}', [$state, 'renamePlayer']);
        $app->post('/api/player/answer', [$state, 'postPlayerAnswer']);
    }
}


