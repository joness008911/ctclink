<?php
/**
 * CleanTraffic PHP Protection - Configuration Updater
 * Updates system configuration settings
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
$REDIRECT_URL_FILE = $BASE_DIR . '/redirect_url.txt';
$BOT_URL_FILE = $BASE_DIR . '/bot_url.txt';
$API_KEY_FILE = $BASE_DIR . '/api_key.txt';
$PASSWORD_FILE = $BASE_DIR . '/admin_password.txt';

$input = json_decode(file_get_contents('php://input'), true);

try {
    $updated = false;
    
    // Update API key
    if (isset($input['apiKey']) && !empty($input['apiKey'])) {
        file_put_contents($API_KEY_FILE, trim($input['apiKey']));
        $updated = true;
    }
    
    // Update human redirect URL
    if (isset($input['humanUrl']) && !empty($input['humanUrl'])) {
        if (filter_var($input['humanUrl'], FILTER_VALIDATE_URL)) {
            file_put_contents($REDIRECT_URL_FILE, trim($input['humanUrl']));
            $updated = true;
        }
    }
    
    // Update bot redirect URL
    if (isset($input['botUrl']) && !empty($input['botUrl'])) {
        if (filter_var($input['botUrl'], FILTER_VALIDATE_URL)) {
            file_put_contents($BOT_URL_FILE, trim($input['botUrl']));
            $updated = true;
        }
    }
    
    // Update admin password
    if (isset($input['newPassword']) && !empty($input['newPassword'])) {
        $newPassword = trim($input['newPassword']);
        if (strlen($newPassword) >= 6) {
            file_put_contents($PASSWORD_FILE, $newPassword);
            $updated = true;
        }
    }
    
    echo json_encode(['success' => true, 'updated' => $updated]);
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>