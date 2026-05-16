// =============================================
// closet.js — My Closet Page Script
// Handles session auth, outfit grid rendering,
// avatar viewport assembly, and card deletion.
// =============================================


// ── Global State ──────────────────────────────
let allSavedOutfits   = [];
let activeOutfitId    = null;   // ID of the outfit currently shown in the viewport


// ── Mobile Nav Toggle ─────────────────────────
function toggleMobileNav() {
    const navLinks = document.getElementById("navLinks");
    const btn      = document.getElementById("hamburgerBtn");
    if (navLinks) navLinks.classList.toggle("nav-open");
    if (btn)      btn.classList.toggle("is-open");
}


// ── Navbar Auth State ─────────────────────────
function updateNavbar() {
    const authButtons = document.getElementById("authButtons");
    const isLoggedIn  = localStorage.getItem("isLoggedIn") === "true";

    if (authButtons) {
        if (isLoggedIn) {
            authButtons.innerHTML = `<button class="logout-btn" onclick="logout()">LOG OUT</button>`;
        } else {
            authButtons.innerHTML = `
                <button class="logout-btn"  onclick="showLogin()">LOGIN</button>
                <button class="signup-btn"  onclick="showSignup()">SIGN UP</button>
            `;
        }
    }
}


// ── Auth Popups ───────────────────────────────
function showLogin() {
    document.getElementById("loginContainer").style.display  = "flex";
    document.getElementById("signupContainer").style.display = "none";
}

function showSignup() {
    document.getElementById("signupContainer").style.display = "flex";
    document.getElementById("loginContainer").style.display  = "none";
}

function closePopups() {
    document.getElementById("loginContainer").style.display  = "none";
    document.getElementById("signupContainer").style.display = "none";
}

window.onclick = function (event) {
    const loginPopup  = document.getElementById("loginContainer");
    const signupPopup = document.getElementById("signupContainer");
    if (event.target === loginPopup)  loginPopup.style.display  = "none";
    if (event.target === signupPopup) signupPopup.style.display = "none";
};


// ── AJAX Auth Handlers ─────────────────────────
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
                closePopups();
                updateNavbar();
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
                closePopups();
                updateNavbar();
                loadAllOutfits();
            } else {
                alert(data.message || "Sign up failed. Please try again.");
            }
        })
        .catch(console.error);
}

function logout() {
    fetch("Logout.php", { credentials: "include" })
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

        // Collect up to 3 thumbnail images from the five piece slots
        const thumbKeys = ["hat_image", "top_image", "bottom_image", "accessories_image", "footwear_image"];
        const thumbSrcs = thumbKeys
            .map(k => outfit[k])
            .filter(Boolean)
            .slice(0, 3);

        const thumbsHTML = thumbSrcs.length > 0
            ? thumbSrcs.map(src =>
                `<img src="${src.replace(/\\/g, '/')}" class="closet-thumb" alt="piece" />`
              ).join("")
            : `<span class="closet-thumb-empty">—</span>`;

        // Piece count badge
        const pieceCount = thumbKeys.filter(k => outfit[k]).length;

        const isActive = outfit.id === activeOutfitId ? "closet-card-active" : "";

        return `
            <div
                class="closet-outfit-card ${isActive}"
                id="closet-card-${outfit.id}"
                onclick="previewOutfit(${outfit.id})"
                title="Preview outfit"
            >
                <!-- Hover delete button -->
                <button
                    class="closet-delete-btn"
                    onclick="event.stopPropagation(); confirmDeleteOutfit(${outfit.id}, '${(outfit.label || '').replace(/'/g, "\\'")}')"
                    title="Delete outfit"
                    aria-label="Delete ${outfit.label || 'outfit'}"
                >✕</button>

                <!-- Thumbnail strip -->
                <div class="closet-thumbs-strip">${thumbsHTML}</div>

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
    const outfit = allSavedOutfits.find(o => o.id === outfitId);
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
            allSavedOutfits = allSavedOutfits.filter(o => o.id !== outfitId);
            updateOutfitCount(allSavedOutfits.length);

            // If the deleted outfit was the one being previewed, reset the viewport
            if (activeOutfitId === outfitId) {
                resetViewport();
            }

            // Show empty state if the grid is now clear
            if (allSavedOutfits.length === 0) {
                showEmptyState();
            }
        }, { once: true });
    } else {
        // No card element (shouldn't happen) — just update state
        allSavedOutfits = allSavedOutfits.filter(o => o.id !== outfitId);
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
    fetch("check_session.php", { credentials: "include" })
        .then(r => r.json())
        .then(data => {
            if (data.isLoggedIn) {
                // Sync localStorage with the confirmed server session state,
                // then repaint the navbar in case localStorage was stale
                localStorage.setItem("isLoggedIn", "true");
                updateNavbar();
                loadAllOutfits();
            } else {
                localStorage.removeItem("isLoggedIn");
                // DEV MODE: log instead of redirect so the layout stays visible
                console.warn("[closet.js] Session check returned isLoggedIn: false. " +
                    "In production, this would redirect to home.html. " +
                    "Response received:", data);
                updateNavbar(); // Repaint to logged-out state
            }
        })
        .catch(err => {
            // DEV MODE: log the raw error instead of silently redirecting
            console.error("[closet.js] check_session.php fetch failed. " +
                "Check that the api/ subfolder is accessible and session_start() " +
                "is at the top of check_session.php. Raw error:", err);
            localStorage.removeItem("isLoggedIn");
            updateNavbar();
        });
});