<?php
// ==========================================================================
// delete_item.php — Deletes a single closet item row AND unlinks its image
// ==========================================================================
session_start();
error_reporting(E_ALL);
ini_set('display_errors', 0);
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["success" => false, "message" => "Unauthorized."]);
    exit;
}

if (!isset($_POST['item_id'])) {
    echo json_encode(["success" => false, "message" => "Missing item_id."]);
    exit;
}

require_once 'db_connect.php';

$user_id = $_SESSION['user_id'];
$item_id = intval($_POST['item_id']);

try {
    // Fetch the image path first so we can unlink after a confirmed delete
    $fetch = $conn->prepare("SELECT image_path FROM closet_items WHERE id = ? AND user_id = ?");
    $fetch->bind_param("ii", $item_id, $user_id);
    $fetch->execute();
    $result = $fetch->get_result();

    if ($result->num_rows === 0) {
        echo json_encode(["success" => false, "message" => "Item not found or access denied."]);
        $fetch->close();
        $conn->close();
        exit;
    }

    $row        = $result->fetch_assoc();
    $imagePath  = $row['image_path']; // e.g. "stored_images/1234_shirt.jpg"
    $fetch->close();

    // Delete the DB row — scoped to user_id so no one can delete another user's items
    $del = $conn->prepare("DELETE FROM closet_items WHERE id = ? AND user_id = ?");
    $del->bind_param("ii", $item_id, $user_id);
    $del->execute();

    if ($del->affected_rows === 0) {
        echo json_encode(["success" => false, "message" => "Delete failed."]);
        $del->close();
        $conn->close();
        exit;
    }
    $del->close();
    $conn->close();

    // Unlink the physical file from the server after the DB row is confirmed gone
    $fullPath = __DIR__ . '/' . $imagePath;
    if ($imagePath && file_exists($fullPath)) {
        unlink($fullPath);
    }

    echo json_encode(["success" => true]);

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}