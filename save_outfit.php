<?php
session_start();
// save_outfit.php — saves a new outfit to the push-down stack

error_reporting(E_ALL);
ini_set('display_errors', 0);
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["success" => false, "message" => "Not logged in."]);
    exit();
}

$user_id = $_SESSION['user_id'];

$host    = getenv('DB_HOST') ?: 'db';
$db_user = getenv('DB_USER') ?: 'fitcheck_user';
$db_pass = getenv('DB_PASS') ?: 'fitcheck_pass';
$db_name = getenv('DB_NAME') ?: 'fashion_db';

try {
    $conn = new mysqli($host, $db_user, $db_pass, $db_name);
    if ($conn->connect_error) {
        throw new Exception("DB connection failed: " . $conn->connect_error);
    }

    $input = json_decode(file_get_contents('php://input'), true);

    // Accept slot IDs (nullable foreign keys) and optional label
    $hat_id         = isset($input['hat_id'])         ? (int)$input['hat_id']         : null;
    $top_id         = isset($input['top_id'])         ? (int)$input['top_id']         : null;
    $bottom_id      = isset($input['bottom_id'])      ? (int)$input['bottom_id']      : null;
    $accessories_id = isset($input['accessories_id']) ? (int)$input['accessories_id'] : null;
    $footwear_id    = isset($input['footwear_id'])    ? (int)$input['footwear_id']    : null;
    $label          = trim($input['label'] ?? 'New Fit');
    if ($label === '') $label = 'New Fit';

    $stmt = $conn->prepare("
        INSERT INTO saved_outfits
            (user_id, hat_id, top_id, bottom_id, accessories_id, footwear_id, label)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");

    // bind: i=int, s=string; nullable ints still use "i" — send null directly
    $stmt->bind_param("iiiiiss",
        $user_id, $hat_id, $top_id, $bottom_id, $accessories_id, $footwear_id, $label
    );
    $stmt->execute();
    $new_id = $stmt->insert_id;
    $stmt->close();
    $conn->close();

    echo json_encode(["success" => true, "outfit_id" => $new_id]);

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>