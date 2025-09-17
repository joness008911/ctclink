<?php
/**
 * CleanTraffic Clean URL Router (PHP-Only Solution)
 * This file handles clean URLs without requiring Nginx/Apache rewrite rules
 * Works on any hosting environment including aaPanel
 */

// Get the requested URL path
$requestUri = $_SERVER['REQUEST_URI'];
$path = parse_url($requestUri, PHP_URL_PATH);
$path = trim($path, '/');

// Handle clean campaign URLs (5-12 alphanumeric characters)
if (preg_match('/^([A-Za-z0-9]{5,12})$/', $path, $matches)) {
    // Clean URL detected - route to r.php with ID parameter
    $_GET['id'] = $matches[1];
    include __DIR__ . '/r.php';
    exit;
}

// Handle admin panel access
if (empty($path) || $path === 'index.html' || $path === 'admin') {
    // Serve the admin panel
    include __DIR__ . '/index.html';
    exit;
}

// Handle direct PHP file access
$allowedFiles = [
    'redirect.php', 'r.php', 'admin_auth.php', 'check_auth.php', 
    'get_config.php', 'update_config.php', 'get_visitors.php', 'test_api.php'
];

if (in_array($path, $allowedFiles) && file_exists(__DIR__ . '/' . $path)) {
    include __DIR__ . '/' . $path;
    exit;
}

// Everything else goes to redirect.php for bot detection
include __DIR__ . '/redirect.php';
?>