<?php
session_start();
// upload_item.php

error_reporting(E_ALL);
ini_set('display_errors', 0);
header('Content-Type: application/json');

// Reject if not logged in
if (!isset($_SESSION['user_id'])) {
    echo json_encode(["success" => false, "message" => "Not logged in. Please sign in first."]);
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

    // Enable mysqli exceptions
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception("Invalid request method.");
    }

    if (!isset($_FILES['clothing_image'])) {
        throw new Exception("Missing 'clothing_image' in POST.");
    }

    $category_type = $_POST['category_type'] ?? 'pieces';
    $piece_type    = $_POST['piece_type']    ?? 'bottom';
    $vibe_genre    = $_POST['vibe_genre']    ?? 'Casual';

    $file = $_FILES['clothing_image'];
    $fileName = time() . '_' . basename($file['name']);

    $targetDir = __DIR__ . "/stored_images/";
    if (!is_dir($targetDir)) {
        mkdir($targetDir, 0777, true);
    }

    $targetFilePath = $targetDir . $fileName;
    $relativePath = "stored_images/" . $fileName;

    if (!move_uploaded_file($file['tmp_name'], $targetFilePath)) {
        throw new Exception("Failed to move uploaded file.");
    }

    $query = "INSERT INTO closet_items (user_id, image_path, category_type, piece_type, vibe_genre) VALUES (?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($query);
    $stmt->bind_param("issss", $user_id, $relativePath, $category_type, $piece_type, $vibe_genre);
    $stmt->execute();
    $stmt->close();

    echo json_encode([
        "success" => true,
        "image_path" => $relativePath,
        "message" => "Successfully saved!"
    ]);

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}

$conn->close();
?>