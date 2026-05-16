// =============================================
// auth.js — Authentication & Session Management
// =============================================

// ── Popup Visibility ─────────────────────────
function showLogin() {
    document.getElementById("loginContainer").style.display = "flex";
    const sc = document.getElementById("signupContainer");
    if (sc) sc.style.display = "none";
}

function showSignup() {
    document.getElementById("signupContainer").style.display = "flex";
    const lc = document.getElementById("loginContainer");
    if (lc) lc.style.display = "none";
}

function closePopups() {
    const lc = document.getElementById("loginContainer");
    const sc = document.getElementById("signupContainer");
    if (lc) lc.style.display = "none";
    if (sc) sc.style.display = "none";
}

// Close popup on backdrop click
window.addEventListener("click", function (event) {
    const lc = document.getElementById("loginContainer");
    const sc = document.getElementById("signupContainer");
    if (event.target === lc) lc.style.display = "none";
    if (event.target === sc) sc.style.display = "none";
});

// Aliases used by the lock screen
function showLoginFromLock()  { showLogin();  }
function showSignupFromLock() { showSignup(); }

// ── Navbar Renderer ───────────────────────────
function updateNavbar() {
    const authButtons = document.getElementById("authButtons");
    const lockScreen  = document.getElementById("fittingRoomLock");
    const isLoggedIn  = localStorage.getItem("isLoggedIn") === "true";

    if (authButtons) {
        authButtons.innerHTML = isLoggedIn
            ? `<button class="logout-btn" onclick="logout()">LOG OUT</button>`
            : `<button class="logout-btn"  onclick="showLogin()">LOGIN</button>
               <button class="signup-btn" onclick="showSignup()">SIGN UP</button>`;
    }

    if (lockScreen) {
        lockScreen.style.display = isLoggedIn ? "none" : "flex";
    }
}

// ── Login ─────────────────────────────────────
function login() {
    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!username || !password) { alert("Please fill in all fields"); return; }

    const fd = new FormData();
    fd.append("username", username);
    fd.append("password", password);

    fetch("login.php", { method: "POST", body: fd, credentials: "include" })
        .then(r => r.text())
        .then(data => {
            if (data.trim() === "success") {
                localStorage.setItem("isLoggedIn", "true");
                closePopups();
                updateNavbar();
                // Notify page-specific scripts
                document.dispatchEvent(new Event("auth:loggedIn"));
            } else {
                alert(data);
            }
        })
        .catch(console.error);
}

// ── Signup ────────────────────────────────────
function signup() {
    const username = document.getElementById("signupUsername").value.trim();
    const password = document.getElementById("signupPassword").value;

    if (!username || !password) { alert("Please fill in all fields"); return; }

    const fd = new FormData();
    fd.append("username", username);
    fd.append("password", password);

    fetch("signup.php", { method: "POST", body: fd, credentials: "include" })
        .then(r => r.text())
        .then(data => {
            if (data.trim() === "success") {
                localStorage.setItem("isLoggedIn", "true");
                closePopups();
                updateNavbar();
                document.dispatchEvent(new Event("auth:loggedIn"));
            } else {
                alert(data);
            }
        })
        .catch(console.error);
}

// ── Logout ────────────────────────────────────
function logout() {
    fetch("Logout.php", { credentials: "include" })
        .finally(() => {
            localStorage.removeItem("isLoggedIn");
            window.location.href = "home.html";
        });
}

// ── Session Check on Every Page Load ─────────
document.addEventListener("DOMContentLoaded", function () {
    fetch("Check_session.php", { credentials: "include" })
        .then(r => r.json())
        .then(data => {
            if (data.isLoggedIn) {
                localStorage.setItem("isLoggedIn", "true");
            } else {
                localStorage.removeItem("isLoggedIn");
            }
            updateNavbar();
            if (data.isLoggedIn) {
                document.dispatchEvent(new Event("auth:loggedIn"));
            }
        })
        .catch(() => {
            localStorage.removeItem("isLoggedIn");
            updateNavbar();
        });
});