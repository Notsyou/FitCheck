<?php
session_start();
// check_session.php
header('Content-Type: application/json');

if (isset($_SESSION['user_id'])) {
    echo json_encode(["isLoggedIn" => true, "user_id" => $_SESSION['user_id']]);
} else {
    echo json_encode(["isLoggedIn" => false]);
}
?>