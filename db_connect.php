<?php
// ==========================================================================
// db_connect.php — CENTRALIZED DATABASE CONNECTION
// Include this file with require_once in every endpoint that needs the DB.
// Never instantiate a separate connection inline elsewhere.
// ==========================================================================

$host    = getenv('DB_HOST') ?: 'db';
$db_user = getenv('DB_USER') ?: 'fitcheck_user';
$db_pass = getenv('DB_PASS') ?: 'fitcheck_pass';
$db_name = getenv('DB_NAME') ?: 'fashion_db';

$conn = new mysqli($host, $db_user, $db_pass, $db_name);

if ($conn->connect_error) {
    // Only output JSON if a Content-Type header hasn't been sent yet.
    // Callers that need a graceful JSON error should check $conn themselves,
    // but this fallback prevents a raw PHP fatal from leaking HTML into the response.
    if (!headers_sent()) {
        header('Content-Type: application/json');
    }
    echo json_encode([
        "success" => false,
        "message" => "Database connection failed: " . $conn->connect_error
    ]);
    exit;
}

// Raise MySQLi errors as exceptions so every endpoint's try/catch handles them uniformly.
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);