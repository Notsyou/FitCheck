<?php
// =============================================
// check_session.php
// Verifies whether the current request carries
// a valid authenticated session cookie.
// Returns a clean JSON object: { "isLoggedIn": bool }
// =============================================

session_start(); // MUST be the first executable line — before any output whatsoever

header('Content-Type: application/json');

// Prevent any upstream caching of the auth state response
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

// Resolve auth state from the session superglobal
$isLoggedIn = isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);

echo json_encode([
    'isLoggedIn' => $isLoggedIn,
    'user_id'    => $isLoggedIn ? $_SESSION['user_id'] : null,
]);