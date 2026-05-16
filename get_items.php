<?php
session_start();
// get_items.php

error_reporting(E_ALL);
ini_set('display_errors', 0);
header('Content-Type: application/json');

// Return empty array if not logged in
if (!isset($_SESSION['user_id'])) {
    echo json_encode([]);
    exit();
}

$user_id = $_SESSION['user_id'];

$host = getenv('DB_HOST') ?: 'db';
$db_user = getenv('DB_USER') ?: 'fitcheck_user';
$db_pass = getenv('DB_PASS') ?: 'fitcheck_pass';
$db_name = getenv('DB_NAME') ?: 'fashion_db';

try {
    $conn = new mysqli($host, $db_user, $db_pass, $db_name);

    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }

    // Only fetch items belonging to the logged-in user
    $stmt = $conn->prepare("SELECT id, image_path, category_type, piece_type, vibe_genre, created_at FROM closet_items WHERE user_id = ? ORDER BY created_at DESC");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $items = [];
    while ($row = $result->fetch_assoc()) {
        $items[] = $row;
    }

    echo json_encode($items);

    $stmt->close();
    $conn->close();

} catch (Exception $e) {
    echo json_encode(["error" => true, "message" => $e->getMessage()]);
}
?>