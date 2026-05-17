// =============================================
// closet.js — My Closet Page Script
// Handles session auth, outfit grid rendering,
// avatar viewport assembly, and card deletion.
// =============================================


// =============================================
// closet.js — Auth & Modal Controls
// Replicated exactly from script.js 🔒
// =============================================

let allSavedOutfits   = [];
let activeOutfitId    = null; 

function toggleMobileNav() {
    const navLinks = document.getElementById("navLinks");
    const btn      = document.getElementById("hamburgerBtn");
    if (navLinks) navLinks.classList.toggle("nav-open");
    if (btn)      btn.classList.toggle("is-open");
}

function updateNavbar() {
    const authButtons = document.getElementById("authButtons");
    const isLoggedIn  = localStorage.getItem("isLoggedIn") === "true";
    const lock        = document.getElementById("closetLock"); // Your lock container ID

    if (authButtons) {
        if (isLoggedIn) {
            authButtons.innerHTML = `<button class="logout-btn" onclick="logout()">LOG OUT</button>`;
            if (lock) lock.style.display = "none";
        } else {
            authButtons.innerHTML = `
                <button class="logout-btn" onclick="showLogin()">LOGIN</button>
                <button class="signup-btn" onclick="showSignup()">SIGN UP</button>
            `;
            if (lock) lock.style.display = "flex";
        }
    }
}

function showLogin() {
    document.getElementById("loginContainer").style.display  = "flex";
    document.getElementById("signupContainer").style.display = "none";
}

function showSignup() {
    document.getElementById("signupContainer").style.display = "flex";
    document.getElementById("loginContainer").style.display  = "none";
}

function closePopups() {
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    // 🚀 CRITICAL: If logged out, they CANNOT close the popup to look at the page
    if (!isLoggedIn) {
        showLogin();
        return;
    }
    document.getElementById("loginContainer").style.display  = "none";
    document.getElementById("signupContainer").style.display = "none";
}

window.onclick = function (event) {
    const isLoggedIn  = localStorage.getItem("isLoggedIn") === "true";
    // 🚀 CRITICAL: If logged out, disable backdrop clicking completely
    if (!isLoggedIn) return;

    const loginPopup  = document.getElementById("loginContainer");
    const signupPopup = document.getElementById("signupContainer");
    if (event.target === loginPopup)  loginPopup.style.display  = "none";
    if (event.target === signupPopup) signupPopup.style.display = "none";
};

function login() {
    const username = document.getElementById("loginUsername").value;
    const password = document.getElementById("loginPassword").value;
    if (!username || !password) { alert("Please fill in all fields"); return; }

    const fd = new FormData();
    fd.append("username", username);
    fd.append("password", password);

    fetch("login.php", { method: "POST", body: fd, credentials: "include" })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                localStorage.setItem("isLoggedIn", "true");
                updateNavbar();
                closePopups();
                loadAllOutfits();
            } else {
                alert(data.message || "Login failed. Please try again.");
            }
        })
        .catch(console.error);
}

function signup() {
    const username = document.getElementById("signupUsername").value;
    const password = document.getElementById("signupPassword").value;
    if (!username || !password) { alert("Please fill in all fields"); return; }

    const fd = new FormData();
    fd.append("username", username);
    fd.append("password", password);

    fetch("signup.php", { method: "POST", body: fd, credentials: "include" })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                localStorage.setItem("isLoggedIn", "true");
                updateNavbar();
                closePopups();
                loadAllOutfits();
            } else {
                alert(data.message || "Sign up failed. Please try again.");
            }
        })
        .catch(console.error);
}

function logout() {
    fetch("logout.php", { credentials: "include" })
        .then(() => {
            localStorage.removeItem("isLoggedIn");
            window.location.href = "home.html";
        })
        .catch(() => {
            localStorage.removeItem("isLoggedIn");
            window.location.href = "home.html";
        });
}


// ── Data: Load All Saved Outfits ──────────────
function loadAllOutfits() {
    showLoadingState();

    fetch("get_saved_outfits.php", { credentials: "include" })
        .then(r => r.json())
        .then(data => {
            if (data.error) {
                showEmptyState();
                return;
            }
            allSavedOutfits = data;
            renderOutfitsGrid(allSavedOutfits);
            updateOutfitCount(allSavedOutfits.length);
        })
        .catch(err => {
            console.error("Failed to load outfits:", err);
            showEmptyState();
        });
}


// ── Grid: Render All Outfit Cards ─────────────
function renderOutfitsGrid(outfits) {
    const grid    = document.getElementById("outfitsGrid");
    const loading = document.getElementById("outfitsLoading");
    const empty   = document.getElementById("outfitsEmpty");

    if (!grid) return;

    loading.style.display = "none";

    if (outfits.length === 0) {
        empty.style.display = "flex";
        grid.style.display  = "none";
        return;
    }

    empty.style.display = "none";
    grid.style.display  = "grid";

    grid.innerHTML = outfits.map((outfit, i) => {

        // Piece count — derived from the five piece slots; no image paths touched
        const pieceKeys  = ["hat_image", "top_image", "bottom_image", "accessories_image", "footwear_image"];
        const pieceCount = pieceKeys.filter(k => outfit[k]).length;

        const isActive = outfit.id === activeOutfitId ? "closet-card-active" : "";

        return `
            <div
                class="closet-outfit-card ${isActive}"
                id="closet-card-${outfit.id}"
                onclick="previewOutfit(parseInt(${outfit.id}, 10))"
                title="Preview outfit"
            >
                <!-- Minimalist boutique placeholder — no dynamic images, no inline delete -->
                <div class="closet-card-body-wrapper">
                    <div class="closet-dress-icon-container">👗</div>
                </div>

                <!-- Card footer -->
                <div class="closet-card-footer">
                    <span class="closet-card-name">${outfit.label || 'Outfit ' + (i + 1)}</span>
                    <span class="closet-piece-count">${pieceCount} piece${pieceCount !== 1 ? 's' : ''}</span>
                </div>
            </div>
        `;
    }).join("");
}


// ── Avatar Viewport: Preview Selected Outfit ──
function previewOutfit(outfitId) {
    outfitId = parseInt(outfitId, 10); // normalise — PHP JSON ids may arrive as strings
    const outfit = allSavedOutfits.find(o => parseInt(o.id, 10) === outfitId);
    if (!outfit) return;

    activeOutfitId = outfitId;

    // Update active card highlight across the grid
    document.querySelectorAll(".closet-outfit-card").forEach(card => {
        card.classList.remove("closet-card-active");
    });
    const activeCard = document.getElementById(`closet-card-${outfitId}`);
    if (activeCard) activeCard.classList.add("closet-card-active");

    // Assemble the avatar layers
    const PIECES = ["hat", "top", "bottom", "accessories", "footwear"];
    const imageKeys = {
        hat:         "hat_image",
        top:         "top_image",
        bottom:      "bottom_image",
        accessories: "accessories_image",
        footwear:    "footwear_image",
    };

    let anyPieceLoaded = false;

    PIECES.forEach(type => {
        const imgEl  = document.getElementById(`avatar-img-${type}`);
        const slotEl = document.getElementById(`avatar-${type}`);
        const src    = outfit[imageKeys[type]];

        if (imgEl && slotEl) {
            if (src) {
                imgEl.src = src.replace(/\\/g, '/');
                slotEl.classList.add("avatar-slot-filled");
                slotEl.classList.remove("avatar-slot-empty");
                anyPieceLoaded = true;
            } else {
                imgEl.src = "";
                slotEl.classList.remove("avatar-slot-filled");
                slotEl.classList.add("avatar-slot-empty");
            }
        }
    });

    // Show the layered avatar; hide idle state
    const idle   = document.getElementById("avatarIdle");
    const layers = document.getElementById("avatarLayers");
    if (idle)   idle.style.display   = "none";
    if (layers) layers.style.display = "flex";

    // Update viewport meta strip
    const meta       = document.getElementById("viewportMeta");
    const label      = document.getElementById("viewportOutfitName");
    const labelBadge = document.getElementById("viewportLabel");
    const loadBtn    = document.getElementById("viewportLoadBtn");

    if (meta)       meta.style.display = "flex";
    if (label)      label.textContent  = outfit.label || "Unnamed Outfit";
    if (labelBadge) labelBadge.textContent = outfit.label || "Unnamed Outfit";

    // Wire up the "Open in Fitting Room" button — passes the outfit through sessionStorage
    if (loadBtn) {
        loadBtn.onclick = () => {
            sessionStorage.setItem("loadOutfit", JSON.stringify(outfit));
            window.location.href = "fittingroom.html";
        };
    }

    // Trigger fade-in animation on the layers container
    if (layers) {
        layers.classList.remove("avatar-fade-in");
        void layers.offsetWidth; // Reflow to restart animation
        layers.classList.add("avatar-fade-in");
    }

    // Activate the global delete button now that an outfit is selected
    const globalDeleteBtn = document.getElementById("globalDeleteBtn");
    if (globalDeleteBtn) globalDeleteBtn.disabled = false;
}


// ── Delete: Global Trigger ───────────────────
function deleteActiveOutfit() {
    if (!activeOutfitId) return;
    const outfit = allSavedOutfits.find(o => parseInt(o.id, 10) === parseInt(activeOutfitId, 10));
    const name = outfit ? (outfit.label || `Outfit #${activeOutfitId}`) : "this outfit";

    const confirmed = confirm(`Are you sure you want to permanently delete "${name}"? 🗑️`);
    if (!confirmed) return;

    deleteOutfit(activeOutfitId);
}


// ── Delete: Confirm + Execute ─────────────────
function confirmDeleteOutfit(outfitId, outfitLabel) {
    const name = outfitLabel || `Outfit #${outfitId}`;
    const confirmed = confirm(`Delete "${name}"? This can't be undone. 🗑`);
    if (!confirmed) return;

    deleteOutfit(outfitId);
}

function deleteOutfit(outfitId) {
    const formData = new FormData();
    formData.append("outfit_id", outfitId);

    fetch("delete_outfit.php", {
        method:      "POST",
        credentials: "include",
        body:        formData,
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            // Animate card out, then remove from DOM and state
            transitionCardOut(outfitId);
        } else {
            alert("Could not delete outfit: " + (data.message || "Unknown error"));
        }
    })
    .catch(err => {
        console.error("Delete error:", err);
        alert("Something went wrong. Please try again.");
    });
}

function transitionCardOut(outfitId) {
    const card = document.getElementById(`closet-card-${outfitId}`);

    if (card) {
        card.classList.add("closet-card-removing");
        // Wait for the CSS exit animation to finish before removing from DOM
        card.addEventListener("animationend", () => {
            card.remove();
            // Remove from in-memory state
            allSavedOutfits = allSavedOutfits.filter(o => parseInt(o.id, 10) !== parseInt(outfitId, 10));
            updateOutfitCount(allSavedOutfits.length);

            // If the deleted outfit was the one being previewed, reset the viewport
            if (parseInt(activeOutfitId, 10) === parseInt(outfitId, 10)) {
                resetViewport(); // also disables globalDeleteBtn via resetViewport()
            }

            // Ensure delete button is disabled after any deletion
            const globalDeleteBtn = document.getElementById("globalDeleteBtn");
            if (globalDeleteBtn) globalDeleteBtn.disabled = true;

            // Show empty state if the grid is now clear
            if (allSavedOutfits.length === 0) {
                showEmptyState();
            }
        }, { once: true });
    } else {
        // No card element (shouldn't happen) — just update state
        allSavedOutfits = allSavedOutfits.filter(o => parseInt(o.id, 10) !== parseInt(outfitId, 10));
        updateOutfitCount(allSavedOutfits.length);
    }
}


// ── Viewport Helpers ──────────────────────────
function resetViewport() {
    activeOutfitId = null;

    const idle   = document.getElementById("avatarIdle");
    const layers = document.getElementById("avatarLayers");
    const meta   = document.getElementById("viewportMeta");
    const label  = document.getElementById("viewportLabel");

    if (idle)   idle.style.display   = "flex";
    if (layers) layers.style.display = "none";
    if (meta)   meta.style.display   = "none";
    if (label)  label.textContent    = "Select a fit to preview";

    // No outfit selected — disable the global delete trigger
    const globalDeleteBtn = document.getElementById("globalDeleteBtn");
    if (globalDeleteBtn) globalDeleteBtn.disabled = true;
}


// ── UI State Helpers ──────────────────────────
function showLoadingState() {
    document.getElementById("outfitsLoading").style.display = "flex";
    document.getElementById("outfitsEmpty").style.display   = "none";
    document.getElementById("outfitsGrid").style.display    = "none";
}

function showEmptyState() {
    document.getElementById("outfitsLoading").style.display = "none";
    document.getElementById("outfitsEmpty").style.display   = "flex";
    document.getElementById("outfitsGrid").style.display    = "none";
}

function updateOutfitCount(count) {
    const badge = document.getElementById("outfitCountBadge");
    if (badge) badge.textContent = `${count} outfit${count !== 1 ? "s" : ""}`;
}


// ── Boot ──────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {
    // Paint the navbar immediately using whatever localStorage already has.
    // This prevents the login/signup flash while the async session check is in flight.
    updateNavbar();

    // Session guard — verifies cookie auth before rendering any data.
    // NOTE: Hard redirects are intentionally softened to console warnings
    // during development so the UI layout stays visible for debugging.
    // Swap the console.warn lines back to window.location.href = "home.html"
    // when deploying to production.
    const lock = document.getElementById("closetLock");

    fetch("check_session.php", { credentials: "include" })
        .then(r => r.json())
        .then(data => {
            if (data.isLoggedIn) {
                localStorage.setItem("isLoggedIn", "true");
                if (lock) lock.style.display = "none";
                updateNavbar();
                loadAllOutfits();
            } else {
                localStorage.removeItem("isLoggedIn");
                if (lock) lock.style.display = "flex";
                updateNavbar();
            }
        })
        .catch(err => {
            console.error("[closet.js] check_session.php fetch failed:", err);
            localStorage.removeItem("isLoggedIn");
            if (lock) lock.style.display = "flex";
            updateNavbar();
        });
});