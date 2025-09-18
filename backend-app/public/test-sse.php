<?php
// Simple SSE test endpoint for shared hosting compatibility checks
// Sends one event per second for ~20 seconds and then ends.

// Important headers for SSE
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache, no-transform');
header('Connection: keep-alive');
// Intento de desactivar buffer en proxies (Nginx/LS/Cloudflare pueden respetarlo)
header('X-Accel-Buffering: no');

// Try to disable compression and buffering at the PHP level
@ini_set('zlib.output_compression', '0');
@ini_set('output_buffering', '0');

// Ensure no session lock is held by this request
if (function_exists('session_status') && session_status() === PHP_SESSION_ACTIVE) {
	session_write_close();
}

// Flush any existing output buffers
while (function_exists('ob_get_level') && ob_get_level() > 0) {
	@ob_end_flush();
}
@ob_implicit_flush(true);

ignore_user_abort(true);
@set_time_limit(0);

// Optional: tell the browser to retry after 2s if disconnected
echo "retry: 2000\n\n";
flush();

// Padding inicial para atravesar buffers intermedios (2KB aprox)
echo str_repeat(": ", 1024) . "\n\n";
@ob_flush();
flush();

$start = time();
for ($i = 1; $i <= 20; $i++) {
	$uptime = time() - $start;
	$payload = json_encode([
		"tick" => $i,
		"uptimeSeconds" => $uptime,
		"timestamp" => gmdate('c'),
	], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

	// Example of a typed event ("ping"). Clients can listen via addEventListener('ping', ...)
	echo "event: ping\n";
	echo "id: {$i}\n";
	echo "data: {$payload}\n\n";

	// Flush to the client immediately
	@ob_flush();
	flush();

	// If client disconnected, stop early
	if (function_exists('connection_aborted') && connection_aborted()) {
		break;
	}

	// Send a comment line as heartbeat to traverse some proxies
	echo ": heartbeat\n\n";
	@ob_flush();
	flush();

	usleep(1000000); // 1 second
}

// End the stream politely (most clients will just see the connection close)
// No further output after this point
exit;


