<?php
/**
 * CleanTraffic 404 Error Handler
 * Handles clean campaign URLs on aaPanel/Nginx hosting
 * When Nginx can't find a file, it triggers this 404 handler
 */

// Get the requested URI
$requestUri = $_SERVER['REQUEST_URI'];
$path = parse_url($requestUri, PHP_URL_PATH);
$path = trim($path, '/');

// Remove any base directory if installed in subdirectory
$scriptDir = dirname($_SERVER['SCRIPT_NAME']);
if ($scriptDir !== '/') {
    $scriptDir = trim($scriptDir, '/');
    if (strpos($path, $scriptDir) === 0) {
        $path = substr($path, strlen($scriptDir));
        $path = ltrim($path, '/');
    }
}

// Check if this looks like a clean campaign URL (5-12 alphanumeric chars)
if (preg_match('/^[A-Za-z0-9]{5,12}$/', $path)) {
    // This is a clean campaign URL - route to r.php
    $_GET['id'] = $path;
    
    // Include r.php which will handle the campaign logic
    include __DIR__ . '/r.php';
    exit;
}

// If it doesn't match a campaign URL pattern, show actual 404 error
http_response_code(404);
?>
<!DOCTYPE html>
<html>
<head>
    <title>Page Not Found</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .error { color: #666; }
    </style>
</head>
<body>
    <h1>404 - Page Not Found</h1>
    <p class="error">The requested page could not be found.</p>
</body>
</html>