<?php
// ==========================================================================
// delete_outfit.php — BACKEND DATA PURGE PROCESSOR
// ==========================================================================
session_start();
error_reporting(E_ALL);
ini_set('display_errors', 0); // Never let PHP error HTML bleed into JSON responses
header('Content-Type: application/json');

if (!file_exists('db_connect.php')) {
    echo json_encode(["success" => false, "message" => "db_connect.php not found"]);
    exit;
}

ob_start(); // Buffer any accidental output from db_connect.php (warnings, notices)
include 'db_connect.php';
ob_end_clean(); // Discard it — only our json_encode output should reach the client

if (!isset($conn) || $conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit;
}

// Ensure the user is authenticated before dropping records
if (!isset($_SESSION['user_id'])) {
    echo json_encode(["success" => false, "message" => "Unauthorized access"]);
    exit;
}

if (!isset($_POST['outfit_id'])) {
    echo json_encode(["success" => false, "message" => "Missing outfit parameters"]);
    exit;
}

$user_id   = $_SESSION['user_id'];
$outfit_id = intval($_POST['outfit_id']);

// Securely target the precise outfit ID while locking it down to the active session owner
$query = "DELETE FROM saved_outfits WHERE id = ? AND user_id = ?";
$stmt  = $conn->prepare($query);
$stmt->bind_param("ii", $outfit_id, $user_id);

if ($stmt->execute()) {
    if ($stmt->affected_rows > 0) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["success" => false, "message" => "Outfit profile not found or access denied."]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Database level fault during execution."]);
}

$stmt->close();
$conn->close();
?>