<?php
/**
 * CleanTraffic API Debug Tool
 * Use this to check what's happening with your API key
 */

session_start();

// Check authentication (optional - remove this block if you want to access without login)
/*
if (!isset($_SESSION['admin_authenticated']) || $_SESSION['admin_authenticated'] !== true) {
    echo "Please login to admin panel first or remove the auth check from this file.<br>";
    echo "<a href='index.html'>Go to Admin Panel</a>";
    exit();
}
*/

header('Content-Type: text/html; charset=utf-8');

$BASE_DIR = dirname($_SERVER['SCRIPT_FILENAME']);
$API_KEY_FILE = $BASE_DIR . '/api_key.txt';

echo "<h2>🔍 CleanTraffic API Key Debug Tool</h2>";

echo "<h3>📁 File Information:</h3>";
echo "<strong>API Key File Path:</strong> " . $API_KEY_FILE . "<br>";
echo "<strong>File Exists:</strong> " . (file_exists($API_KEY_FILE) ? "✅ Yes" : "❌ No") . "<br>";

if (file_exists($API_KEY_FILE)) {
    echo "<strong>File Size:</strong> " . filesize($API_KEY_FILE) . " bytes<br>";
    echo "<strong>Last Modified:</strong> " . date('Y-m-d H:i:s', filemtime($API_KEY_FILE)) . "<br>";
    echo "<strong>File Permissions:</strong> " . substr(sprintf('%o', fileperms($API_KEY_FILE)), -4) . "<br>";
    echo "<strong>Is Readable:</strong> " . (is_readable($API_KEY_FILE) ? "✅ Yes" : "❌ No") . "<br>";
    echo "<strong>Is Writable:</strong> " . (is_writable($API_KEY_FILE) ? "✅ Yes" : "❌ No") . "<br>";
}

echo "<h3>🔑 Current API Key:</h3>";
if (file_exists($API_KEY_FILE)) {
    $currentKey = file_get_contents($API_KEY_FILE);
    $trimmedKey = trim($currentKey);
    
    echo "<strong>Raw Content:</strong> '" . htmlspecialchars($currentKey) . "'<br>";
    echo "<strong>After trim():</strong> '" . htmlspecialchars($trimmedKey) . "'<br>";
    echo "<strong>Length:</strong> " . strlen($trimmedKey) . " characters<br>";
    echo "<strong>First 10 chars:</strong> " . htmlspecialchars(substr($trimmedKey, 0, 10)) . "...<br>";
    echo "<strong>Last 10 chars:</strong> ..." . htmlspecialchars(substr($trimmedKey, -10)) . "<br>";
} else {
    echo "❌ <strong>API key file does not exist!</strong><br>";
}

echo "<h3>📂 Directory Information:</h3>";
echo "<strong>Base Directory:</strong> " . $BASE_DIR . "<br>";
echo "<strong>Directory Writable:</strong> " . (is_writable($BASE_DIR) ? "✅ Yes" : "❌ No") . "<br>";

echo "<h3>📝 Test API Key Update:</h3>";
echo "<form method='post'>";
echo "<input type='text' name='test_key' placeholder='Enter test API key' style='width:300px;'><br><br>";
echo "<button type='submit' name='update_test'>Update API Key (Test)</button>";
echo "</form>";

if (isset($_POST['update_test']) && !empty($_POST['test_key'])) {
    $testKey = trim($_POST['test_key']);
    echo "<h4>🧪 Test Results:</h4>";
    
    // Try to write the test key
    $writeResult = file_put_contents($API_KEY_FILE, $testKey);
    if ($writeResult !== false) {
        echo "✅ <strong>Write successful!</strong> Wrote $writeResult bytes<br>";
        
        // Immediately read it back
        $readBack = trim(file_get_contents($API_KEY_FILE));
        if ($readBack === $testKey) {
            echo "✅ <strong>Read-back successful!</strong> Key matches<br>";
        } else {
            echo "❌ <strong>Read-back failed!</strong> Expected: '$testKey', Got: '$readBack'<br>";
        }
    } else {
        echo "❌ <strong>Write failed!</strong> Check file permissions<br>";
    }
    
    echo "<br><strong>Refresh this page to see updated information</strong><br>";
}

echo "<br><hr>";
echo "<p><strong>🎯 Next Steps:</strong></p>";
echo "<ul>";
echo "<li>If the file doesn't exist, check file permissions</li>";
echo "<li>If write fails, set folder to 755 and files to 644</li>";
echo "<li>If write succeeds but admin panel shows old key, clear browser cache</li>";
echo "<li>Compare the 'First 10 chars' with what you expect to see</li>";
echo "</ul>";

echo "<p><a href='index.html'>← Back to Admin Panel</a></p>";
?>