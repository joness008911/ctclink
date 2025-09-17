<?php
/**
 * CleanTraffic Random URL Handler
 * This file serves as a generic endpoint for all random redirect URLs
 * It processes the request and forwards to redirect.php for visitor classification
 */

// Get random ID from URL parameter (set by .htaccess rewrite)
$random_id = $_GET['id'] ?? '';

// If no ID from rewrite, extract from path as fallback
if (empty($random_id)) {
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $segments = explode('/', trim($path, '/'));
    $random_id = end($segments);
}

// Validate random ID format (5-12 alphanumeric chars)
if (!preg_match('/^[A-Za-z0-9]{5,12}$/', $random_id)) {
    $random_id = '';
}

// Extract shortcode if present
$shortcode = '';
if (isset($_GET['c'])) {
    $shortcode = $_GET['c'];
}

// Store the random URL ID and shortcode for potential use by redirect.php
if (!empty($random_id)) {
    $_GET['random_url_id'] = $random_id;
}
if (!empty($shortcode)) {
    $_GET['shortcode'] = $shortcode;
}

// Forward to redirect.php with all parameters intact
include_once __DIR__ . '/redirect.php';
?>