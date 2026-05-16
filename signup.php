<?php
session_start();
// signup.php

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

// Check if username already exists
$check = $conn->prepare("SELECT id FROM users WHERE username = ?");
$check->bind_param("s", $username);
$check->execute();
$check->store_result();

if ($check->num_rows > 0) {
    echo "Username already exists";
} else {
    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

    $stmt = $conn->prepare("INSERT INTO users (username, password) VALUES (?, ?)");
    $stmt->bind_param("ss", $username, $hashedPassword);

    if ($stmt->execute()) {
        // Immediately log the new user in by storing their new ID in session
        $_SESSION['user_id'] = $stmt->insert_id;
        echo "success";
    } else {
        echo "Signup Failed";
    }
    $stmt->close();
}

$check->close();
$conn->close();
?>