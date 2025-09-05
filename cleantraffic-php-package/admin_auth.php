<?php
/**
 * CleanTraffic PHP Protection - Authentication Handler
 * Manages admin login/logout functionality
 */

session_start();

header('Content-Type: application/json');
header('X-Robots-Tag: noindex, nofollow');

$PASSWORD_FILE = __DIR__ . '/admin_password.txt';
$DEFAULT_PASSWORD = 'admin123';

/**
 * Get current admin password
 */
function getAdminPassword() {
    global $PASSWORD_FILE, $DEFAULT_PASSWORD;
    
    if (file_exists($PASSWORD_FILE)) {
        $password = trim(file_get_contents($PASSWORD_FILE));
        return !empty($password) ? $password : $DEFAULT_PASSWORD;
    }
    
    return $DEFAULT_PASSWORD;
}

/**
 * Set new admin password
 */
function setAdminPassword($newPassword) {
    global $PASSWORD_FILE;
    
    if (strlen($newPassword) < 6) {
        return false;
    }
    
    return file_put_contents($PASSWORD_FILE, $newPassword) !== false;
}

// Handle different actions
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

switch ($action) {
    case 'login':
        $password = $input['password'] ?? '';
        $correctPassword = getAdminPassword();
        
        if ($password === $correctPassword) {
            $_SESSION['admin_authenticated'] = true;
            $_SESSION['login_time'] = time();
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Invalid password']);
        }
        break;
        
    case 'logout':
        $_SESSION['admin_authenticated'] = false;
        session_destroy();
        echo json_encode(['success' => true]);
        break;
        
    default:
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
        break;
}
?>