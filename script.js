// =============================================
// fitting-room.js — Single Unified Script
// Replaces script.js entirely. All auth, session,
// navbar, popup, and fitting room logic lives here.
// =============================================


// ── Global State ──────────────────────────────
let myClosetItems    = [];
let savedOutfits     = [];   // In-memory cache — mirrors DB, updated instantly on save/delete
let activeVibeFilter = "All";
let uploadedFileHold = null;

const categoryCursors = { hat: 0, top: 0, bottom: 0, accessories: 0, footwear: 0 };
const generatorState  = { hat: null, top: null, bottom: null, accessories: null, footwear: null };
const SLOT_TYPES      = ["hat", "top", "bottom", "accessories", "footwear"];


// ── Navbar & Lock Screen ───────────────────────
function updateNavbar() {
    const authButtons = document.getElementById("authButtons");
    const lockScreen  = document.getElementById("fittingRoomLock");
    const isLoggedIn  = localStorage.getItem("isLoggedIn") === "true";

    if (authButtons) {
        if (isLoggedIn) {
            authButtons.innerHTML = `<button class="logout-btn" onclick="logout()">LOG OUT</button>`;
        } else {
            authButtons.innerHTML = `
                <button class="logout-btn" onclick="showLogin()">LOGIN</button>
                <button class="signup-btn" onclick="showSignup()">SIGN UP</button>
            `;
        }
    }

    if (lockScreen) {
        lockScreen.style.display = isLoggedIn ? "none" : "flex";
    }
}

function showLoginFromLock()  { showLogin();  }
function showSignupFromLock() { showSignup(); }

function logout() {
    fetch("logout.php", { credentials: "include" })
    .then(() => {
        localStorage.removeItem("isLoggedIn");
        alert("Logged out successfully! See you next time. 👋");
        window.location.href = "home.html";
    })
    .catch(() => {
        localStorage.removeItem("isLoggedIn");
        window.location.href = "home.html";
    });
}


// ── Popup Utilities ────────────────────────────
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

// Dismiss modal on backdrop click (only when logged in — lock screen handles unauthenticated state)
window.onclick = function (event) {
    const loginPopup  = document.getElementById("loginContainer");
    const signupPopup = document.getElementById("signupContainer");
    const isLoggedIn  = localStorage.getItem("isLoggedIn") === "true";

    if (!isLoggedIn) return;

    if (event.target === loginPopup)  loginPopup.style.display  = "none";
    if (event.target === signupPopup) signupPopup.style.display = "none";
};


// ── AJAX Auth Handlers ─────────────────────────
function login() {
    const username = document.getElementById("loginUsername").value;
    const password = document.getElementById("loginPassword").value;

    if (username === "" || password === "") {
        alert("Please fill in all fields");
        return;
    }

    const formData = new FormData();
    formData.append("username", username);
    formData.append("password", password);

    fetch("login.php", { method: "POST", body: formData, credentials: "include" })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert("Login Successful! ✨");
            closePopups();
            localStorage.setItem("isLoggedIn", "true");
            updateNavbar();
            loadClosetItems();
        } else {
            alert(data.message || "Login failed. Please check your credentials.");
        }
    })
    .catch(error => console.error(error));
}

function signup() {
    const username = document.getElementById("signupUsername").value;
    const password = document.getElementById("signupPassword").value;

    if (username === "" || password === "") {
        alert("Please fill in all fields");
        return;
    }

    const formData = new FormData();
    formData.append("username", username);
    formData.append("password", password);

    fetch("signup.php", { method: "POST", body: formData, credentials: "include" })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert("Account Created Successfully! Welcome. 💖");
            closePopups();
            localStorage.setItem("isLoggedIn", "true");
            updateNavbar();
            loadClosetItems();
        } else {
            alert(data.message || "Signup failed. That username may already be taken.");
        }
    })
    .catch(error => console.error(error));
}


// ── Data Fetch ────────────────────────────────
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

// ── Calculate Dashboard Wardrobe Analytics ──────────
function calculateClosetInsights() {
    const totalPiecesEl = document.getElementById("insight-total-pieces");
    const topVibeEl     = document.getElementById("insight-top-vibe");
    if (!totalPiecesEl || !topVibeEl) return;

    const pool = Array.isArray(myClosetItems) ? myClosetItems : [];
    
    // 1. Calculate absolute count of individual pieces uploaded
    const piecesOnly = pool.filter(item => item.category_type === "pieces");
    totalPiecesEl.textContent = piecesOnly.length;

    // 2. Determine which vibe genre is most dominant in the user's closet
    if (piecesOnly.length === 0) {
        topVibeEl.textContent = "-";
        return;
    }

    const vibeCounts = {};
    piecesOnly.forEach(item => {
        if (!item.vibe_genre) return;
        const vibe = item.vibe_genre.trim();
        vibeCounts[vibe] = (vibeCounts[vibe] || 0) + 1;
    });

    let favoriteVibe = "-";
    let maxCount = 0;
    
    for (const [vibe, count] of Object.entries(vibeCounts)) {
        if (count > maxCount) {
            maxCount = count;
            favoriteVibe = vibe;
        }
    }

    // Truncate if the aesthetic name is exceptionally long (e.g., Streetwear)
    topVibeEl.textContent = favoriteVibe.length > 10 ? favoriteVibe.substring(0, 8) + ".." : favoriteVibe;
}

// ── Vibe Filter ───────────────────────────────
function setupVibeFilters() {
    document.querySelectorAll(".vibe-list .vibe-btn").forEach(btn => {
        btn.addEventListener("click", function () {
            document.querySelectorAll(".vibe-list .vibe-btn").forEach(b => b.classList.remove("active"));
            this.classList.add("active");
            activeVibeFilter = this.textContent.trim();
            SLOT_TYPES.forEach(t => categoryCursors[t] = 0);
            renderSidebarCategories();
        });
    });
}

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


// ── Sidebar Category Renderer ─────────────────
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
        if (leftBtn)  leftBtn.disabled  = true;
        if (rightBtn) rightBtn.disabled = true;
        if (counter)  counter.textContent = "0 / 0";
        return;
    }

    // Clamp cursor
    if (categoryCursors[type] >= items.length) categoryCursors[type] = items.length - 1;
    if (categoryCursors[type] < 0)             categoryCursors[type] = 0;

    const item = items[categoryCursors[type]];
    const src  = item.image_path.replace(/\\/g, '/');
    const vibe = (item.vibe_genre || '').replace(/'/g, "\\'");

    slot.innerHTML = `
        <div class="sidebar-item-card" onclick="confirmApply('${type}', ${item.id}, '${src}', '${vibe}')">
            <img src="${src}" alt="${type}" class="sidebar-item-img" />
        </div>
    `;

    if (leftBtn)  leftBtn.disabled  = categoryCursors[type] === 0;
    if (rightBtn) rightBtn.disabled = categoryCursors[type] === items.length - 1;
    if (counter)  counter.textContent = `${categoryCursors[type] + 1} / ${items.length}`;
}

// Arrow navigation
function navigateCategory(type, direction) {
    const items = filteredItemsFor(type);
    const next  = categoryCursors[type] + direction;
    if (next >= 0 && next < items.length) {
        categoryCursors[type] = next;
        renderCategorySlot(type);
    }
}

// ── Master Viewport Preview Engine ──────────────────
function updateMasterPreview(type) {
    const masterImg   = document.getElementById("master-feature-image");
    const placeholder = document.getElementById("master-preview-placeholder");
    if (!masterImg || !placeholder) return;

    // Reset all active highlights, then apply to the newly selected slot
    document.querySelectorAll(".slot-wrapper").forEach(wrapper => {
        wrapper.classList.remove("is-selected");
    });
    const activeCell = document.getElementById(`gen-slot-${type}`);
    if (activeCell && activeCell.parentElement) {
        activeCell.parentElement.classList.add("is-selected");
    }

    const state = generatorState[type];
    if (state && state.image_path) {
        masterImg.src = state.image_path;
        masterImg.style.display = "block";
        placeholder.style.display = "none";
    } else {
        masterImg.style.display = "none";
        placeholder.style.display = "flex";
        // Safe: write directly — no child <span> required in the placeholder element
        placeholder.textContent = `No item in ${type.toUpperCase()} slot to show yet 💭`;
    }
}

// ── Update our existing Delete Function to catch changes ──
function removeFromGenerator(type) {
    generatorState[type] = null;
    renderGeneratorSlots();

    // Clear master viewport and strip the active highlight from the removed slot
    const masterImg   = document.getElementById("master-feature-image");
    const placeholder = document.getElementById("master-preview-placeholder");
    if (masterImg && placeholder) {
        masterImg.style.display = "none";
        placeholder.style.display = "flex";
        placeholder.textContent = "Tap any clothing piece to preview here ✨";
    }
    const activeCell = document.getElementById(`gen-slot-${type}`);
    if (activeCell && activeCell.parentElement) {
        activeCell.parentElement.classList.remove("is-selected");
    }
}

// ── Apply Confirm Dialog ──────────────────────
function confirmApply(type, itemId, imageSrc, vibeGenre) {
    const label     = type.charAt(0).toUpperCase() + type.slice(1);
    const confirmed = confirm(`Apply this ${label} to your outfit? ✨`);
    if (!confirmed) return;
    applyToGenerator(type, itemId, imageSrc, vibeGenre);
}

function applyToGenerator(type, itemId, imageSrc, vibeGenre) {
    generatorState[type] = { id: itemId, image_path: imageSrc, vibe_genre: vibeGenre || '' };
    renderGeneratorSlots();
    updateMasterPreview(type);
}


// ── Generator Slots Renderer ──────────────────
function renderGeneratorSlots() {
    SLOT_TYPES.forEach(type => {
        const cell = document.getElementById(`gen-slot-${type}`);
        const removeBtn = document.getElementById(`remove-btn-${type}`);
        if (!cell) return;

        const state = generatorState[type];
        
        // Safely traverse up to the slot-wrapper to find the vibe badge
        const wrapper   = cell.closest('.slot-wrapper');
        const vibeBadge = wrapper ? wrapper.querySelector('.badge-vibe') : null;

        if (state) {
            cell.innerHTML = `
                <div class="gen-slot-filled">
                    <img src="${state.image_path}" class="gen-slot-img" alt="${type}" />
                </div>
            `;

            if (vibeBadge) {
                vibeBadge.textContent = state.vibe_genre || '-';
            }
            if (removeBtn) {
                removeBtn.disabled = false;
            }
        } else {
            cell.innerHTML = `<span class="empty-text">No ${type.charAt(0).toUpperCase() + type.slice(1)} Applied</span>`;

            if (vibeBadge) {
                vibeBadge.textContent = '-';
            }
            if (removeBtn) {
                removeBtn.disabled = true;
            }
        }
    });
}



// ── Randomizer ────────────────────────────────
function generateRandomOutfit() {
    const pool       = Array.isArray(myClosetItems) ? myClosetItems : [];
    const filterVibe = activeVibeFilter.trim().toLowerCase();
    const activePool = filterVibe === "all"
        ? pool
        : pool.filter(i => i.vibe_genre?.trim().toLowerCase() === filterVibe);

    if (activePool.length === 0) {
        alert(`Upload some items under the "${activeVibeFilter}" vibe first!`);
        return;
    }

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
                image_path: pick.image_path.replace(/\\/g, '/'),
                vibe_genre: pick.vibe_genre || '',
            };
        }
    });

    renderGeneratorSlots();

    // ── SMART RETENTION PREVIEW SYNC ──
    // 1. Check if the user is ALREADY focused on an existing selected slot
    const currentlySelectedWrapper = document.querySelector(".slot-wrapper.is-selected");
    
    if (currentlySelectedWrapper) {
        // Find which slot element ID lives inside this highlighted wrapper
        const innerSlot = currentlySelectedWrapper.querySelector("[id^='gen-slot-']");
        if (innerSlot) {
            const activeType = innerSlot.id.replace("gen-slot-", "");
            // If that slot successfully received a new random item, refresh its preview image
            if (generatorState[activeType]) {
                updateMasterPreview(activeType);
                return; // 🚀 Exit early! Focus stays locked on the item they are looking at
            }
        }
    }

    // 2. Fallback: If nothing was selected before rolling, pick a filled slot to focus on
    const filledSlots = SLOT_TYPES.filter(type => generatorState[type] !== null);
    if (filledSlots.length > 0) {
        // Prioritize anchoring the look to the 'top' or 'bottom' on a first roll if available
        const idealAnchor = filledSlots.find(type => type === 'top' || type === 'bottom') || filledSlots[0];
        updateMasterPreview(idealAnchor);
    }
}


// ── Per-Category Single Slot Randomizer ──────────────────
function randomizeSingleSlot(type) {
    const pool = Array.isArray(myClosetItems) ? myClosetItems : [];
    const filterVibe = activeVibeFilter.trim().toLowerCase();

    // 1. Filter items strictly matching the active sidebar vibe selection and slot type
    const activePool = pool.filter(item => {
        if (item.category_type !== "pieces") return false;
        if (item.piece_type?.trim().toLowerCase() !== type) return false;
        if (filterVibe !== "all" && item.vibe_genre?.trim().toLowerCase() !== filterVibe) return false;
        return true;
    });

    if (activePool.length === 0) {
        alert(`You don't have any ${type.toUpperCase()} items uploaded under the "${activeVibeFilter}" vibe pool yet! 💭`);
        return;
    }

    // 2. Pick a random item from the specific pool
    const randomPick = activePool[Math.floor(Math.random() * activePool.length)];

    // 3. Inject it straight into the state loop and re-render
    generatorState[type] = {
        id:         randomPick.id,
        image_path: randomPick.image_path.replace(/\\/g, '/'),
        vibe_genre: randomPick.vibe_genre || '',
    };

    renderGeneratorSlots();
    updateMasterPreview(type); // Ensure this is explicitly fired here!
}

// ── Heart Save & Custom Outfit Naming ──────────
function saveCurrentOutfit() {
    const hasItem = SLOT_TYPES.some(t => generatorState[t] !== null);
    if (!hasItem) {
        alert("Add at least one piece to your outfit before saving! 💕");
        return;
    }
    // Open the custom naming modal instead of the native browser prompt
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

function confirmSaveOutfit() {
    const input = document.getElementById("outfitNameInput");
    const outfitName = input ? input.value.trim() : "";

    if (!outfitName) {
        input.style.borderColor = "#ff82b4";
        input.placeholder = "Please enter a name first! 💭";
        setTimeout(() => {
            input.style.borderColor = "";
            input.placeholder = "e.g. Casual Chic, Date Night...";
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

            // ── Instant update: same pattern as the generator ──
            // Build a local outfit object from generatorState and push
            // it into the in-memory array, then re-render directly —
            // no second fetch() needed, no race condition with the DB.
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

            // Prepend so newest appears first (matches DB ORDER BY created_at DESC)
            savedOutfits.unshift(newOutfit);
            renderSavedOutfits(savedOutfits);
        } else {
            alert("Could not save outfit: " + (data.message || "Unknown error"));
        }
    })
    .catch(console.error);
}

// ── Saved Outfits Sidebar ─────────────────────
function loadSavedOutfits() {
    fetch("get_saved_outfits.php", { credentials: "include" })
        .then(r => r.json())
        .then(outfits => {
            if (!outfits.error) {
                savedOutfits = outfits; // Sync in-memory cache with DB
                renderSavedOutfits(savedOutfits);
            }
        })
        .catch(console.error);
}

function renderSavedOutfits(outfits) {
    const grid = document.getElementById("savedOutfitsGrid");
    if (!grid) return;

    const displayedOutfits = outfits.slice(0, 6);
    let finalHtml = "";

    displayedOutfits.forEach((outfit, i) => {
        const safeOutfitJson = btoa(JSON.stringify(outfit));

        finalHtml += `
            <div class="saved-card-new" onclick="loadSavedOutfitToGenerator('${safeOutfitJson}')" style="cursor: pointer; position: relative;">
                <button class="delete-saved-btn" onclick="confirmDeleteSavedOutfit(${outfit.id}, '${outfit.label.replace(/'/g, "\\'")}', event)" title="Delete Outfit">×</button>
                <div class="closet-card-body-wrapper">
                    <div class="closet-dress-icon-container">👗</div>
                </div>
                <div class="saved-card-footer">
                    <span class="saved-card-label">${outfit.label || 'Outfit ' + (i + 1)}</span>
                    <span class="saved-card-num">#${i + 1}</span>
                </div>
            </div>
        `;
    });

    // Keep the rest of your dynamic placeholder empty cards code block right below here unchanged...
    const totalSlotsNeeded = 6;
    const currentOutfitsCount = displayedOutfits.length;
    if (currentOutfitsCount < totalSlotsNeeded) {
        for (let i = currentOutfitsCount; i < totalSlotsNeeded; i++) {
            finalHtml += `
                <div class="saved-card-new placeholder-slot-card" style="opacity: 0.65; border-style: dashed; cursor: default;">
                    <div class="closet-card-body-wrapper" style="background: #faf8f6;">
                        <div class="closet-dress-icon-container" style="opacity: 0.35;">♡</div>
                    </div>
                    <div class="saved-card-footer">
                        <span class="saved-card-label" style="color: #bbb; font-style: italic;">Empty Slot</span>
                        <span class="saved-card-num" style="background: #eee; color: #aaa;">#${i + 1}</span>
                    </div>
                </div>
            `;
        }
    }
    grid.innerHTML = finalHtml;
}

// ── Delete Saved Outfit Pipeline ──────────────────
function confirmDeleteSavedOutfit(outfitId, outfitLabel, event) {
    // 1. Force halt event propagation so the parent card click doesn't trigger an outfit load
    event.stopPropagation();

    // 2. Present an interactive browser confirmation modal
    const confirmed = confirm(`Are you sure you want to permanently delete your saved outfit "${outfitLabel}"? 💧`);
    if (!confirmed) return;

    // 3. Dispatch the payload to a backend deletion script inside your api directory
    const formData = new FormData();
    formData.append("outfit_id", outfitId);

    fetch("delete_outfit.php", {
        method: "POST",
        body: formData,
        credentials: "include"
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            // 4. On successful drop from database, instantly reload the local grid tracking view live!
            loadSavedOutfits();
        } else {
            alert("Could not delete outfit: " + (data.message || "Unknown error"));
        }
    })
    .catch(error => {
        console.error("Deletion Endpoint Error:", error);
        alert("Network failure. Could not remove outfit profile.");
    });
}
// ── Load Saved Outfit Back Into Active State ──
function loadSavedOutfitToGenerator(encodedOutfitData) {
    try {
        // 1. Decode the base64 JSON payload string back into a usable object
        const outfit = JSON.parse(atob(encodedOutfitData));
        
        // 2. Map the relational joined asset images straight back into the live generatorState loop
        generatorState.hat = outfit.hat_id ? { id: outfit.hat_id, image_path: outfit.hat_image } : null;
        generatorState.top = outfit.top_id ? { id: outfit.top_id, image_path: outfit.top_image } : null;
        generatorState.bottom = outfit.bottom_id ? { id: outfit.bottom_id, image_path: outfit.bottom_image } : null;
        generatorState.accessories = outfit.accessories_id ? { id: outfit.accessories_id, image_path: outfit.accessories_image } : null;
        generatorState.footwear = outfit.footwear_id ? { id: outfit.footwear_id, image_path: outfit.footwear_image } : null;

        // 3. Re-render the slot grids to show the loaded clothes layout
        renderGeneratorSlots();

        // 4. Focus the master feature preview pane onto the loaded look's core piece
        if (generatorState.top) {
            updateMasterPreview('top');
        } else if (generatorState.bottom) {
            updateMasterPreview('bottom');
        } else {
            const firstAvailable = SLOT_TYPES.find(t => generatorState[t] !== null);
            if (firstAvailable) updateMasterPreview(firstAvailable);
        }

        alert(`✨ "${outfit.label || 'Outfit'}" loaded into the generator! Check it out.`);
    } catch (error) {
        console.error("Error unpacking saved outfit configuration:", error);
        alert("Oops! Could not load this outfit profile.");
    }
}

// ── Upload Wizard ─────────────────────────────
function openUploadWizard() {
    uploadedFileHold = null;
    document.getElementById("clothingFile").value = "";
    document.getElementById("uploadStatusText").textContent = "Click or drag image here to select your piece";
    document.getElementById("step1NextBtn").disabled = true;
    document.getElementById("specificPieceWrapper").style.display = "flex";
    document.getElementsByName("clothingCategory")[0].checked = true;
    document.getElementsByName("uploadVibe")[0].checked = true;
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

function triggerFileInput() {
    document.getElementById("clothingFile").click();
}

function handleFileSelect(input) {
    if (input.files?.[0]) {
        uploadedFileHold = input.files[0];
        document.getElementById("uploadStatusText").innerHTML =
            `✨ <strong>Selected:</strong> ${uploadedFileHold.name}`;
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
    zone.addEventListener("dragover", e => { e.preventDefault(); zone.style.borderColor = "#ff82b4"; });
    zone.addEventListener("dragleave", ()  => { zone.style.borderColor = "#ffb1c9"; });
    zone.addEventListener("drop", e => {
        e.preventDefault();
        zone.style.borderColor = "#ffb1c9";
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith("image/")) {
            uploadedFileHold = file;
            document.getElementById("uploadStatusText").innerHTML =
                `✨ <strong>Selected:</strong> ${file.name}`;
            document.getElementById("step1NextBtn").disabled = false;
        }
    });
}

function submitUploadedPiece() {
    if (!uploadedFileHold) { alert("Please select an image first!"); return; }

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
                    throw new Error(`Server returned error status ${response.status}:\n${text}`);
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                alert("Item added to your closet! ✨");
                loadClosetItems();
                closeUploadWizard();
            } else {
                alert("Upload error: " + data.message);
            }
        })
        .catch(error => {
            console.error("Upload Error:", error);
            alert("Upload failed: " + error.message);
        });
}


// ── Boot: Single Unified Initialization Hook ───
document.addEventListener("DOMContentLoaded", function () {
    setupVibeFilters();
    setupUploadWizardDragDrop();

    // Backend is the single source of truth for auth state on every page load
    fetch("check_session.php", { credentials: "include" })
    .then(response => response.json())
    .then(data => {
        if (data.isLoggedIn) {
            localStorage.setItem("isLoggedIn", "true");
            updateNavbar();
            loadClosetItems(); // Instantly populates the sidebar and slots on fresh reload
        } else {
            localStorage.removeItem("isLoggedIn");
            updateNavbar();    // Shows lock screen and login/signup buttons
        }
    })
    .catch(() => {
        // If session check fails, default safely to logged-out state
        localStorage.removeItem("isLoggedIn");
        updateNavbar();
    });
});