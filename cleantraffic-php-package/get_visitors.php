<?php
/**
 * CleanTraffic PHP Protection - Visitor Data Getter
 * Returns visitor analytics data for admin dashboard
 */

session_start();

header('Content-Type: application/json');
header('X-Robots-Tag: noindex, nofollow');

// Check authentication
if (!isset($_SESSION['admin_authenticated']) || $_SESSION['admin_authenticated'] !== true) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit();
}

$BASE_DIR = dirname($_SERVER['SCRIPT_FILENAME']);
$VISITORS_FILE = $BASE_DIR . '/visitors.json';

try {
    $visitors = [];
    
    if (file_exists($VISITORS_FILE)) {
        $content = file_get_contents($VISITORS_FILE);
        if ($content) {
            $visitors = json_decode($content, true) ?? [];
        }
    }
    
    // Sort by timestamp (newest first)
    usort($visitors, function($a, $b) {
        return strtotime($b['timestamp']) - strtotime($a['timestamp']);
    });
    
    echo json_encode(['visitors' => $visitors]);
    
} catch (Exception $e) {
    echo json_encode(['visitors' => [], 'error' => $e->getMessage()]);
}
?>