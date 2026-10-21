<?php
/**
 * Portfolio CMS API — one file, no dependencies (PHP 8.1+).
 *
 * Called as /api/index.php?r=<route>:
 *   GET  /api/content   public: the saved site content ({} = use the built-in defaults)
 *   PUT  /api/content   save content                     (signed in)
 *   POST /api/upload    upload one image / video         (signed in)
 *   POST /api/login · POST /api/logout · GET /api/me
 *   GET  /api/setup · POST /api/setup   one-time password setup, used by `npm run deploy`
 *
 * Private data (password hash, content, backups, sessions) lives in `cms-data/`, one level ABOVE
 * the public web folder, so it can never be downloaded. Uploads go to the public `uploads/` folder.
 */
declare(strict_types=1);

ini_set('display_errors', '0');
const SESSION_HOURS = 12;
const MAX_ATTEMPTS = 8;          // failed sign-ins per IP …
const ATTEMPT_WINDOW = 15 * 60;  // … per 15 minutes
const MAX_CONTENT_BYTES = 2_000_000;
const KEEP_BACKUPS = 10;
const SECTIONS = ['site', 'contact', 'work', 'about', 'skills', 'showreel', 'footer', 'projects'];
const MEDIA_KEYS = ['src', 'cover', 'teaser', 'hero', 'poster'];
const UPLOAD_TYPES = [
    'image/jpeg' => '.jpg', 'image/png' => '.png', 'image/webp' => '.webp', 'image/avif' => '.avif', 'image/gif' => '.gif',
    'video/mp4' => '.mp4', 'video/webm' => '.webm', 'video/quicktime' => '.mov',
];

$WEBROOT = dirname(__DIR__);
$DATA = getenv('CMS_DATA_DIR') ?: dirname($WEBROOT) . '/cms-data';
$UPLOADS = $WEBROOT . '/uploads';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

set_exception_handler(function (Throwable $e) {
    error_log('[cms] ' . $e->getMessage());
    fail(500, 'Something went wrong on the server');
});

function respond(int $status, array|string $body): never
{
    http_response_code($status);
    echo is_string($body) ? $body : json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(int $status, string $message): never
{
    respond($status, ['error' => $message]);
}

function ensure_dir(string $dir): void
{
    if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) throw new RuntimeException("Cannot create $dir");
}

/** Private data folder: owner-only permissions, plus a deny-all rule in case it ever sits inside a web folder. */
function ensure_data_dir(string $dir): void
{
    ensure_dir($dir);
    if (!is_file("$dir/.htaccess")) {
        file_put_contents("$dir/.htaccess", "Require all denied\n");
        chmod("$dir/.htaccess", 0644);
    }
}

/** Atomic write: temp file + rename, so a crash never leaves half a file. */
function write_file(string $path, string $data): void
{
    $tmp = $path . '.tmp' . bin2hex(random_bytes(4));
    if (file_put_contents($tmp, $data, LOCK_EX) === false || !rename($tmp, $path)) throw new RuntimeException("Cannot write $path");
    chmod($path, 0600);
}

function read_json(string $path): ?array
{
    if (!is_file($path)) return null;
    $data = json_decode((string) file_get_contents($path), true);
    return is_array($data) ? $data : null;
}

function json_body(): array
{
    $raw = file_get_contents('php://input', false, null, 0, MAX_CONTENT_BYTES + 1);
    if ($raw === false || strlen($raw) > MAX_CONTENT_BYTES) fail(413, 'Content is too large');
    $data = json_decode($raw, true);
    if (!is_array($data)) fail(400, 'Invalid JSON');
    return $data;
}

/* ───────── request guards ───────── */

function is_https(): bool
{
    return ($_SERVER['HTTPS'] ?? '') === 'on' || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
}

/** Mutating requests must come from this site: custom header + matching Origin (blocks CSRF). */
function same_origin(): void
{
    if (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'cms') fail(403, 'Missing header');
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && parse_url($origin, PHP_URL_HOST) . (parse_url($origin, PHP_URL_PORT) ? ':' . parse_url($origin, PHP_URL_PORT) : '') !== ($_SERVER['HTTP_HOST'] ?? '')) {
        fail(403, 'Bad origin');
    }
}

/* ───────── sessions ───────── */

function start_session(string $dataDir): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    ensure_dir("$dataDir/sessions"); // own folder, not the shared /tmp of a shared host
    session_save_path("$dataDir/sessions");
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.gc_maxlifetime', (string) (SESSION_HOURS * 3600));
    session_name('lr_cms');
    session_set_cookie_params([
        'lifetime' => SESSION_HOURS * 3600,
        'path' => '/',
        'secure' => is_https(),
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}

function signed_in_user(string $dataDir): ?string
{
    if (!isset($_COOKIE['lr_cms'])) return null;
    start_session($dataDir);
    $ok = isset($_SESSION['user'], $_SESSION['exp']) && $_SESSION['exp'] > time();
    return $ok ? $_SESSION['user'] : null;
}

function require_user(string $dataDir): string
{
    return signed_in_user($dataDir) ?? fail(401, 'Not signed in');
}

/* ───────── login rate limit ───────── */

function attempts(string $dataDir, string $ip, bool $record = false, bool $clear = false): int
{
    $file = "$dataDir/attempts.json";
    $fh = fopen($file, 'c+');
    chmod($file, 0600);
    flock($fh, LOCK_EX);
    $all = json_decode(stream_get_contents($fh) ?: '{}', true) ?: [];
    $key = hash('sha256', $ip);
    $now = time();
    foreach ($all as $k => $list) {
        $all[$k] = array_values(array_filter($list, fn($t) => $now - $t < ATTEMPT_WINDOW));
        if (!$all[$k]) unset($all[$k]);
    }
    if ($record) $all[$key][] = $now;
    if ($clear) unset($all[$key]);
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, json_encode($all));
    flock($fh, LOCK_UN);
    fclose($fh);
    return count($all[$key] ?? []);
}

/* ───────── content validation ───────── */

function safe_media(string $url): bool
{
    return $url === '' || (bool) preg_match('#^/(uploads|media)/[A-Za-z0-9._/-]+$#', $url) && !str_contains($url, '..');
}

/** Walk the content and reject anything that could inject script or point somewhere unexpected. */
function validate_content(array $c): ?string
{
    foreach (array_keys($c) as $key) if (!in_array($key, SECTIONS, true)) return "Unknown section \"$key\"";

    $error = null;
    $walk = function ($value, string $key) use (&$walk, &$error) {
        if ($error) return;
        if (is_array($value)) {
            foreach ($value as $k => $v) $walk($v, (string) $k);
        } elseif (is_string($value)) {
            if (strlen($value) > 20000) $error = 'A text is too long';
            elseif (in_array($key, MEDIA_KEYS, true) && !safe_media($value)) $error = "Invalid file path \"$value\"";
            elseif ($key === 'href' && !preg_match('#^https://[^\s"<>]+$#i', $value)) $error = 'Links must start with https://';
        } elseif (!is_int($value) && !is_float($value) && !is_bool($value) && $value !== null) {
            $error = 'Invalid value';
        }
    };
    $walk($c, '');
    if ($error) return $error;

    if (isset($c['projects'])) {
        if (!array_is_list($c['projects'])) return 'projects must be a list';
        $slugs = [];
        foreach ($c['projects'] as $p) {
            $slug = $p['slug'] ?? null;
            if (!is_string($slug) || !preg_match('/^[a-z0-9-]{1,80}$/', $slug)) return 'Invalid project address "' . (is_string($slug) ? $slug : '') . '"';
            if (isset($slugs[$slug])) return "Two projects use the address \"$slug\"";
            $slugs[$slug] = true;
            if (!is_string($p['title'] ?? null) || trim($p['title']) === '') return 'Every project needs a title';
        }
    }
    return null;
}

/* ───────── uploads ───────── */

function protect_uploads(string $dir): void
{
    ensure_dir($dir);
    @chmod($dir, 0755);
    $htaccess = "$dir/.htaccess";
    if (is_file($htaccess)) return;
    // never execute anything in here, only serve the allowed media types
    file_put_contents($htaccess, implode("\n", [
        'Options -Indexes -ExecCGI',
        '<FilesMatch ".">',
        '  Require all denied',
        '</FilesMatch>',
        '<FilesMatch "(?i)\.(jpe?g|png|webp|avif|gif|mp4|webm|mov)$">',
        '  Require all granted',
        '</FilesMatch>',
        '<IfModule mod_headers.c>',
        '  Header set X-Content-Type-Options "nosniff"',
        '  Header set Content-Security-Policy "default-src \'none\'; sandbox"',
        '</IfModule>',
        '',
    ]));
    chmod($htaccess, 0644);
}

function handle_upload(string $dir): never
{
    $f = $_FILES['file'] ?? null;
    if (!$f || is_array($f['error'])) fail(400, 'No file received');
    if ($f['error'] === UPLOAD_ERR_INI_SIZE || $f['error'] === UPLOAD_ERR_FORM_SIZE) {
        fail(413, 'File is too large for the server (limit ' . ini_get('upload_max_filesize') . ')');
    }
    if ($f['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) fail(400, 'Upload failed');

    // trust the file's actual content, not its name or the browser's claim
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']) ?: '';
    $ext = UPLOAD_TYPES[$mime] ?? fail(415, 'Only images (jpg, png, webp, avif, gif) and videos (mp4, webm, mov) are allowed');

    $base = strtolower(pathinfo((string) $f['name'], PATHINFO_FILENAME));
    $base = trim(substr((string) preg_replace('/[^a-z0-9]+/', '-', $base), 0, 40), '-') ?: 'file';
    $name = $base . '-' . bin2hex(random_bytes(4)) . $ext;

    protect_uploads($dir);
    if (!move_uploaded_file($f['tmp_name'], "$dir/$name")) fail(500, 'Could not store the file');
    chmod("$dir/$name", 0644);
    respond(200, ['url' => "/uploads/$name", 'type' => str_starts_with($mime, 'video/') ? 'video' : 'image']);
}

/* ───────── routing ───────── */

ensure_data_dir($DATA);
// The site calls this file directly (/api/index.php?r=content), so no server rewrite rules are needed.
// Pretty paths (/api/content) still work where the host's rewrite rules allow them.
$route = is_string($_GET['r'] ?? null)
    ? $_GET['r']
    : preg_replace('#^/api/?#', '', (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH));
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'GET') same_origin();

match ("$method $route") {
    'GET content' => respond(200, is_file("$DATA/content.json") ? (string) file_get_contents("$DATA/content.json") : '{}'),

    'GET me' => ($user = signed_in_user($DATA)) ? respond(200, ['username' => $user]) : fail(401, 'Not signed in'),

    'POST login' => (function () use ($DATA): never {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        if (attempts($DATA, $ip) >= MAX_ATTEMPTS) fail(429, 'Too many attempts. Try again in 15 minutes.');
        $auth = read_json("$DATA/auth.json") ?? fail(503, 'The CMS password has not been set up yet');
        $body = json_body();
        $ok = hash_equals((string) $auth['username'], (string) ($body['username'] ?? ''))
            & password_verify((string) ($body['password'] ?? ''), (string) $auth['hash']); // both always evaluated
        if (!$ok) {
            attempts($DATA, $ip, record: true);
            usleep(random_int(200_000, 500_000));
            fail(401, 'Wrong username or password');
        }
        attempts($DATA, $ip, clear: true);
        start_session($DATA);
        session_regenerate_id(true);
        $_SESSION = ['user' => $auth['username'], 'exp' => time() + SESSION_HOURS * 3600];
        respond(200, ['username' => $auth['username']]);
    })(),

    'POST logout' => (function () use ($DATA): never {
        if (isset($_COOKIE['lr_cms'])) {
            start_session($DATA);
            $_SESSION = [];
            session_destroy();
        }
        setcookie('lr_cms', '', ['expires' => 1, 'path' => '/', 'secure' => is_https(), 'httponly' => true, 'samesite' => 'Strict']);
        respond(200, ['ok' => true]);
    })(),

    'PUT content' => (function () use ($DATA): never {
        require_user($DATA);
        $content = json_body();
        if ($error = validate_content($content)) fail(400, $error);
        $file = "$DATA/content.json";
        if (is_file($file)) {
            ensure_dir("$DATA/backups");
            $backup = "$DATA/backups/content-" . gmdate('Y-m-d\THis') . '-' . bin2hex(random_bytes(2)) . '.json';
            copy($file, $backup);
            chmod($backup, 0600);
            $backups = glob("$DATA/backups/content-*.json") ?: [];
            sort($backups);
            foreach (array_slice($backups, 0, max(0, count($backups) - KEEP_BACKUPS)) as $old) unlink($old);
        }
        write_file($file, json_encode($content, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        respond(200, ['ok' => true, 'savedAt' => gmdate('c')]);
    })(),

    'POST upload' => (function () use ($DATA, $UPLOADS): never {
        require_user($DATA);
        handle_upload($UPLOADS);
    })(),

    'GET setup' => respond(200, ['needed' => !is_file("$DATA/auth.json")]),

    // Set the CMS login. Only possible with a one-time code that the deploy script uploads over FTPS
    // (api/.setup-token holds its SHA-256); the code works once and expires after 10 minutes.
    'POST setup' => (function () use ($DATA): never {
        $tokenFile = __DIR__ . '/.setup-token';
        if (!is_file($tokenFile) || time() - filemtime($tokenFile) > 600) fail(404, 'Not found');
        if (!is_https() && !in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true)) fail(403, 'HTTPS required');
        $expected = trim((string) file_get_contents($tokenFile));
        unlink($tokenFile);
        $body = json_body();
        if (!hash_equals($expected, hash('sha256', (string) ($body['token'] ?? '')))) fail(403, 'Invalid setup code');
        $username = (string) ($body['username'] ?? '');
        $password = (string) ($body['password'] ?? '');
        if (!preg_match('/^[A-Za-z0-9._-]{3,64}$/', $username)) fail(400, 'Invalid username');
        if (strlen($password) < 10) fail(400, 'Use at least 10 characters');
        $algo = defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT;
        write_file("$DATA/auth.json", json_encode(['username' => $username, 'hash' => password_hash($password, $algo)]));
        array_map('unlink', glob("$DATA/sessions/sess_*") ?: []); // sign out every existing session
        respond(200, ['ok' => true]);
    })(),

    default => fail(404, 'Not found'),
};
