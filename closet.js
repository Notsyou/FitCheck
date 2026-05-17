// =============================================================================
// closet.js — My Closet Page
// Handles session auth, outfit grid rendering, avatar viewport, and deletion.
// =============================================================================


// --- Global State ---
let allSavedOutfits = [];
let activeOutfitId  = null;


// --- Mobile Nav ---
function toggleMobileNav() {
    const navLinks = document.getElementById("navLinks");
    const btn      = document.getElementById("hamburgerBtn");
    if (navLinks) navLinks.classList.toggle("nav-open");
    if (btn)      btn.classList.toggle("is-open");
}


// --- Navbar Auth State ---
function updateNavbar() {
    const authButtons = document.getElementById("authButtons");
    const lockScreen  = document.getElementById("closetLock");
    const isLoggedIn  = localStorage.getItem("isLoggedIn") === "true";

    if (authButtons) {
        authButtons.innerHTML = isLoggedIn
            ? `<button class="logout-btn" onclick="logout()">LOG OUT</button>`
            : `<button class="logout-btn" onclick="showLogin()">LOGIN</button>
               <button class="signup-btn" onclick="showSignup()">SIGN UP</button>`;
    }

    if (lockScreen) {
        lockScreen.style.display = isLoggedIn ? "none" : "flex";
    }
}


// --- Auth Popups ---
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

// Backdrop click dismisses modals only when a session is active.
// The lock screen handles the unauthenticated state — no recursive traps.
window.onclick = function (event) {
    if (localStorage.getItem("isLoggedIn") !== "true") return;

    const loginPopup  = document.getElementById("loginContainer");
    const signupPopup = document.getElementById("signupContainer");
    if (event.target === loginPopup)  loginPopup.style.display  = "none";
    if (event.target === signupPopup) signupPopup.style.display = "none";
};


// --- AJAX Auth Handlers ---
function login() {
    const username = document.getElementById("loginUsername").value;
    const password = document.getElementById("loginPassword").value;
    if (!username || !password) { alert("Please fill in all fields."); return; }

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
                loadAllUserItems();
            } else {
                alert(data.message || "Login failed. Please try again.");
            }
        })
        .catch(console.error);
}

function signup() {
    const username = document.getElementById("signupUsername").value;
    const password = document.getElementById("signupPassword").value;
    if (!username || !password) { alert("Please fill in all fields."); return; }

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
                loadAllUserItems();
            } else {
                alert(data.message || "Sign up failed. Please try again.");
            }
        })
        .catch(console.error);
}

function logout() {
    fetch("logout.php", { credentials: "include" })
        .finally(() => {
            localStorage.removeItem("isLoggedIn");
            window.location.href = "home.html";
        });
}


// --- Fetch Saved Outfits ---
function loadAllOutfits() {
    showLoadingState();

    fetch("get_saved_outfits.php", { credentials: "include" })
        .then(r => r.json())
        .then(data => {
            if (data.error) { showEmptyState(); return; }
            allSavedOutfits = data;
            renderOutfitsGrid(allSavedOutfits);
            updateOutfitCount(allSavedOutfits.length);
        })
        .catch(err => {
            console.error("[closet.js] loadAllOutfits failed:", err);
            showEmptyState();
        });
}


// --- Render Outfit Cards Grid ---
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

    const PIECE_KEYS = ["hat_image", "top_image", "bottom_image", "accessories_image", "footwear_image"];

    grid.innerHTML = outfits.map((outfit, i) => {
        const pieceCount = PIECE_KEYS.filter(k => outfit[k]).length;
        const isActive   = outfit.id === activeOutfitId ? "closet-card-active" : "";

        return `
            <div
                class="closet-outfit-card ${isActive}"
                id="closet-card-${outfit.id}"
                onclick="previewOutfit(${parseInt(outfit.id, 10)})"
                title="Preview outfit"
            >
                <div class="closet-card-body-wrapper">
                    <div class="closet-dress-icon-container">&#128247;</div>
                </div>
                <div class="closet-card-footer">
                    <span class="closet-card-name">${outfit.label || "Outfit " + (i + 1)}</span>
                    <span class="closet-piece-count">${pieceCount} piece${pieceCount !== 1 ? "s" : ""}</span>
                </div>
            </div>
        `;
    }).join("");
}


// --- Avatar Viewport: Preview Selected Outfit ---
function previewOutfit(outfitId) {
    outfitId = parseInt(outfitId, 10);
    const outfit = allSavedOutfits.find(o => parseInt(o.id, 10) === outfitId);
    if (!outfit) return;

    activeOutfitId = outfitId;

    // Update active card highlight
    document.querySelectorAll(".closet-outfit-card").forEach(card => {
        card.classList.remove("closet-card-active");
    });
    const activeCard = document.getElementById(`closet-card-${outfitId}`);
    if (activeCard) activeCard.classList.add("closet-card-active");

    // Map piece types to outfit data keys
    const PIECES = ["hat", "top", "bottom", "accessories", "footwear"];
    const IMAGE_KEYS = {
        hat:         "hat_image",
        top:         "top_image",
        bottom:      "bottom_image",
        accessories: "accessories_image",
        footwear:    "footwear_image",
    };

    PIECES.forEach(type => {
        const imgEl  = document.getElementById(`avatar-img-${type}`);
        const slotEl = document.getElementById(`avatar-${type}`);
        const src    = outfit[IMAGE_KEYS[type]];

        if (!imgEl || !slotEl) return;

        if (src) {
            imgEl.src = src.replace(/\\/g, "/");
            slotEl.classList.add("avatar-slot-filled");
            slotEl.classList.remove("avatar-slot-empty");
        } else {
            imgEl.src = "";
            slotEl.classList.remove("avatar-slot-filled");
            slotEl.classList.add("avatar-slot-empty");
        }
    });

    // Swap idle state for layered view
    const idle   = document.getElementById("avatarIdle");
    const layers = document.getElementById("avatarLayers");
    if (idle)   idle.style.display   = "none";
    if (layers) layers.style.display = "flex";

    // Trigger fade-in animation (reflow required to restart)
    if (layers) {
        layers.classList.remove("avatar-fade-in");
        void layers.offsetWidth;
        layers.classList.add("avatar-fade-in");
    }

    // Update viewport meta strip
    const meta       = document.getElementById("viewportMeta");
    const nameEl     = document.getElementById("viewportOutfitName");
    const labelBadge = document.getElementById("viewportLabel");
    const loadBtn    = document.getElementById("viewportLoadBtn");
    const outfitName = outfit.label || "Unnamed Outfit";

    if (meta)       meta.style.display   = "flex";
    if (nameEl)     nameEl.textContent   = outfitName;
    if (labelBadge) labelBadge.textContent = outfitName;

    // Wire "Open in Fitting Room" button via sessionStorage handoff
    if (loadBtn) {
        loadBtn.onclick = () => {
            sessionStorage.setItem("loadOutfit", JSON.stringify(outfit));
            window.location.href = "fittingroom.html";
        };
    }

    // Enable the global delete button now that an outfit is selected
    const globalDeleteBtn = document.getElementById("globalDeleteBtn");
    if (globalDeleteBtn) globalDeleteBtn.disabled = false;
}


// --- Delete: Global Trigger (Delete Selected Button) ---
function deleteActiveOutfit() {
    if (!activeOutfitId) return;

    const outfit = allSavedOutfits.find(o => parseInt(o.id, 10) === parseInt(activeOutfitId, 10));
    const name   = outfit ? (outfit.label || `Outfit #${activeOutfitId}`) : "this outfit";

    if (!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    deleteOutfit(activeOutfitId);
}

// --- Delete: Confirm + Execute (Legacy Hook) ---
function confirmDeleteOutfit(outfitId, outfitLabel) {
    const name = outfitLabel || `Outfit #${outfitId}`;
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    deleteOutfit(outfitId);
}

// --- Delete: Fetch Request ---
function deleteOutfit(outfitId) {
    const fd = new FormData();
    fd.append("outfit_id", outfitId);

    fetch("delete_outfit.php", { method: "POST", credentials: "include", body: fd })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                transitionCardOut(outfitId);
            } else {
                alert("Could not delete outfit: " + (data.message || "Unknown error."));
            }
        })
        .catch(err => {
            console.error("[closet.js] deleteOutfit failed:", err);
            alert("Network error. Please try again.");
        });
}

// --- Delete: Animate Card Out and Sync State ---
function transitionCardOut(outfitId) {
    const card = document.getElementById(`closet-card-${outfitId}`);

    if (card) {
        card.classList.add("closet-card-removing");
        card.addEventListener("animationend", () => {
            card.remove();
            allSavedOutfits = allSavedOutfits.filter(o => parseInt(o.id, 10) !== parseInt(outfitId, 10));
            updateOutfitCount(allSavedOutfits.length);

            if (parseInt(activeOutfitId, 10) === parseInt(outfitId, 10)) {
                resetViewport();
            }

            const globalDeleteBtn = document.getElementById("globalDeleteBtn");
            if (globalDeleteBtn) globalDeleteBtn.disabled = true;

            if (allSavedOutfits.length === 0) showEmptyState();
        }, { once: true });
    } else {
        allSavedOutfits = allSavedOutfits.filter(o => parseInt(o.id, 10) !== parseInt(outfitId, 10));
        updateOutfitCount(allSavedOutfits.length);
    }
}


// --- Viewport Helpers ---
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

    const globalDeleteBtn = document.getElementById("globalDeleteBtn");
    if (globalDeleteBtn) globalDeleteBtn.disabled = true;
}


// --- UI State Helpers ---
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


// --- Fetch Individual Items ---
function loadAllUserItems() {
    fetch("get_items.php", { credentials: "include" })
        .then(r => r.json())
        .then(items => {
            const grid  = document.getElementById("itemsInventoryGrid");
            const badge = document.getElementById("itemCountBadge");
            if (!grid) return;

            if (!Array.isArray(items) || items.length === 0) {
                grid.innerHTML = `
                    <div class="items-inventory-empty">
                        <p>No items uploaded yet. Head to the Fitting Room to add pieces.</p>
                    </div>`;
                if (badge) badge.textContent = "0 items";
                return;
            }

            if (badge) badge.textContent = items.length + (items.length === 1 ? " item" : " items");

            grid.innerHTML = items.map(item => {
                const src   = item.image_path ? item.image_path.replace(/\\/g, "/") : "";
                const label = item.piece_type || item.category_type || "Item";
                return `
                    <div class="inventory-item-card" id="item-card-${item.id}">
                        <button class="item-delete-btn"
                                onclick="deleteIndividualItem(${item.id}, event)"
                                title="Delete item">&times;</button>
                        <img class="inventory-item-img"
                             src="${src}"
                             alt="${label}"
                             onerror="this.style.background='#faf6f3';this.style.opacity='0.4';" />
                        <span class="inventory-item-type">${label}</span>
                    </div>
                `;
            }).join("");
        })
        .catch(err => console.error("[closet.js] loadAllUserItems failed:", err));
}

// --- Delete Individual Item ---
function deleteIndividualItem(itemId, event) {
    event.stopPropagation();

    if (!confirm("Permanently delete this item from your closet and server storage?")) return;

    const fd = new FormData();
    fd.append("item_id", itemId);

    fetch("delete_item.php", { method: "POST", body: fd, credentials: "include" })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                const card = document.getElementById("item-card-" + itemId);
                if (card) card.remove();

                const grid  = document.getElementById("itemsInventoryGrid");
                const badge = document.getElementById("itemCountBadge");

                if (grid && badge) {
                    const remaining = grid.querySelectorAll(".inventory-item-card").length;
                    badge.textContent = remaining + (remaining === 1 ? " item" : " items");

                    if (remaining === 0) {
                        grid.innerHTML = `
                            <div class="items-inventory-empty">
                                <p>No items uploaded yet. Head to the Fitting Room to add pieces.</p>
                            </div>`;
                    }
                }
            } else {
                alert("Could not delete item: " + (data.message || "Unknown error."));
            }
        })
        .catch(err => {
            console.error("[closet.js] deleteIndividualItem failed:", err);
            alert("Network error. Please try again.");
        });
}


// --- Boot / DOMContentLoaded ---
document.addEventListener("DOMContentLoaded", function () {
    // Paint navbar immediately from cached localStorage to prevent auth flash.
    updateNavbar();

    // Session guard: verify server-side cookie auth, then sync localStorage.
    fetch("check_session.php", { credentials: "include" })
        .then(r => r.json())
        .then(data => {
            if (data.isLoggedIn) {
                localStorage.setItem("isLoggedIn", "true");
            } else {
                localStorage.removeItem("isLoggedIn");
            }
            updateNavbar();
            if (data.isLoggedIn) {
                loadAllOutfits();
                loadAllUserItems();
            }
        })
        .catch(err => {
            console.error("[closet.js] check_session.php failed:", err);
            localStorage.removeItem("isLoggedIn");
            updateNavbar();
        });
});