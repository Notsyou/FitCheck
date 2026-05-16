<?php
session_start();
// get_saved_outfits.php — returns the 6 most recent saved outfits for the sidebar

error_reporting(E_ALL);
ini_set('display_errors', 0);
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode([]);
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

    // JOIN closet_items 5 times (one per slot) to pull image paths in a single query
    $sql = "
        SELECT
            so.id,
            so.label,
            so.created_at,
            so.hat_id,         hat.image_path         AS hat_image,
            so.top_id,         top.image_path         AS top_image,
            so.bottom_id,      bot.image_path         AS bottom_image,
            so.accessories_id, acc.image_path         AS accessories_image,
            so.footwear_id,    foot.image_path        AS footwear_image
        FROM saved_outfits so
        LEFT JOIN closet_items hat  ON so.hat_id         = hat.id
        LEFT JOIN closet_items top  ON so.top_id         = top.id
        LEFT JOIN closet_items bot  ON so.bottom_id      = bot.id
        LEFT JOIN closet_items acc  ON so.accessories_id = acc.id
        LEFT JOIN closet_items foot ON so.footwear_id    = foot.id
        WHERE so.user_id = ?
        ORDER BY so.created_at DESC
        LIMIT 6
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $outfits = [];
    while ($row = $result->fetch_assoc()) {
        $outfits[] = $row;
    }

    $stmt->close();
    $conn->close();

    echo json_encode($outfits);

} catch (Exception $e) {
    echo json_encode(["error" => true, "message" => $e->getMessage()]);
}
?>