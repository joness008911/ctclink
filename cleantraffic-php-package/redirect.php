<?php
/**
 * CleanTraffic PHP Protection - Redirect Engine
 * 
 * Advanced visitor classification and redirection system
 * Integrates with CleanTraffic API for accurate bot detection
 * 
 * Features:
 * - Anti-crawling protection
 * - Real-time visitor classification
 * - Automatic redirection based on visitor type
 * - Comprehensive logging
 */

// Start session for potential admin logging
session_start();

// SECURITY: Prevent any preview generation or crawling
header('X-Robots-Tag: noindex, nofollow, nosnippet, noarchive, noimageindex');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Configuration - Dynamic path detection for root OR subfolder installation
$BASE_DIR = dirname($_SERVER['SCRIPT_FILENAME']);
$CLEANTRAFFIC_API_ENDPOINT = 'https://b5c9b90c-2b1a-4515-8f6e-08614985a083-00-1nd7hrl46szbn.worf.replit.dev/api/classify';
$DEFAULT_BOT_URL = 'https://google.com';
$DEFAULT_HUMAN_URL = 'https://example.com';
$VISITORS_FILE = $BASE_DIR . '/visitors.json';
$REDIRECT_URL_FILE = $BASE_DIR . '/redirect_url.txt';
$BOT_URL_FILE = $BASE_DIR . '/bot_url.txt';
$API_KEY_FILE = $BASE_DIR . '/api_key.txt';
$MAX_RETRIES = 3;

// ANTI-CRAWLING: Immediate bot detection for obvious social media crawlers only
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
$obviousBots = [
    'TelegramBot', 'facebookexternalhit', 'Twitterbot', 'WhatsApp',
    'LinkedInBot', 'SkypeUriPreview', 'SlackBot', 'DiscordBot'
    // Note: Removed 'applebot', 'googlebot', etc. as they might match legitimate browsers
];

// Only block obvious social media crawlers, not search engines
foreach ($obviousBots as $bot) {
    if (stripos($userAgent, $bot) !== false) {
        // Immediate redirect for social media crawlers
        header('Location: ' . $DEFAULT_BOT_URL, true, 301);
        exit();
    }
}

/**
 * Extract visitor's real IP address using multiple fallback methods
 */
function getVisitorIP() {
    $headers = [
        'HTTP_CF_CONNECTING_IP',     // Cloudflare
        'HTTP_X_FORWARDED_FOR',      // Load balancer/proxy
        'HTTP_X_FORWARDED',          // Proxy
        'HTTP_X_CLUSTER_CLIENT_IP',  // Cluster
        'HTTP_CLIENT_IP',            // Proxy
        'HTTP_FORWARDED_FOR',        // Proxy
        'HTTP_FORWARDED',            // Proxy
        'REMOTE_ADDR'                // Direct connection
    ];
    
    foreach ($headers as $header) {
        if (!empty($_SERVER[$header])) {
            $ips = explode(',', $_SERVER[$header]);
            $ip = trim($ips[0]);
            
            // Validate IP address
            if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return $ip;
            }
        }
    }
    
    // Fallback to REMOTE_ADDR even if private
    return $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
}

/**
 * Local bot detection using User-Agent analysis
 */
function analyzeUserAgent($userAgent) {
    $userAgent = strtolower($userAgent);
    
    // Browser detection
    $browser = 'Unknown';
    if (strpos($userAgent, 'chrome') !== false && strpos($userAgent, 'edg') === false) {
        $browser = 'Chrome';
    } elseif (strpos($userAgent, 'firefox') !== false) {
        $browser = 'Firefox';
    } elseif (strpos($userAgent, 'safari') !== false && strpos($userAgent, 'chrome') === false) {
        $browser = 'Safari';
    } elseif (strpos($userAgent, 'edg') !== false) {
        $browser = 'Edge';
    } elseif (strpos($userAgent, 'trident') !== false || strpos($userAgent, 'msie') !== false) {
        $browser = 'Internet Explorer';
    }
    
    // Device type detection
    $device = 'Unknown';
    if (strpos($userAgent, 'mobile') !== false || strpos($userAgent, 'android') !== false || 
        strpos($userAgent, 'iphone') !== false || strpos($userAgent, 'ipad') !== false) {
        $device = 'Mobile';
    } elseif (strpos($userAgent, 'windows') !== false || strpos($userAgent, 'macintosh') !== false || 
             strpos($userAgent, 'linux') !== false) {
        $device = 'Desktop';
    }
    
    // Bot detection logic
    $isBot = ($browser === 'Unknown' || $device === 'Unknown');
    
    return [
        'browser' => $browser,
        'device' => $device,
        'isBot' => $isBot
    ];
}

/**
 * Classify visitor using CleanTraffic API
 */
function classifyVisitorAPI($ip, $userAgent) {
    global $CLEANTRAFFIC_API_ENDPOINT, $API_KEY_FILE, $MAX_RETRIES;
    
    // Check if API key file exists
    if (!file_exists($API_KEY_FILE)) {
        return [
            'error' => true,
            'error_message' => 'API key not configured',
            'visitor_type' => 'bot',
            'location' => 'Unknown',
            'browser' => 'Unknown',
            'device_type' => 'Unknown',
            'isp' => 'Unknown'
        ];
    }
    
    $apiKey = trim(file_get_contents($API_KEY_FILE));
    if (empty($apiKey)) {
        return [
            'error' => true,
            'error_message' => 'API key is empty',
            'visitor_type' => 'bot',
            'location' => 'Unknown',
            'browser' => 'Unknown',
            'device_type' => 'Unknown',
            'isp' => 'Unknown'
        ];
    }
    
    // Build URL with api_key parameter (matching working endpoint format)
    $url = $CLEANTRAFFIC_API_ENDPOINT . '?api_key=' . urlencode($apiKey);
    
    for ($attempt = 1; $attempt <= $MAX_RETRIES; $attempt++) {
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPGET => true,  // Use GET method like working endpoint
            CURLOPT_HTTPHEADER => [
                'User-Agent: ' . $userAgent,  // Pass real visitor user agent
                'Accept: application/json',
                'Cache-Control: no-cache',
                'X-Forwarded-For: ' . $ip,  // Pass visitor IP
                'X-Real-IP: ' . $ip          // Alternative IP header
            ],
            CURLOPT_TIMEOUT => 10,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_MAXREDIRS => 0
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($response !== false && $httpCode === 200) {
            $result = json_decode($response, true);
            if ($result && isset($result['visitor_type'])) {
                return $result;
            }
        }
        
        // Handle specific error codes
        if ($httpCode === 401) {
            return [
                'error' => true,
                'error_message' => 'Invalid or expired API key',
                'visitor_type' => 'bot',
                'location' => 'Unknown',
                'browser' => 'Unknown',
                'device_type' => 'Unknown',
                'isp' => 'Unknown'
            ];
        }
        
        if ($httpCode === 403) {
            return [
                'error' => true,
                'error_message' => 'API key disabled or quota exceeded',
                'visitor_type' => 'bot',
                'location' => 'Unknown',
                'browser' => 'Unknown',
                'device_type' => 'Unknown',
                'isp' => 'Unknown'
            ];
        }
        
        if ($httpCode === 429) {
            return [
                'error' => true,
                'error_message' => 'API key paused or rate limit exceeded',
                'visitor_type' => 'bot',
                'location' => 'Unknown',
                'browser' => 'Unknown',
                'device_type' => 'Unknown',
                'isp' => 'Unknown'
            ];
        }
        
        // If this is the last attempt or a non-retriable error, break
        if ($attempt === $MAX_RETRIES || $httpCode === 401 || $httpCode === 403 || $httpCode === 429) {
            break;
        }
        
        // Wait before retry
        usleep(100000); // 0.1 second
    }
    
    // If all attempts failed, return connection error
    return [
        'error' => true,
        'error_message' => 'API connection failed or timeout',
        'visitor_type' => 'bot',
        'location' => 'Unknown',
        'browser' => 'Unknown',
        'device_type' => 'Unknown',
        'isp' => 'Unknown'
    ];
}

/**
 * Log visitor data
 */
/**
 * Log visitor data with deduplication to prevent multiple entries from same visitor
 */
function logVisitorWithDeduplication($ip, $userAgent, $classification, $location, $browser, $device, $isp, $errorMessage = null) {
    global $VISITORS_FILE;
    
    $currentTime = time();
    $visitorData = [
        'timestamp' => date('Y-m-d H:i:s'),
        'ip' => $ip,
        'user_agent' => $userAgent,
        'classification' => $classification,
        'location' => $location,
        'browser' => $browser,
        'device' => $device,
        'isp' => $isp
    ];
    
    // Add error message if provided
    if ($errorMessage) {
        $visitorData['error'] = $errorMessage;
    }
    
    // Load existing visitors
    $visitors = [];
    if (file_exists($VISITORS_FILE)) {
        $content = file_get_contents($VISITORS_FILE);
        if ($content) {
            $visitors = json_decode($content, true) ?? [];
        }
    }
    
    // Check for duplicate within last 30 seconds only (much shorter window)
    $isDuplicate = false;
    foreach ($visitors as $visitor) {
        if ($visitor['ip'] === $ip && $visitor['user_agent'] === $userAgent) {
            $visitorTime = strtotime($visitor['timestamp']);
            if (($currentTime - $visitorTime) < 30) { // 30 seconds instead of 5 minutes
                $isDuplicate = true;
                break;
            }
        }
    }
    
    // Only log if not a duplicate
    if (!$isDuplicate) {
        $visitors[] = $visitorData;
        
        // Keep only last 1000 visitors to prevent file from growing too large
        if (count($visitors) > 1000) {
            $visitors = array_slice($visitors, -1000);
        }
        
        // Save back to file with atomic write for better reliability
        $tempFile = $VISITORS_FILE . '.tmp';
        file_put_contents($tempFile, json_encode($visitors, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        rename($tempFile, $VISITORS_FILE);
    }
}

/**
 * Get redirect URLs from configuration
 */
function getRedirectUrls() {
    global $DEFAULT_HUMAN_URL, $DEFAULT_BOT_URL, $REDIRECT_URL_FILE, $BOT_URL_FILE;
    
    $humanUrl = $DEFAULT_HUMAN_URL;
    $botUrl = $DEFAULT_BOT_URL;
    
    if (file_exists($REDIRECT_URL_FILE)) {
        $configuredHuman = trim(file_get_contents($REDIRECT_URL_FILE));
        if (!empty($configuredHuman)) {
            $humanUrl = $configuredHuman;
        }
    }
    
    if (file_exists($BOT_URL_FILE)) {
        $configuredBot = trim(file_get_contents($BOT_URL_FILE));
        if (!empty($configuredBot)) {
            $botUrl = $configuredBot;
        }
    }
    
    return [$humanUrl, $botUrl];
}

// Main execution
try {
    // Extract visitor information
    $ip = getVisitorIP();
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
    
    // Local pre-screening
    $localAnalysis = analyzeUserAgent($userAgent);
    
    // Default values
    $classification = 'bot';
    $location = 'Unknown';
    $browser = $localAnalysis['browser'];
    $device = $localAnalysis['device'];
    $isp = 'Unknown';
    $errorMessage = null;
    
    // If local analysis suggests bot, skip API call
    if ($localAnalysis['isBot']) {
        $classification = 'bot';
        $errorMessage = 'Local bot detection';
    } else {
        // Use CleanTraffic API for detailed analysis
        $apiResult = classifyVisitorAPI($ip, $userAgent);
        
        // Always check if there was an error first
        if (isset($apiResult['error']) && $apiResult['error'] === true) {
            // API error - force bot classification
            $classification = 'bot';
            $location = $apiResult['location'] ?? 'Unknown';
            $browser = $apiResult['browser'] ?? $localAnalysis['browser'];
            $device = $apiResult['device_type'] ?? $localAnalysis['device'];
            $isp = $apiResult['isp'] ?? 'Unknown';
            $errorMessage = $apiResult['error_message'];
        } else {
            // API success - use API results
            $classification = strtolower($apiResult['visitor_type']) ?? 'bot';
            $location = $apiResult['location'] ?? 'Unknown';
            $browser = $apiResult['browser'] ?? $localAnalysis['browser'];
            $device = $apiResult['device_type'] ?? $localAnalysis['device'];
            $isp = $apiResult['isp'] ?? 'Unknown';
            $errorMessage = null;
        }
    }
    
    // Always log the visitor (with deduplication and error info if any)
    logVisitorWithDeduplication(
        $ip, 
        $userAgent, 
        $classification, 
        $location, 
        $browser, 
        $device,
        $isp,
        $errorMessage
    );
    
    // Get redirect URLs
    list($humanUrl, $botUrl) = getRedirectUrls();
    
    // Perform redirection
    if ($classification === 'human') {
        header('Location: ' . $humanUrl, true, 302);
    } else {
        header('Location: ' . $botUrl, true, 302);
    }
    
} catch (Exception $e) {
    // Fallback: redirect to bot URL on any error
    error_log('CleanTraffic Error: ' . $e->getMessage());
    list($humanUrl, $botUrl) = getRedirectUrls();
    header('Location: ' . $botUrl, true, 302);
}

exit();
?>