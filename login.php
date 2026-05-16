<?php
session_start();
// login.php

header('Content-Type: text/plain');

$host = getenv('DB_HOST') ?: 'db';
$user = getenv('DB_USER') ?: 'fitcheck_user';
$pass = getenv('DB_PASS') ?: 'fitcheck_pass';
$name = getenv('DB_NAME') ?: 'fashion_db';

$conn = new mysqli($host, $user, $pass, $name);

if ($conn->connect_error) {
    echo "Connection failed";
    exit();
}

$username = $_POST['username'];
$password = $_POST['password'];

$stmt = $conn->prepare("SELECT id, password FROM users WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $row = $result->fetch_assoc();
    if (password_verify($password, $row['password'])) {
        // Store user ID in session on successful login
        $_SESSION['user_id'] = $row['id'];
        echo "success";
    } else {
        echo "Invalid Username or Password";
    }
} else {
    echo "Invalid Username or Password";
}

$stmt->close();
$conn->close();
?>