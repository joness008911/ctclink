<?php
/**
 * CleanTraffic PHP Protection - API Connection Tester
 * Tests connection to CleanTraffic API service
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

// Test IP2Geolocation API directly instead of external service
$BASE_DIR = dirname($_SERVER['SCRIPT_FILENAME']);
$API_KEY_FILE = $BASE_DIR . '/api_key.txt';

try {
    // Check if API key exists
    if (!file_exists($API_KEY_FILE)) {
        echo json_encode(['success' => false, 'error' => 'API key not configured']);
        exit();
    }
    
    $apiKey = trim(file_get_contents($API_KEY_FILE));
    if (empty($apiKey)) {
        echo json_encode(['success' => false, 'error' => 'API key is empty']);
        exit();
    }
    
    // Test IP2Geolocation API directly with Google DNS IP
    $testIP = '8.8.8.8';
    $url = "https://api.ip2location.io/?key={$apiKey}&ip={$testIP}&format=json";
    
    $context = stream_context_create([
        'http' => [
            'timeout' => 10,
            'user_agent' => 'CleanTraffic-APITest/1.0'
        ]
    ]);
    
    $response = @file_get_contents($url, false, $context);
    
    if ($response === false) {
        echo json_encode([
            'success' => false, 
            'error' => 'Failed to connect to IP2Geolocation API. Check your internet connection.'
        ]);
        exit();
    }
    
    $data = json_decode($response, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        echo json_encode([
            'success' => false, 
            'error' => 'Invalid response from IP2Geolocation API'
        ]);
        exit();
    }
    
    // Check for API errors
    if (isset($data['error'])) {
        echo json_encode([
            'success' => false, 
            'error' => 'API Error: ' . ($data['error']['error_message'] ?? 'Invalid API key or quota exceeded')
        ]);
        exit();
    }
    
    // Success - API is working
    echo json_encode([
        'success' => true,
        'message' => 'IP2Geolocation API connection successful!',
        'test_result' => [
            'ip' => $testIP,
            'country' => $data['country_name'] ?? 'Unknown',
            'region' => $data['region_name'] ?? 'Unknown',
            'quota_remaining' => $data['credits_consumed'] ?? 'Unknown'
        ]
    ]);
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => 'Test failed: ' . $e->getMessage()]);
}
?>