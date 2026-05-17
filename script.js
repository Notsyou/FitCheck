// =============================================================================
// script.js — FitCheck Fitting Room
// Unified script: auth, session, navbar, upload wizard, outfit generator,
// sidebar categories, saved outfits, and analytics.
// =============================================================================


// --- Global State ---
let myClosetItems    = [];
let savedOutfits     = [];      // In-memory cache; mirrors DB, updated on save/delete
let activeVibeFilter = "All";
let uploadedFileHold = null;

const categoryCursors = { hat: 0, top: 0, bottom: 0, accessories: 0, footwear: 0 };
const generatorState  = { hat: null, top: null, bottom: null, accessories: null, footwear: null };
const SLOT_TYPES      = ["hat", "top", "bottom", "accessories", "footwear"];


// =============================================================================
// 1. Application Initialization
// =============================================================================

document.addEventListener("DOMContentLoaded", function () {
    setupVibeFilters();
    setupUploadWizardDragDrop();
    checkSessionOnLoad();
});

function checkSessionOnLoad() {
    // Backend is the authoritative source of auth state on every page load.
    fetch("check_session.php", { credentials: "include" })
        .then(r => r.json())
        .then(data => {
            if (data.isLoggedIn) {
                localStorage.setItem("isLoggedIn", "true");
                updateNavbar();
                loadClosetItems();
            } else {
                localStorage.removeItem("isLoggedIn");
                updateNavbar();
            }
        })
        .catch(() => {
            // Session check failed; default safely to logged-out state.
            localStorage.removeItem("isLoggedIn");
            updateNavbar();
        });
}

// --- Navbar and Lock Screen ---
function updateNavbar() {
    const authButtons = document.getElementById("authButtons");
    const lockScreen  = document.getElementById("fittingRoomLock");
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

function toggleMobileNav() {
    const navLinks = document.getElementById("navLinks");
    const btn      = document.getElementById("hamburgerBtn");
    if (navLinks) navLinks.classList.toggle("nav-open");
    if (btn)      btn.classList.toggle("is-open");
}


// =============================================================================
// 2. Auth Popups and Lock Screen
// =============================================================================

function showLogin()  {
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

// Lock screen delegates to the shared popup functions.
function showLoginFromLock()  { showLogin();  }
function showSignupFromLock() { showSignup(); }

// Backdrop click dismisses modals only when a session is active.
// The lock screen manages the unauthenticated state independently.
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
                loadClosetItems();
            } else {
                alert(data.message || "Login failed. Please check your credentials.");
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
                loadClosetItems();
            } else {
                alert(data.message || "Signup failed. That username may already be taken.");
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


// =============================================================================
// 3. Upload Wizard
// =============================================================================

// --- Wizard Open / Close / Step Navigation ---
function openUploadWizard() {
    uploadedFileHold = null;
    document.getElementById("clothingFile").value             = "";
    document.getElementById("uploadStatusText").textContent  = "Click or drag an image file here to select your piece";
    document.getElementById("step1NextBtn").disabled         = true;
    document.getElementById("specificPieceWrapper").style.display = "flex";
    document.getElementsByName("clothingCategory")[0].checked = true;
    document.getElementsByName("uploadVibe")[0].checked       = true;
    goToWizardStep(1);
    document.getElementById("uploadWizardContainer").style.display = "flex";
}

function closeUploadWizard() {
    document.getElementById("uploadWizardContainer").style.display = "none";
}

function goToWizardStep(n) {
    document.querySelectorAll(".wizard-step").forEach(s => s.classList.remove("active-step"));
    document.getElementById(`uploadStep${n}`).classList.add("active-step");
}

// --- File Input and Drag-and-Drop ---
function triggerFileInput() {
    document.getElementById("clothingFile").click();
}

function handleFileSelect(input) {
    if (input.files?.[0]) {
        uploadedFileHold = input.files[0];
        document.getElementById("uploadStatusText").innerHTML =
            `<strong>Selected:</strong> ${uploadedFileHold.name}`;
        document.getElementById("step1NextBtn").disabled = false;
    }
}

function toggleCategorySuboptions(val) {
    document.getElementById("specificPieceWrapper").style.display =
        val === "pieces" ? "flex" : "none";
}

function setupUploadWizardDragDrop() {
    const zone = document.querySelector(".drag-drop-zone");
    if (!zone) return;

    zone.addEventListener("dragover",  e => { e.preventDefault(); zone.style.borderColor = "#ff82b4"; });
    zone.addEventListener("dragleave", ()  => { zone.style.borderColor = "#ffb1c9"; });
    zone.addEventListener("drop", e => {
        e.preventDefault();
        zone.style.borderColor = "#ffb1c9";
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith("image/")) {
            uploadedFileHold = file;
            document.getElementById("uploadStatusText").innerHTML =
                `<strong>Selected:</strong> ${file.name}`;
            document.getElementById("step1NextBtn").disabled = false;
        }
    });
}

// --- Submit Upload ---
function submitUploadedPiece() {
    if (!uploadedFileHold) { alert("Please select an image first."); return; }

    const pieceType = document.getElementById("specificPieceType")?.value || "bottom";
    const vibe      = document.querySelector('input[name="uploadVibe"]:checked')?.value || "Casual";
    const catEl     = document.querySelector('input[name="clothingCategory"]:checked');
    const category  = catEl ? catEl.value : "pieces";

    const fd = new FormData();
    fd.append("clothing_image", uploadedFileHold);
    fd.append("category_type",  category);
    fd.append("piece_type",     pieceType);
    fd.append("vibe_genre",     vibe);

    fetch("upload_item.php", { method: "POST", body: fd, credentials: "include" })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(`Server error ${response.status}: ${text}`);
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                alert("Item added to your closet.");
                loadClosetItems();
                closeUploadWizard();
            } else {
                alert("Upload error: " + data.message);
            }
        })
        .catch(err => {
            console.error("[script.js] submitUploadedPiece failed:", err);
            alert("Upload failed: " + err.message);
        });
}


// =============================================================================
// 4. Sidebar Category Navigation
// =============================================================================

// --- Vibe Filter Setup ---
function setupVibeFilters() {
    document.querySelectorAll(".vibe-list .vibe-btn").forEach(btn => {
        btn.addEventListener("click", function () {
            document.querySelectorAll(".vibe-list .vibe-btn").forEach(b => b.classList.remove("active"));
            this.classList.add("active");
            activeVibeFilter = this.textContent.trim();
            SLOT_TYPES.forEach(t => (categoryCursors[t] = 0));
            renderSidebarCategories();
        });
    });
}

// --- Filtered Item Pool ---
function filteredItemsFor(type) {
    const pool = Array.isArray(myClosetItems) ? myClosetItems : [];
    return pool.filter(item => {
        if (item.category_type !== "pieces") return false;
        if (item.piece_type?.trim().toLowerCase() !== type) return false;
        if (activeVibeFilter !== "All" &&
            item.vibe_genre?.trim().toLowerCase() !== activeVibeFilter.trim().toLowerCase()) return false;
        return true;
    });
}

// --- Render All Category Rows ---
function renderSidebarCategories() {
    SLOT_TYPES.forEach(type => renderCategorySlot(type));
}

function renderCategorySlot(type) {
    const slot     = document.getElementById(`item-slot-${type}`);
    const leftBtn  = document.getElementById(`arrow-left-${type}`);
    const rightBtn = document.getElementById(`arrow-right-${type}`);
    const counter  = document.getElementById(`counter-${type}`);
    if (!slot) return;

    const items = filteredItemsFor(type);

    if (items.length === 0) {
        slot.innerHTML = `<div class="slot-empty-msg">No items yet</div>`;
        if (leftBtn)  leftBtn.disabled    = true;
        if (rightBtn) rightBtn.disabled   = true;
        if (counter)  counter.textContent = "0 / 0";
        return;
    }

    // Clamp cursor within bounds
    if (categoryCursors[type] >= items.length) categoryCursors[type] = items.length - 1;
    if (categoryCursors[type] < 0)             categoryCursors[type] = 0;

    const item = items[categoryCursors[type]];
    const src  = item.image_path.replace(/\\/g, "/");
    const vibe = (item.vibe_genre || "").replace(/'/g, "\\'");

    slot.innerHTML = `
        <div class="sidebar-item-card" onclick="confirmApply('${type}', ${item.id}, '${src}', '${vibe}')">
            <img src="${src}" alt="${type}" class="sidebar-item-img" />
        </div>
    `;

    if (leftBtn)  leftBtn.disabled    = categoryCursors[type] === 0;
    if (rightBtn) rightBtn.disabled   = categoryCursors[type] === items.length - 1;
    if (counter)  counter.textContent = `${categoryCursors[type] + 1} / ${items.length}`;
}

// --- Category Arrow Navigation ---
function navigateCategory(type, direction) {
    const items = filteredItemsFor(type);
    const next  = categoryCursors[type] + direction;
    if (next >= 0 && next < items.length) {
        categoryCursors[type] = next;
        renderCategorySlot(type);
    }
}


// =============================================================================
// 5. Outfit Generator
// =============================================================================

// --- Apply Item to Generator ---
function confirmApply(type, itemId, imageSrc, vibeGenre) {
    const label     = type.charAt(0).toUpperCase() + type.slice(1);
    if (!confirm(`Apply this ${label} to your outfit?`)) return;
    applyToGenerator(type, itemId, imageSrc, vibeGenre);
}

function applyToGenerator(type, itemId, imageSrc, vibeGenre) {
    generatorState[type] = { id: itemId, image_path: imageSrc, vibe_genre: vibeGenre || "" };
    renderGeneratorSlots();
    updateMasterPreview(type);
}

// --- Render All Generator Slot Pills ---
function renderGeneratorSlots() {
    SLOT_TYPES.forEach(type => {
        const cell      = document.getElementById(`gen-slot-${type}`);
        const removeBtn = document.getElementById(`remove-btn-${type}`);
        if (!cell) return;

        const state     = generatorState[type];
        const wrapper   = cell.closest(".slot-wrapper");
        const vibeBadge = wrapper ? wrapper.querySelector(".badge-vibe") : null;

        if (state) {
            cell.innerHTML = `
                <div class="gen-slot-filled">
                    <img src="${state.image_path}" class="gen-slot-img" alt="${type}" />
                </div>
            `;
            if (vibeBadge) vibeBadge.textContent = state.vibe_genre || "-";
            if (removeBtn) removeBtn.disabled = false;
        } else {
            const label = type.charAt(0).toUpperCase() + type.slice(1);
            cell.innerHTML = `<span class="empty-text">No ${label} Applied</span>`;
            if (vibeBadge) vibeBadge.textContent = "-";
            if (removeBtn) removeBtn.disabled = true;
        }
    });
}

// --- Master Preview Frame ---
function updateMasterPreview(type) {
    const masterImg   = document.getElementById("master-feature-image");
    const placeholder = document.getElementById("master-preview-placeholder");
    if (!masterImg || !placeholder) return;

    // Reset active highlight, then apply to the newly selected slot
    document.querySelectorAll(".slot-wrapper").forEach(w => w.classList.remove("is-selected"));
    const activeCell = document.getElementById(`gen-slot-${type}`);
    if (activeCell?.parentElement) activeCell.parentElement.classList.add("is-selected");

    const state = generatorState[type];
    if (state?.image_path) {
        masterImg.src          = state.image_path;
        masterImg.style.display    = "block";
        placeholder.style.display  = "none";
    } else {
        masterImg.style.display    = "none";
        placeholder.style.display  = "flex";
        placeholder.textContent    = `No item in ${type.toUpperCase()} slot`;
    }
}

// --- Remove Item from Slot ---
function removeFromGenerator(type) {
    generatorState[type] = null;
    renderGeneratorSlots();

    const masterImg   = document.getElementById("master-feature-image");
    const placeholder = document.getElementById("master-preview-placeholder");
    if (masterImg && placeholder) {
        masterImg.style.display   = "none";
        placeholder.style.display = "flex";
        placeholder.textContent   = "Tap any clothing piece to preview here";
    }

    const activeCell = document.getElementById(`gen-slot-${type}`);
    if (activeCell?.parentElement) activeCell.parentElement.classList.remove("is-selected");
}

// --- Full Outfit Randomizer ---
function generateRandomOutfit() {
    const pool       = Array.isArray(myClosetItems) ? myClosetItems : [];
    const filterVibe = activeVibeFilter.trim().toLowerCase();
    const activePool = filterVibe === "all"
        ? pool
        : pool.filter(i => i.vibe_genre?.trim().toLowerCase() === filterVibe);

    if (activePool.length === 0) {
        alert(`Upload some items under the "${activeVibeFilter}" vibe first.`);
        return;
    }

    // Group items by piece type
    const byType = {};
    activePool.forEach(item => {
        if (!item.piece_type) return;
        const t = item.piece_type.trim().toLowerCase();
        if (!byType[t]) byType[t] = [];
        byType[t].push(item);
    });

    SLOT_TYPES.forEach(type => {
        if (byType[type]?.length > 0) {
            const pick = byType[type][Math.floor(Math.random() * byType[type].length)];
            generatorState[type] = {
                id:         pick.id,
                image_path: pick.image_path.replace(/\\/g, "/"),
                vibe_genre: pick.vibe_genre || "",
            };
        }
    });

    renderGeneratorSlots();

    // If a slot was already focused, keep the preview locked to it after randomizing.
    const selectedWrapper = document.querySelector(".slot-wrapper.is-selected");
    if (selectedWrapper) {
        const innerSlot = selectedWrapper.querySelector("[id^='gen-slot-']");
        if (innerSlot) {
            const activeType = innerSlot.id.replace("gen-slot-", "");
            if (generatorState[activeType]) {
                updateMasterPreview(activeType);
                return;
            }
        }
    }

    // Fallback: anchor preview to the top or bottom slot, or first filled slot.
    const filledSlots = SLOT_TYPES.filter(type => generatorState[type] !== null);
    if (filledSlots.length > 0) {
        const anchor = filledSlots.find(t => t === "top" || t === "bottom") || filledSlots[0];
        updateMasterPreview(anchor);
    }
}

// --- Single Slot Randomizer ---
function randomizeSingleSlot(type) {
    const pool       = Array.isArray(myClosetItems) ? myClosetItems : [];
    const filterVibe = activeVibeFilter.trim().toLowerCase();

    const activePool = pool.filter(item => {
        if (item.category_type !== "pieces") return false;
        if (item.piece_type?.trim().toLowerCase() !== type) return false;
        if (filterVibe !== "all" && item.vibe_genre?.trim().toLowerCase() !== filterVibe) return false;
        return true;
    });

    if (activePool.length === 0) {
        alert(`No ${type.toUpperCase()} items available under the "${activeVibeFilter}" vibe.`);
        return;
    }

    const pick = activePool[Math.floor(Math.random() * activePool.length)];
    generatorState[type] = {
        id:         pick.id,
        image_path: pick.image_path.replace(/\\/g, "/"),
        vibe_genre: pick.vibe_genre || "",
    };

    renderGeneratorSlots();
    updateMasterPreview(type);
}


// =============================================================================
// 6. Save Outfit Workflow
// =============================================================================

// --- Open Save Modal ---
function saveCurrentOutfit() {
    if (!SLOT_TYPES.some(t => generatorState[t] !== null)) {
        alert("Add at least one piece to your outfit before saving.");
        return;
    }

    const modal = document.getElementById("saveOutfitModal");
    const input = document.getElementById("outfitNameInput");
    if (modal) {
        input.value = "";
        modal.style.display = "flex";
        setTimeout(() => input.focus(), 50);
    }
}

function closeSaveOutfitModal() {
    const modal = document.getElementById("saveOutfitModal");
    if (modal) modal.style.display = "none";
}

// --- Validate and Submit Save ---
function confirmSaveOutfit() {
    const input      = document.getElementById("outfitNameInput");
    const outfitName = input ? input.value.trim() : "";

    if (!outfitName) {
        input.style.borderColor = "#ff82b4";
        input.placeholder       = "Please enter a name first.";
        setTimeout(() => {
            input.style.borderColor = "";
            input.placeholder       = "e.g. Casual Chic, Date Night...";
        }, 2000);
        return;
    }

    closeSaveOutfitModal();

    const payload = {
        label:          outfitName,
        hat_id:         generatorState.hat?.id         ?? null,
        top_id:         generatorState.top?.id         ?? null,
        bottom_id:      generatorState.bottom?.id      ?? null,
        accessories_id: generatorState.accessories?.id ?? null,
        footwear_id:    generatorState.footwear?.id    ?? null,
    };

    fetch("save_outfit.php", {
        method:      "POST",
        credentials: "include",
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify(payload),
    })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                triggerHeartPop();

                // Build a local outfit object and prepend to the in-memory cache,
                // then re-render directly — no second fetch needed.
                const newOutfit = {
                    id:                data.outfit_id,
                    label:             outfitName,
                    hat_id:            generatorState.hat?.id              ?? null,
                    top_id:            generatorState.top?.id              ?? null,
                    bottom_id:         generatorState.bottom?.id           ?? null,
                    accessories_id:    generatorState.accessories?.id      ?? null,
                    footwear_id:       generatorState.footwear?.id         ?? null,
                    hat_image:         generatorState.hat?.image_path         ?? null,
                    top_image:         generatorState.top?.image_path         ?? null,
                    bottom_image:      generatorState.bottom?.image_path      ?? null,
                    accessories_image: generatorState.accessories?.image_path ?? null,
                    footwear_image:    generatorState.footwear?.image_path    ?? null,
                };

                savedOutfits.unshift(newOutfit);
                renderSavedOutfits(savedOutfits);
            } else {
                alert("Could not save outfit: " + (data.message || "Unknown error."));
            }
        })
        .catch(console.error);
}

// Stub — implement visual heart animation or import from a UI utilities module.
function triggerHeartPop() {}


// =============================================================================
// 7. Saved Outfits Sidebar and Analytics
// =============================================================================

// --- Fetch Closet Items ---
function loadClosetItems() {
    fetch("get_items.php", { credentials: "include" })
        .then(r => r.json())
        .then(items => {
            if (!items.error) {
                myClosetItems = items;
                renderSidebarCategories();
                renderGeneratorSlots();
                calculateClosetInsights();
            }
        })
        .catch(console.error);

    loadSavedOutfits();
}

// --- Fetch Saved Outfits ---
function loadSavedOutfits() {
    fetch("get_saved_outfits.php", { credentials: "include" })
        .then(r => r.json())
        .then(outfits => {
            if (!outfits.error) {
                savedOutfits = outfits;
                renderSavedOutfits(savedOutfits);
            }
        })
        .catch(console.error);
}

// --- Render Saved Outfits Grid ---
function renderSavedOutfits(outfits) {
    const grid = document.getElementById("savedOutfitsGrid");
    if (!grid) return;

    const DISPLAY_LIMIT  = 6;
    const displayed      = outfits.slice(0, DISPLAY_LIMIT);
    let html             = "";

    displayed.forEach((outfit, i) => {
        const encoded = btoa(JSON.stringify(outfit));
        const label   = (outfit.label || `Outfit ${i + 1}`).replace(/'/g, "\\'");

        html += `
            <div class="saved-card-new" onclick="loadSavedOutfitToGenerator('${encoded}')" style="cursor: pointer; position: relative;">
                <button class="delete-saved-btn" onclick="confirmDeleteSavedOutfit(${outfit.id}, '${label}', event)" title="Delete Outfit">&times;</button>
                <div class="closet-card-body-wrapper">
                    <div class="closet-dress-icon-container">&#128247;</div>
                </div>
                <div class="saved-card-footer">
                    <span class="saved-card-label">${outfit.label || "Outfit " + (i + 1)}</span>
                    <span class="saved-card-num">#${i + 1}</span>
                </div>
            </div>
        `;
    });

    // Pad remaining slots to always show 6 card positions
    for (let i = displayed.length; i < DISPLAY_LIMIT; i++) {
        html += `
            <div class="saved-card-new placeholder-slot-card" style="opacity: 0.65; border-style: dashed; cursor: default;">
                <div class="closet-card-body-wrapper" style="background: #faf8f6;">
                    <div class="closet-dress-icon-container" style="opacity: 0.35;">&#9825;</div>
                </div>
                <div class="saved-card-footer">
                    <span class="saved-card-label" style="color: #bbb; font-style: italic;">Empty Slot</span>
                    <span class="saved-card-num" style="background: #eee; color: #aaa;">#${i + 1}</span>
                </div>
            </div>
        `;
    }

    grid.innerHTML = html;
}

// --- Delete Saved Outfit ---
function confirmDeleteSavedOutfit(outfitId, outfitLabel, event) {
    event.stopPropagation();

    if (!confirm(`Permanently delete "${outfitLabel}"? This cannot be undone.`)) return;

    const fd = new FormData();
    fd.append("outfit_id", outfitId);

    fetch("delete_outfit.php", { method: "POST", body: fd, credentials: "include" })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                loadSavedOutfits();
            } else {
                alert("Could not delete outfit: " + (data.message || "Unknown error."));
            }
        })
        .catch(err => {
            console.error("[script.js] confirmDeleteSavedOutfit failed:", err);
            alert("Network error. Could not delete outfit.");
        });
}

// --- Load Saved Outfit Into Generator ---
function loadSavedOutfitToGenerator(encodedOutfitData) {
    try {
        const outfit = JSON.parse(atob(encodedOutfitData));

        generatorState.hat         = outfit.hat_id         ? { id: outfit.hat_id,         image_path: outfit.hat_image         } : null;
        generatorState.top         = outfit.top_id         ? { id: outfit.top_id,         image_path: outfit.top_image         } : null;
        generatorState.bottom      = outfit.bottom_id      ? { id: outfit.bottom_id,      image_path: outfit.bottom_image      } : null;
        generatorState.accessories = outfit.accessories_id ? { id: outfit.accessories_id, image_path: outfit.accessories_image } : null;
        generatorState.footwear    = outfit.footwear_id    ? { id: outfit.footwear_id,    image_path: outfit.footwear_image    } : null;

        renderGeneratorSlots();

        // Focus the preview on the most representative piece in the loaded outfit.
        if (generatorState.top) {
            updateMasterPreview("top");
        } else if (generatorState.bottom) {
            updateMasterPreview("bottom");
        } else {
            const first = SLOT_TYPES.find(t => generatorState[t] !== null);
            if (first) updateMasterPreview(first);
        }

        alert(`"${outfit.label || "Outfit"}" loaded into the generator.`);
    } catch (err) {
        console.error("[script.js] loadSavedOutfitToGenerator failed:", err);
        alert("Could not load this outfit.");
    }
}

// --- Closet Analytics ---
function calculateClosetInsights() {
    const totalPiecesEl = document.getElementById("insight-total-pieces");
    const topVibeEl     = document.getElementById("insight-top-vibe");
    if (!totalPiecesEl || !topVibeEl) return;

    const pool       = Array.isArray(myClosetItems) ? myClosetItems : [];
    const piecesOnly = pool.filter(item => item.category_type === "pieces");

    totalPiecesEl.textContent = piecesOnly.length;

    if (piecesOnly.length === 0) {
        topVibeEl.textContent = "-";
        return;
    }

    // Tally vibe counts and find the dominant aesthetic
    const vibeCounts = {};
    piecesOnly.forEach(item => {
        if (!item.vibe_genre) return;
        const vibe = item.vibe_genre.trim();
        vibeCounts[vibe] = (vibeCounts[vibe] || 0) + 1;
    });

    let favoriteVibe = "-";
    let maxCount     = 0;
    for (const [vibe, count] of Object.entries(vibeCounts)) {
        if (count > maxCount) { maxCount = count; favoriteVibe = vibe; }
    }

    // Truncate long aesthetic names to fit the stat box
    topVibeEl.textContent = favoriteVibe.length > 10
        ? favoriteVibe.substring(0, 8) + ".."
        : favoriteVibe;
}