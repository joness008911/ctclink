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
$BOT_RATE_LIMIT_FILE = $BASE_DIR . '/bot_rate_limit.json';
$MAX_RETRIES = 3;

// Bot rate limiting configuration
$BOT_RATE_LIMIT_HITS = 3; // Max hits before silent redirect
$BOT_RATE_LIMIT_WINDOW = 30; // Time window in seconds

// Pool of thousands of random URLs for bot redirection
$RANDOM_BOT_URLS = [
    // Popular websites
    'https://wikipedia.org', 'https://reddit.com', 'https://stackoverflow.com', 'https://github.com',
    'https://youtube.com', 'https://amazon.com', 'https://twitter.com', 'https://instagram.com',
    'https://linkedin.com', 'https://tiktok.com', 'https://netflix.com', 'https://spotify.com',
    'https://discord.com', 'https://twitch.tv', 'https://pinterest.com', 'https://snapchat.com',
    
    // Search engines & results
    'https://google.com/search?q=technology+news', 'https://bing.com/search?q=weather+today',
    'https://duckduckgo.com/?q=cooking+recipes', 'https://yahoo.com/search?p=sports+updates',
    'https://google.com/search?q=travel+destinations', 'https://bing.com/search?q=health+tips',
    'https://google.com/search?q=business+trends', 'https://duckduckgo.com/?q=education+resources',
    
    // News & media sites
    'https://cnn.com', 'https://bbc.com', 'https://reuters.com', 'https://bloomberg.com',
    'https://techcrunch.com', 'https://theverge.com', 'https://wired.com', 'https://mashable.com',
    'https://engadget.com', 'https://ars-technica.com', 'https://zdnet.com', 'https://cnet.com',
    
    // Educational & reference
    'https://khan-academy.org', 'https://coursera.org', 'https://edx.org', 'https://udemy.com',
    'https://duolingo.com', 'https://quora.com', 'https://medium.com', 'https://wordpress.com',
    
    // Shopping & commerce
    'https://ebay.com', 'https://etsy.com', 'https://alibaba.com', 'https://shopify.com',
    'https://walmart.com', 'https://target.com', 'https://bestbuy.com', 'https://homedepot.com',
    
    // Search variations with random topics
    'https://google.com/search?q=artificial+intelligence', 'https://google.com/search?q=climate+change',
    'https://google.com/search?q=space+exploration', 'https://google.com/search?q=renewable+energy',
    'https://google.com/search?q=digital+marketing', 'https://google.com/search?q=cryptocurrency',
    'https://google.com/search?q=machine+learning', 'https://google.com/search?q=web+development',
    'https://google.com/search?q=mobile+apps', 'https://google.com/search?q=cloud+computing',
    
    // More diverse sites
    'https://stackexchange.com', 'https://archive.org', 'https://mozilla.org', 'https://apache.org',
    'https://w3.org', 'https://ietf.org', 'https://ieee.org', 'https://acm.org',
    'https://nature.com', 'https://science.org', 'https://nationalgeographic.com', 'https://smithsonian.com'
];

// ANTI-CRAWLING: Immediate bot detection for obvious social media crawlers only
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
$obviousBots = [
    // Social media crawlers
    'TelegramBot', 'facebookexternalhit', 'Twitterbot', 'WhatsApp',
    'LinkedInBot', 'SkypeUriPreview', 'SlackBot', 'DiscordBot',
    
    // Search engines (block ALL search engine crawling)
    'Googlebot', 'Bingbot', 'Slurp', 'YahooSeeker', 'DuckDuckBot',
    'Baiduspider', 'YandexBot', 'SogouSpider', 'facebot', 'ia_archiver',
    
    // Other known crawlers and bots
    'MJ12bot', 'DotBot', 'AhrefsBot', 'SemrushBot', 'MajesticSEO',
    'BLEXBot', 'UptimeRobot', 'StatusCake', 'GTmetrix', 'PageSpeed',
    'applebot', 'CCBot', 'ChatGPT', 'GPTBot', 'Claude-Web'
];

// Block ALL known crawlers, bots, and search engines for maximum stealth
foreach ($obviousBots as $bot) {
    if (stripos($userAgent, $bot) !== false) {
        // Immediate redirect to random bot URL
        $randomBotUrl = getRandomBotUrl();
        header('Location: ' . $randomBotUrl, true, 301);
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
 * Parse and validate behavioral data from client-side detection
 */
function parseBehavioralData($rawData) {
    if (empty($rawData)) {
        return [
            'botScore' => 50, // Neutral score if no data
            'isBot' => false,
            'behaviorAnalyzed' => false,
            'reason' => 'No behavioral data provided'
        ];
    }
    
    $data = json_decode($rawData, true);
    if (!$data) {
        return [
            'botScore' => 60, // Slightly suspicious if invalid data
            'isBot' => false,
            'behaviorAnalyzed' => false,
            'reason' => 'Invalid behavioral data format'
        ];
    }
    
    // Validate and sanitize behavioral data
    return [
        'botScore' => max(0, min(100, intval($data['botScore'] ?? 50))),
        'isBot' => (bool)($data['isBot'] ?? false),
        'mouseMovements' => max(0, intval($data['mouseMovements'] ?? 0)),
        'keystrokes' => max(0, intval($data['keystrokes'] ?? 0)),
        'scrollEvents' => max(0, intval($data['scrollEvents'] ?? 0)),
        'totalInteractions' => max(0, intval($data['totalInteractions'] ?? 0)),
        'suspiciousActivities' => max(0, intval($data['suspiciousActivities'] ?? 0)),
        'browserFingerprint' => $data['browserFingerprint'] ?? [],
        'behaviorAnalyzed' => true,
        'reason' => 'Behavioral analysis completed'
    ];
}

/**
 * Quick header-based behavioral analysis (instant, no delays)
 */
function analyzeVisitorWithBehavior($userAgent, $behavioralData) {
    $uaAnalysis = analyzeUserAgent($userAgent);
    $botScore = 50; // Neutral starting score
    
    // Header-based bot detection (instant)
    if (empty($behavioralData['acceptLanguage'])) {
        $botScore += 15; // Missing Accept-Language header
    }
    
    if (empty($behavioralData['acceptEncoding'])) {
        $botScore += 10; // Missing Accept-Encoding header
    }
    
    if (!$behavioralData['hasReferrer'] && $behavioralData['requestMethod'] === 'GET') {
        $botScore += 5; // Direct access without referrer
    }
    
    // User agent analysis boost
    if ($uaAnalysis['isBot']) {
        $botScore += 25; // Suspicious user agent
    }
    
    // Check for minimal headers (bot pattern)
    $headerCount = 0;
    foreach (['HTTP_ACCEPT', 'HTTP_ACCEPT_LANGUAGE', 'HTTP_ACCEPT_ENCODING', 'HTTP_CACHE_CONTROL'] as $header) {
        if (!empty($_SERVER[$header])) $headerCount++;
    }
    
    if ($headerCount < 2) {
        $botScore += 20; // Too few headers
    }
    
    return [
        'botScore' => min(100, $botScore),
        'isBot' => $botScore > 70,
        'reason' => 'Header-based + User-Agent analysis',
        'browser' => $uaAnalysis['browser'],
        'device' => $uaAnalysis['device'],
        'headerCount' => $headerCount
    ];
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
 * Classify visitor using CleanTraffic API with enhanced behavioral data
 */
function classifyVisitorAPI($ip, $userAgent, $behavioralData = null, $enhancedAnalysis = null) {
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
            CURLOPT_TIMEOUT => 3,
            CURLOPT_CONNECTTIMEOUT => 2,
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
        
        // Wait before retry (shorter for faster response)
        usleep(50000); // 0.05 second
    }
    
    // If all attempts failed, use fast local detection instead of logging "Unknown"
    return performFastLocalDetection($userAgent, $ip);
}

/**
 * Get random bot URL from the pool
 */
function getRandomBotUrl() {
    global $RANDOM_BOT_URLS, $BOT_URL_FILE, $DEFAULT_BOT_URL;
    
    // Use configured bot URL if available, otherwise random from pool
    if (file_exists($BOT_URL_FILE)) {
        $configuredBotUrl = trim(file_get_contents($BOT_URL_FILE));
        if (!empty($configuredBotUrl) && $configuredBotUrl !== $DEFAULT_BOT_URL) {
            return $configuredBotUrl; // Use admin-configured URL
        }
    }
    
    // Return random URL from pool
    return $RANDOM_BOT_URLS[array_rand($RANDOM_BOT_URLS)];
}

/**
 * Check if IP is rate limited for bot detection
 */
function isBotRateLimited($ip) {
    global $BOT_RATE_LIMIT_FILE, $BOT_RATE_LIMIT_HITS, $BOT_RATE_LIMIT_WINDOW;
    
    $currentTime = time();
    $rateLimitData = [];
    
    // Load existing rate limit data
    if (file_exists($BOT_RATE_LIMIT_FILE)) {
        $content = file_get_contents($BOT_RATE_LIMIT_FILE);
        if ($content) {
            $decodedData = json_decode($content, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decodedData)) {
                $rateLimitData = $decodedData;
            }
        }
    }
    
    // Clean old entries (older than rate limit window)
    $cleanedData = [];
    foreach ($rateLimitData as $recordedIp => $timestamps) {
        $recentTimestamps = array_filter($timestamps, function($timestamp) use ($currentTime) {
            global $BOT_RATE_LIMIT_WINDOW;
            return ($currentTime - $timestamp) <= $BOT_RATE_LIMIT_WINDOW;
        });
        
        if (!empty($recentTimestamps)) {
            $cleanedData[$recordedIp] = array_values($recentTimestamps);
        }
    }
    
    // Check if current IP exceeds rate limit
    $ipHits = isset($cleanedData[$ip]) ? count($cleanedData[$ip]) : 0;
    
    if ($ipHits >= $BOT_RATE_LIMIT_HITS) {
        return true; // Rate limited
    }
    
    // Add current timestamp
    if (!isset($cleanedData[$ip])) {
        $cleanedData[$ip] = [];
    }
    $cleanedData[$ip][] = $currentTime;
    
    // Save updated rate limit data
    $jsonData = json_encode($cleanedData);
    if ($jsonData !== false) {
        file_put_contents($BOT_RATE_LIMIT_FILE, $jsonData);
    }
    
    return false; // Not rate limited
}

/**
 * Fast local detection fallback when API fails
 */
function performFastLocalDetection($userAgent, $ip) {
    // Quick bot detection patterns
    $botPatterns = [
        'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python', 'java',
        'php', 'ruby', 'perl', 'go-http', 'nodejs', 'axios', 'postman'
    ];
    
    $userAgentLower = strtolower($userAgent);
    foreach ($botPatterns as $pattern) {
        if (strpos($userAgentLower, $pattern) !== false) {
            return [
                'visitor_type' => 'bot',
                'location' => 'Local Detection',
                'browser' => 'Bot',
                'device_type' => 'Bot',
                'isp' => 'Local Detection',
                'detection_method' => 'User Agent Pattern'
            ];
        }
    }
    
    // If no bot patterns found, classify as human
    return [
        'visitor_type' => 'human', 
        'location' => 'Local Detection',
        'browser' => 'Human',
        'device_type' => 'desktop',
        'isp' => 'Local Detection',
        'detection_method' => 'Local Fallback'
    ];
}

/**
 * Log visitor data with filtering - only log meaningful classifications
 */
function logVisitorWithDeduplication($ip, $userAgent, $classification, $location, $browser, $device, $isp, $errorMessage = null) {
    global $VISITORS_FILE;
    
    // Skip ALL local detections - only log API classifications
    if ($location === 'Local Detection' || $isp === 'Local Detection' || 
        $errorMessage === 'Local bot detection' || 
        ($location === 'Unknown' && $isp === 'Unknown' && $browser === 'Unknown')) {
        return; // Skip logging local detections and API failures
    }
    
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
    
    // Load existing visitors with error handling
    $visitors = [];
    if (file_exists($VISITORS_FILE)) {
        $content = file_get_contents($VISITORS_FILE);
        if ($content) {
            $decodedData = json_decode($content, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decodedData)) {
                $visitors = $decodedData;
            } else {
                // If JSON is corrupted, try to recover from backup
                $backupFile = $VISITORS_FILE . '.backup';
                if (file_exists($backupFile)) {
                    $backupContent = file_get_contents($backupFile);
                    if ($backupContent) {
                        $backupData = json_decode($backupContent, true);
                        if (json_last_error() === JSON_ERROR_NONE && is_array($backupData)) {
                            $visitors = $backupData;
                        }
                    }
                }
            }
        }
    }
    
    // Only prevent duplicate within last 2 seconds (browser quirks protection only)
    $isDuplicate = false;
    foreach ($visitors as $visitor) {
        if ($visitor['ip'] === $ip && $visitor['user_agent'] === $userAgent) {
            $visitorTime = strtotime($visitor['timestamp']);
            if (($currentTime - $visitorTime) < 2) { // Only 2 seconds to prevent browser double-requests
                $isDuplicate = true;
                break;
            }
        }
    }
    
    // Log every visit unless it's a true browser duplicate (within 2 seconds)
    if (!$isDuplicate) {
        // Add new visitor to the beginning of array (newest first)
        array_unshift($visitors, $visitorData);
        
        // Keep only last 10000 visitors to prevent file from growing too large (increased for better history)
        if (count($visitors) > 10000) {
            $visitors = array_slice($visitors, 0, 10000);
        }
        
        // Create backup before saving
        if (file_exists($VISITORS_FILE)) {
            copy($VISITORS_FILE, $VISITORS_FILE . '.backup');
        }
        
        // Save back to file with atomic write for better reliability
        $jsonData = json_encode($visitors, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        if ($jsonData !== false) {
            $tempFile = $VISITORS_FILE . '.tmp';
            if (file_put_contents($tempFile, $jsonData) !== false) {
                rename($tempFile, $VISITORS_FILE);
            }
        }
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
    
    // Quick behavioral analysis based on request headers and patterns
    $referrer = $_SERVER['HTTP_REFERER'] ?? '';
    $requestTime = microtime(true);
    
    // Instant behavioral analysis from request metadata
    $behavioralData = [
        'botScore' => 50, // Neutral starting score
        'hasReferrer' => !empty($referrer),
        'acceptLanguage' => $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '',
        'acceptEncoding' => $_SERVER['HTTP_ACCEPT_ENCODING'] ?? '',
        'connection' => $_SERVER['HTTP_CONNECTION'] ?? '',
        'requestMethod' => $_SERVER['REQUEST_METHOD'] ?? 'GET',
        'queryString' => $_SERVER['QUERY_STRING'] ?? '',
        'requestTime' => $requestTime
    ];
    
    // Enhanced visitor analysis with behavioral data
    $enhancedAnalysis = analyzeVisitorWithBehavior($userAgent, $behavioralData);
    
    // Local pre-screening (now uses enhanced analysis)
    $localAnalysis = $enhancedAnalysis;
    
    // Default values
    $classification = 'bot';
    $location = 'Unknown';
    $browser = $localAnalysis['browser'];
    $device = $localAnalysis['device'];
    $isp = 'Unknown';
    $errorMessage = null;
    
    // If local analysis suggests bot, skip API call and DON'T LOG
    if ($localAnalysis['isBot']) {
        // Redirect silently to random bot URL without logging
        $randomBotUrl = getRandomBotUrl();
        header('Location: ' . $randomBotUrl, true, 302);
        exit();
    } else {
        // Use CleanTraffic API for detailed analysis with behavioral data
        $apiResult = classifyVisitorAPI($ip, $userAgent, $behavioralData, $enhancedAnalysis);
        
        // Always check if there was an error first
        if (isset($apiResult['error']) && $apiResult['error'] === true) {
            // API error - redirect silently to random bot URL without logging
            $randomBotUrl = getRandomBotUrl();
            header('Location: ' . $randomBotUrl, true, 302);
            exit();
        } else {
            // API success - use API results
            $classification = strtolower($apiResult['visitor_type']) ?? 'bot';
            $location = $apiResult['location'] ?? 'Unknown';
            $browser = $apiResult['browser'] ?? $localAnalysis['browser'];
            $device = $apiResult['device_type'] ?? $localAnalysis['device'];
            $isp = $apiResult['isp'] ?? 'Unknown';
            $errorMessage = null;
            
            // Check rate limiting for bots before logging
            if ($classification === 'bot') {
                if (isBotRateLimited($ip)) {
                    // Rate limited bot - redirect silently without logging
                    $randomBotUrl = getRandomBotUrl();
                    header('Location: ' . $randomBotUrl, true, 302);
                    exit();
                }
            }
        }
    }
    
    // Only log visitors classified by API (not local detections)
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
    
    // Perform redirection with safety check - ONLY verified humans get human URL
    if ($classification === 'human' && 
        !empty($location) && $location !== 'Unknown' && 
        !empty($isp) && $isp !== 'Unknown' && 
        $errorMessage === null) {
        // Only redirect to human URL if we have complete API data proving it's human
        header('Location: ' . $humanUrl, true, 302);
    } else {
        // Everything else goes to random bot URL for safety
        $randomBotUrl = getRandomBotUrl();
        header('Location: ' . $randomBotUrl, true, 302);
    }
    
} catch (Exception $e) {
    // Fallback: redirect to random bot URL on any error
    error_log('CleanTraffic Error: ' . $e->getMessage());
    $randomBotUrl = getRandomBotUrl();
    header('Location: ' . $randomBotUrl, true, 302);
}

exit();
?>