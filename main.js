// ============================================================
// main.js — CompSaver UI Controller
// STRICT WALL LOGIC + AUTO DETECTION + EFFECTS PRESET
// ============================================================

window.onerror = function(msg, url, line) {
    console.error("[CompSaver Error] " + msg + " | Line: " + line + " | File: " + url);
    return true;
};

var SECTIONS = {
    COMP: "comp",
    LAYER: "layer",
    TEXT: "text",
    TEXT_PROPS: "text_props",
    FOOTAGE: "footage",
    EFFECT: "effect",
    ICON: "icon",
    OVERLAY: "overlay",
    ELEMENT: "element"
};

var IMAGE_SECTIONS = [SECTIONS.ICON, SECTIONS.OVERLAY, SECTIONS.ELEMENT];
var MODULES = {
    TOOLKIT: "toolkit",
    TEMPLATES: "templates"
};

var csInterface = new CSInterface();

var rootPath = "";
var allTemplates = [];
var currentMainModule = MODULES.TEMPLATES;
var currentSection = SECTIONS.COMP;
var currentImageSection = SECTIONS.ICON;
var currentTextSection = SECTIONS.TEXT_PROPS;
var currentToolkitSection = "home";
var currentCategory = "All";
var renameTargetCard = null;
var moveTargetCard = null;
var selectedCatValue = "Uncategorized";
var selectedMoveCat = "";
var selectedSaveType = SECTIONS.COMP;
var detectedSaveType = "";
var detectedMessage = "";
var saveCapabilities = null;

var frameCache = {};

// ============================================================
// UTILITIES
// ============================================================

function normalizeSectionName(section) {
    if (!section) return "";
    if (section === "transition") return SECTIONS.LAYER;
    if (section === "png") return SECTIONS.ICON;
    if (section === "textprops" || section === "text-properties" || section === "text_properties") return SECTIONS.TEXT_PROPS;
    return section;
}

function getTemplateSection(t) {
    if (!t) return "";
    var sec = t.section || t.type || "";
    return normalizeSectionName(sec);
}

function isImageSection(section) {
    return IMAGE_SECTIONS.indexOf(section) !== -1;
}

function isTextSection(section) {
    return section === SECTIONS.TEXT || section === SECTIONS.TEXT_PROPS;
}

function encodeBridge(str) {
    var hex = "";
    if (!str && str !== 0) return hex;
    str = "" + str;
    for (var i = 0; i < str.length; i++) {
        var h = str.charCodeAt(i).toString(16);
        while (h.length < 4) h = "0" + h;
        hex += h;
    }
    return hex;
}

function decodeBridge(hex) {
    var str = "";
    if (!hex) return "";
    hex = "" + hex;
    for (var i = 0; i < hex.length; i += 4) {
        str += String.fromCharCode(parseInt(hex.substr(i, 4), 16));
    }
    return str;
}

function escapeHTML(str) {
    if (!str) return "";
    return ("" + str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeAttr(str) {
    if (!str) return "";
    return ("" + str).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function buildFileUrl(rawPath) {
    if (!rawPath) return "";
    var p = ("" + rawPath).replace(/\\/g, "/");
    if (/^[A-Za-z]:\//.test(p)) return "file:///" + p;
    if (p.indexOf("/") === 0) return "file://" + p;
    return p;
}

// ============================================================
// TOAST
// ============================================================

function showToast(msg, type) {
    var toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = msg;
    var bc = { error:"rgba(248,113,113,0.3)", success:"rgba(110,231,183,0.3)", info:"rgba(168,85,247,0.25)" };
    var tc = { error:"rgba(248,113,113,0.9)", success:"rgba(110,231,183,0.9)", info:"rgba(255,255,255,0.85)" };
    toast.style.borderColor = bc[type] || bc.info;
    toast.style.color = tc[type] || tc.info;
    toast.classList.add("show");
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(function() { toast.classList.remove("show"); }, 2000);
}

// ============================================================
// UI HELPERS
// ============================================================

function updateCount() {
    var el = document.getElementById("template-count");
    if (!el) return;
    if (currentMainModule === MODULES.TOOLKIT) {
        el.textContent = "Toolkit";
        return;
    }
    el.textContent = allTemplates.filter(function(t) {
        return getTemplateSection(t) === currentSection;
    }).length;
}

function blurGrid() {
    var ids = ["comp-list-container","icon-list-container","transition-list-container","text-list-container","footage-list-container","effect-list-container"];
    ids.forEach(function(id) {
        var g = document.getElementById(id);
        if (g) { g.style.filter = "blur(3px)"; g.style.pointerEvents = "none"; }
    });
}

function unblurGrid() {
    var ids = ["comp-list-container","icon-list-container","transition-list-container","text-list-container","footage-list-container","effect-list-container"];
    ids.forEach(function(id) {
        var g = document.getElementById(id);
        if (g) { g.style.filter = "none"; g.style.pointerEvents = "auto"; }
    });
}

function hideFooter() { var f = document.querySelector(".footer-area"); if (f) f.style.display = "none"; }
function showFooter() { var f = document.querySelector(".footer-area"); if (f) f.style.display = "block"; }

function setSelectorDisplay(selector, val) {
    var el = document.querySelector(selector);
    if (el) el.style.display = val;
}

function setTemplateShellVisible(isVisible) {
    setSelectorDisplay(".section-switcher", isVisible ? "flex" : "none");
    setSelectorDisplay(".search-row", isVisible ? "flex" : "none");
    setSelectorDisplay(".tabs-wrapper", isVisible ? "flex" : "none");
    setSelectorDisplay(".footer-area", isVisible ? "block" : "none");

    var templateSections = ["section-comp", "section-images", "section-transition", "section-text", "section-footage", "section-effect"];
    templateSections.forEach(function(id) { if (!isVisible) setDisplay(id, "none"); });
}

function switchMainModule(module) {
    currentMainModule = module === MODULES.TOOLKIT ? MODULES.TOOLKIT : MODULES.TEMPLATES;

    setActive("btn-main-toolkit", currentMainModule === MODULES.TOOLKIT);
    setActive("btn-main-templates", currentMainModule === MODULES.TEMPLATES);

    var panel = document.getElementById("cat-panel");
    if (panel) panel.classList.remove("open");
    unblurGrid();

    if (currentMainModule === MODULES.TOOLKIT) {
        setTemplateShellVisible(false);
        setDisplay("toolkit-module", "flex");
        switchToolkitSection(currentToolkitSection || "home");
    } else {
        setDisplay("toolkit-module", "none");
        setTemplateShellVisible(true);
        switchSection(currentSection || SECTIONS.COMP);
    }
    updateCount();
}

function switchToolkitSection(section) {
    currentToolkitSection = section || "home";
    document.querySelectorAll(".toolkit-tab").forEach(function(tab) {
        tab.classList.toggle("active", tab.dataset.toolkitSection === currentToolkitSection);
    });
    document.querySelectorAll(".toolkit-view").forEach(function(view) {
        view.classList.remove("active");
    });
    var activeView = document.getElementById("toolkit-" + currentToolkitSection);
    if (activeView) activeView.classList.add("active");
    updateCount();
}

function closeCatPanel() {
    var panel = document.getElementById("cat-panel");
    if (panel) panel.classList.remove("open");
    showFooter(); unblurGrid();
}

function forceIconGrid() {
    var grid = document.getElementById("icon-list-container");
    if (!grid) return;
    grid.style.display = "grid";
    if (currentSection === SECTIONS.OVERLAY) {
        grid.style.gridTemplateColumns = "repeat(auto-fill, minmax(85px, 1fr))";
        grid.classList.add("overlay-mode");
    } else {
        grid.style.gridTemplateColumns = "repeat(auto-fill, minmax(45px, 1fr))";
        grid.classList.remove("overlay-mode");
    }
}

function getSaveTypeLabel(type) {
    var labels = { comp:"Pre-Comp", png:"PNG", layer:"Layer", text:"Text Layer", text_props:"Text Properties", footage:"Footage", effect:"Effect Preset" };
    return labels[type] || "Template";
}

function getSaveSectionForType(type) {
    if (type === SECTIONS.COMP) return SECTIONS.COMP;
    if (type === SECTIONS.LAYER) return SECTIONS.LAYER;
    if (type === SECTIONS.TEXT) return SECTIONS.TEXT;
    if (type === SECTIONS.TEXT_PROPS) return SECTIONS.TEXT_PROPS;
    if (type === SECTIONS.FOOTAGE) return SECTIONS.FOOTAGE;
    if (type === SECTIONS.EFFECT) return SECTIONS.EFFECT;
    if (type === "png") return currentImageSection || SECTIONS.ICON;
    return currentSection;
}

function getSaveModalTitle(type) {
    var titles = { comp:"Pre-Comp Save", png:"PNG Save", layer:"Layer Save", text:"Text Layer Save", text_props:"Text Properties Save", footage:"Footage Save", effect:"Effect Preset Save" };
    return titles[type] || "Template Save";
}

// ============================================================
// SECTION SWITCHING
// ============================================================

function switchSection(section) {
    section = normalizeSectionName(section);
    if (section === SECTIONS.TEXT) currentTextSection = SECTIONS.TEXT;
    else if (section === SECTIONS.TEXT_PROPS) currentTextSection = SECTIONS.TEXT_PROPS;
    currentSection = section;
    if (isImageSection(section)) currentImageSection = section;

    currentCategory = "All";
    var imgSection = isImageSection(currentSection);
    var textSection = isTextSection(currentSection);

    setActive("btn-section-comp", currentSection === SECTIONS.COMP);
    setActive("btn-section-png", imgSection);
    setActive("btn-section-transition", currentSection === SECTIONS.LAYER);
    setActive("btn-section-text", textSection);
    setActive("btn-section-footage", currentSection === SECTIONS.FOOTAGE);
    setActive("btn-section-effect", currentSection === SECTIONS.EFFECT);

    document.querySelectorAll(".sub-tab").forEach(function(tab) {
        tab.classList.toggle("active", tab.dataset.type === currentSection);
    });

    setDisplay("section-comp", currentSection === SECTIONS.COMP ? "flex" : "none");
    setDisplay("section-images", imgSection ? "flex" : "none");
    setDisplay("section-transition", currentSection === SECTIONS.LAYER ? "flex" : "none");
    setDisplay("section-text", textSection ? "flex" : "none");
    setDisplay("section-footage", currentSection === SECTIONS.FOOTAGE ? "flex" : "none");
    setDisplay("section-effect", currentSection === SECTIONS.EFFECT ? "flex" : "none");

    if (imgSection) setTimeout(forceIconGrid, 10);

    buildCategoryTabs();
    buildCategoryPanel();
    filterAndRender();
    updateCount();
}

function setActive(id, isActive) {
    var el = document.getElementById(id);
    if (el) el.classList.toggle("active", !!isActive);
}

function setDisplay(id, val) {
    var el = document.getElementById(id);
    if (el) el.style.display = val;
}

// ============================================================
// SAVE TYPE PICKER
// ============================================================

function setSaveType(type) {
    selectedSaveType = type;
    document.querySelectorAll(".save-type-btn").forEach(function(btn) {
        var btnType = btn.dataset.saveType;
        btn.classList.toggle("active", btnType === type || (btnType === SECTIONS.TEXT && type === SECTIONS.TEXT_PROPS));
    });
    rebuildSaveModalCategories(type);
}

function applyWallLogic() {
    if (!saveCapabilities) {
        document.querySelectorAll(".save-type-btn").forEach(function(btn) {
            btn.disabled = false;
            btn.style.opacity = "1";
            btn.style.cursor = "pointer";
        });
        return;
    }

    var caps = saveCapabilities;
    document.querySelectorAll(".save-type-btn").forEach(function(btn) {
        var btnType = btn.dataset.saveType;
        var enabled = false;

        if (btnType === "comp" && caps.comp) enabled = true;
        else if (btnType === "layer" && caps.layer) enabled = true;
        else if (btnType === "text" && caps.text) enabled = true;
        else if (btnType === "footage" && caps.footage) enabled = true;
        else if (btnType === "png" && caps.png) enabled = true;
        else if (btnType === "effect" && caps.effect) enabled = true;

        btn.disabled = !enabled;
        btn.style.opacity = enabled ? "1" : "0.3";
        btn.style.cursor = enabled ? "pointer" : "not-allowed";
    });
}

function rebuildSaveModalCategories(type) {
    var sectionType = getSaveSectionForType(type);
    var sectionTemplates = allTemplates.filter(function(t) {
        return getTemplateSection(t) === sectionType;
    });

    var cats = ["Uncategorized"];
    sectionTemplates.forEach(function(t) {
        if (t.category && t.category !== "All" && t.category !== "Favorites" && cats.indexOf(t.category) === -1) {
            cats.push(t.category);
        }
    });

    var prevValue = selectedCatValue || "Uncategorized";
    updateCustomSelect(cats);

    if (cats.indexOf(prevValue) !== -1) {
        selectedCatValue = prevValue;
        var valueSpan = document.getElementById("cat-select-value");
        if (valueSpan) valueSpan.textContent = prevValue;
        var hiddenSelect = document.getElementById("modal-cat-select");
        if (hiddenSelect) hiddenSelect.value = prevValue;
        var dropdown = document.getElementById("cat-select-dropdown");
        if (dropdown) dropdown.querySelectorAll(".custom-select-option").forEach(function(o) {
            o.classList.toggle("active", o.textContent === prevValue);
        });
    }

    var title = document.getElementById("save-modal-title");
    if (title) title.textContent = getSaveModalTitle(type);
}

function initSaveTypePicker() {
    document.querySelectorAll(".save-type-btn").forEach(function(btn) {
        btn.addEventListener("click", function(e) {
            e.stopPropagation();
            if (this.disabled) {
                showToast("This save type is locked. Selection doesn't match.", "error");
                return;
            }
            var chosenType = this.dataset.saveType;
            if (chosenType === SECTIONS.TEXT && currentSection === SECTIONS.TEXT_PROPS) chosenType = SECTIONS.TEXT_PROPS;
            setSaveType(chosenType);
        });
    });
}

// ============================================================
// CUSTOM SELECT
// ============================================================

function initCustomSelect() {
    var trigger = document.getElementById("cat-select-trigger");
    var wrapper = document.getElementById("cat-select-wrapper");
    if (!trigger || !wrapper) return;

    trigger.addEventListener("click", function(e) {
        e.stopPropagation();
        wrapper.classList.toggle("open");
        var mw = document.getElementById("move-cat-select-wrapper");
        if (mw) mw.classList.remove("open");
    });

    document.addEventListener("click", function(e) {
        if (wrapper && !wrapper.contains(e.target)) wrapper.classList.remove("open");
        var mw = document.getElementById("move-cat-select-wrapper");
        if (mw && !mw.contains(e.target)) mw.classList.remove("open");
    });
}

function updateCustomSelect(categories) {
    var dropdown = document.getElementById("cat-select-dropdown");
    var valueSpan = document.getElementById("cat-select-value");
    var hiddenSelect = document.getElementById("modal-cat-select");
    if (!dropdown || !valueSpan || !hiddenSelect) return;

    var cats = ["Uncategorized"].concat(categories.filter(function(c) {
        return c !== "All" && c !== "Favorites" && c !== "Uncategorized";
    }));

    dropdown.innerHTML = "";
    hiddenSelect.innerHTML = "";
    selectedCatValue = "Uncategorized";
    valueSpan.textContent = "Uncategorized";

    cats.forEach(function(cat) {
        var opt = document.createElement("div");
        opt.className = "custom-select-option" + (cat === selectedCatValue ? " active" : "");
        opt.textContent = cat;
        opt.addEventListener("click", function(e) {
            e.stopPropagation();
            selectedCatValue = cat;
            valueSpan.textContent = cat;
            dropdown.querySelectorAll(".custom-select-option").forEach(function(o) {
                o.classList.remove("active");
            });
            opt.classList.add("active");
            hiddenSelect.value = cat;
            var w = document.getElementById("cat-select-wrapper");
            if (w) w.classList.remove("open");
        });
        dropdown.appendChild(opt);

        var s = document.createElement("option");
        s.value = cat;
        s.textContent = cat;
        hiddenSelect.appendChild(s);
    });
}

// ============================================================
// MOVE SELECT
// ============================================================

function initMoveSelect() {
    var trigger = document.getElementById("move-cat-select-trigger");
    var wrapper = document.getElementById("move-cat-select-wrapper");
    if (!trigger || !wrapper) return;
    trigger.addEventListener("click", function(e) {
        e.stopPropagation();
        wrapper.classList.toggle("open");
    });
}

function updateMoveSelect(categories, currentCat) {
    var dropdown = document.getElementById("move-cat-select-dropdown");
    var valueSpan = document.getElementById("move-cat-select-value");
    if (!dropdown || !valueSpan) return;

    var cats = categories.filter(function(c) {
        return c !== currentCat && c !== "All" && c !== "Favorites";
    });

    dropdown.innerHTML = "";
    selectedMoveCat = cats.length > 0 ? cats[0] : "";
    valueSpan.textContent = selectedMoveCat || "No other categories";

    cats.forEach(function(cat) {
        var opt = document.createElement("div");
        opt.className = "custom-select-option" + (cat === selectedMoveCat ? " active" : "");
        opt.textContent = cat;
        opt.addEventListener("click", function(e) {
            e.stopPropagation();
            selectedMoveCat = cat;
            valueSpan.textContent = cat;
            dropdown.querySelectorAll(".custom-select-option").forEach(function(o) {
                o.classList.remove("active");
            });
            opt.classList.add("active");
            var w = document.getElementById("move-cat-select-wrapper");
            if (w) w.classList.remove("open");
        });
        dropdown.appendChild(opt);
    });
}

// ============================================================
// LIBRARY CONNECTION
// ============================================================

function connectLibraryToDocuments(callback) {
    csInterface.evalScript("encodeBridge(getDefaultRootPath())", function(hexPath) {
        rootPath = decodeBridge(hexPath).replace(/\\/g, "/");
        csInterface.evalScript('ensureFolder("' + encodeBridge(rootPath) + '")', function() {
            if (callback) callback();
        });
    });
}

// ============================================================
// INIT
// ============================================================

function init() {
    initCustomSelect();
    initMoveSelect();
    initSaveTypePicker();
    initToolkitNav();

    connectLibraryToDocuments(function() { loadTemplates(); });

    bindClick("btn-section-comp", function() { switchSection(SECTIONS.COMP); });
    bindClick("btn-section-png", function() { switchSection(currentImageSection); });
    bindClick("btn-section-transition", function() { switchSection(SECTIONS.LAYER); });
    bindClick("btn-section-text", function() { switchSection(currentTextSection || SECTIONS.TEXT_PROPS); });
    bindClick("btn-section-footage", function() { switchSection(SECTIONS.FOOTAGE); });
    bindClick("btn-section-effect", function() { switchSection(SECTIONS.EFFECT); });

    document.querySelectorAll(".sub-tab").forEach(function(tab) {
        tab.addEventListener("click", function() { switchSection(this.dataset.type); });
    });

    bindClick("btn-browse", function() {
        connectLibraryToDocuments(function() {
            loadTemplates();
            showToast("Library reconnected", "success");
        });
    });

    var refreshBtn = document.getElementById("btn-refresh");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", function() {
            var btn = this;
            btn.classList.add("spinning");
            setTimeout(function() {
                loadTemplates();
                btn.classList.remove("spinning");
                showToast("Refreshed", "success");
            }, 300);
        });
    }

    bindClick("btn-more-cats", function() {
        var panel = document.getElementById("cat-panel");
        if (!panel) return;
        panel.classList.toggle("open");
        if (panel.classList.contains("open")) { hideFooter(); blurGrid(); }
        else { showFooter(); unblurGrid(); }
    });

    bindClick("btn-close-cats", closeCatPanel);

    var sb = document.getElementById("search-box");
    if (sb) sb.addEventListener("input", filterAndRender);

    bindClick("btn-save-main", openSaveModal);
    bindClick("btn-cancel", closeSaveModal);
    bindClick("btn-confirm-save", confirmSave);

    var sm = document.getElementById("save-modal");
    if (sm) sm.addEventListener("click", function(e) { if (e.target === this) closeSaveModal(); });

    bindClick("btn-rename-cancel", closeRenameModal);
    bindClick("btn-rename-confirm", confirmRename);

    var rm = document.getElementById("rename-modal");
    if (rm) rm.addEventListener("click", function(e) { if (e.target === this) closeRenameModal(); });

    var ri = document.getElementById("rename-input");
    if (ri) ri.addEventListener("keydown", function(e) {
        if (e.key === "Enter") confirmRename();
        if (e.key === "Escape") closeRenameModal();
    });

    bindClick("btn-move-cancel", closeMoveModal);
    bindClick("btn-move-confirm", confirmMove);

    var mm = document.getElementById("move-modal");
    if (mm) mm.addEventListener("click", function(e) { if (e.target === this) closeMoveModal(); });

    document.addEventListener("click", function(e) {
        var panel = document.getElementById("cat-panel");
        var moreBtn = document.getElementById("btn-more-cats");
        if (panel && moreBtn && !panel.contains(e.target) && !moreBtn.contains(e.target) && panel.classList.contains("open")) {
            closeCatPanel();
        }
    });

    document.addEventListener("keydown", function(e) {
        if (e.key === "Escape") {
            closeSaveModal();
            closeRenameModal();
            closeMoveModal();
            closeCatPanel();
            document.querySelectorAll(".icon-more-popup").forEach(function(p) { p.remove(); });
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "f") {
            e.preventDefault();
            if (currentMainModule !== MODULES.TEMPLATES) return;
            var s = document.getElementById("search-box");
            if (s) { s.focus(); s.select(); }
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "s") {
            e.preventDefault();
            if (currentMainModule !== MODULES.TEMPLATES) return;
            openSaveModal();
        }
    });
}

function bindClick(id, fn) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("click", fn);
}

function initToolkitNav() {
    bindClick("btn-main-toolkit", function() { switchMainModule(MODULES.TOOLKIT); });
    bindClick("btn-main-templates", function() { switchMainModule(MODULES.TEMPLATES); });

    document.querySelectorAll(".toolkit-tab").forEach(function(tab) {
        tab.addEventListener("click", function() {
            switchToolkitSection(this.dataset.toolkitSection || "home");
        });
    });

    document.querySelectorAll(".toolkit-action").forEach(function(btn) {
        btn.addEventListener("click", function() {
            runToolkitAction(this.dataset.toolkitAction, this.dataset.mode || "", this);
        });
    });
}

function runToolkitAction(action, mode, btn) {
    var jsx = "";
    if (action === "anchor") jsx = 'toolkitAnchorPoint("' + encodeBridge(mode) + '")';
    else if (action === "align") jsx = 'toolkitAlignLayers("' + encodeBridge(mode) + '")';
    else if (action === "create") jsx = 'toolkitCreateLayer("' + encodeBridge(mode) + '")';
    else if (action === "organize") jsx = "toolkitOrganizeProject()";
    else if (action === "effects") jsx = "toolkitToggleEffects()";
    else if (action === "precompose") jsx = "toolkitPrecompose()";
    else if (action === "unprecompose") jsx = "toolkitUnprecompose()";
    else if (action === "cache") jsx = "toolkitClearCache()";
    if (!jsx) return;

    if (btn) btn.disabled = true;
    csInterface.evalScript(jsx, function(hexResult) {
        if (btn) btn.disabled = false;
        var result = decodeBridge(hexResult);
        if (!result || result === "true") {
            showToast("Done", "success");
        } else if (result.indexOf("OK:") === 0) {
            showToast(result.substr(3), "success");
        } else {
            showToast("Toolkit failed", "error");
            alert(result);
        }
    });
}

// ============================================================
// LOAD TEMPLATES
// ============================================================

function loadTemplates() {
    csInterface.evalScript('getAllTemplates("' + encodeBridge(rootPath) + '")', function(hexData) {
        var data = decodeBridge(hexData);
        try {
            allTemplates = JSON.parse(data || "[]");
        } catch (e) {
            allTemplates = [];
            showToast("Failed to load library", "error");
            console.error("[CompSaver]", e, data);
        }
        allTemplates.forEach(function(t) { t.section = getTemplateSection(t); });
        buildCategoryTabs();
        buildCategoryPanel();
        filterAndRender();
        updateCount();
    });
}

// ============================================================
// CATEGORY TABS
// ============================================================

function getSectionTemplates() {
    return allTemplates.filter(function(t) {
        return getTemplateSection(t) === currentSection;
    });
}

function getSectionCategories(sectionTemplates) {
    var cats = ["All", "Favorites"];
    sectionTemplates.forEach(function(t) {
        if (t.category && cats.indexOf(t.category) === -1) cats.push(t.category);
    });
    return cats;
}

function buildCategoryTabs() {
    var sectionTemplates = getSectionTemplates();
    var cats = getSectionCategories(sectionTemplates);
    updateCustomSelect(cats);

    var tabsArea = document.getElementById("category-tabs");
    if (!tabsArea) return;
    tabsArea.innerHTML = "";

    var quickCats = ["All", "Favorites"];
    if (currentCategory !== "All" && currentCategory !== "Favorites" && cats.indexOf(currentCategory) !== -1) {
        quickCats.push(currentCategory);
    }

    quickCats.forEach(function(cat) {
        var btn = document.createElement("button");
        btn.className = "cat-pill" + (cat === currentCategory ? " active" : "");
        btn.dataset.cat = cat;
        btn.textContent = cat === "Favorites" ? "★ Fav" : cat;
        btn.addEventListener("click", function() {
            setCategory(cat);
            closeCatPanel();
            setTimeout(function() {
                var active = tabsArea.querySelector(".cat-pill.active");
                if (active) active.scrollIntoView({behavior:"smooth", block:"nearest", inline:"center"});
            }, 50);
        });
        tabsArea.appendChild(btn);
    });
}

function buildCategoryPanel() {
    var sectionTemplates = getSectionTemplates();
    var cats = getSectionCategories(sectionTemplates);
    var list = document.getElementById("cat-panel-list");
    if (!list) return;
    list.innerHTML = "";

    cats.forEach(function(cat) {
        var count = cat === "All" ? sectionTemplates.length :
            cat === "Favorites" ? sectionTemplates.filter(function(t){return t.favorite;}).length :
            sectionTemplates.filter(function(t){return t.category === cat;}).length;

        var item = document.createElement("div");
        item.className = "cat-panel-item" + (currentCategory === cat ? " active" : "");
        item.dataset.cat = cat;
        item.innerHTML = (cat === "Favorites" ? "★ " : "") + escapeHTML(cat) +
            '<span class="cat-count">' + count + "</span>";
        item.addEventListener("click", function() { setCategory(cat); closeCatPanel(); });
        list.appendChild(item);
    });
}

function setCategory(cat) {
    currentCategory = cat;
    buildCategoryTabs();
    buildCategoryPanel();
    filterAndRender();
}

// ============================================================
// FILTER & RENDER
// ============================================================

function filterAndRender() {
    var sb = document.getElementById("search-box");
    var sv = sb ? sb.value.toLowerCase().trim() : "";

    var filtered = getSectionTemplates().filter(function(t) {
        if (currentCategory === "Favorites" && !t.favorite) return false;
        if (currentCategory !== "All" && currentCategory !== "Favorites" && t.category !== currentCategory) return false;
        if (sv) {
            var hay = [t.name||"", t.category||"", t.type||"", t.section||"", t.dim||""].join(" ").toLowerCase();
            if (hay.indexOf(sv) === -1) return false;
        }
        return true;
    });

    if (isImageSection(currentSection)) renderIcons(filtered);
    else renderCards(filtered);
}

// ============================================================
// RENDER ICONS
// ============================================================

function renderIcons(icons) {
    var grid = document.getElementById("icon-list-container");
    if (!grid) return;
    forceIconGrid();

    if (icons.length === 0) {
        var sb = document.getElementById("search-box");
        var isS = sb && sb.value.trim();
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:30px 10px;">' +
            '<p style="color:rgba(255,255,255,0.25);font-size:11px;margin:0 0 4px;font-weight:500;">' +
            (isS ? "No assets found" : "No assets yet") + '</p>' +
            '<p style="color:rgba(168,85,247,0.35);font-size:9px;margin:0;">' +
            (isS ? "Try different search" : "Select image in AE & save") + '</p></div>';
        return;
    }

    var html = "";
    icons.forEach(function(t) {
        var thumbSrc = t.thumbnail ? t.thumbnail.replace(/\\/g, "/") : "";
        var isFav = t.favorite;
        var favFill = isFav ? "#fbbf24" : "none";
        var favStroke = isFav ? "#fbbf24" : "rgba(255,255,255,0.5)";
        var starActive = isFav ? " ia-active" : "";

        html += '<div class="icon-card" data-file="' + escapeAttr(t.name) + '" data-cat="' + escapeAttr(t.category) +
            '" data-folder="' + escapeAttr((t.folderPath||"").replace(/\\/g, "/")) +
            '" data-thumb="' + escapeAttr(thumbSrc) + '">';
        html += '<button class="ic-btn ic-more"><svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg></button>';
        html += '<button class="ic-btn ic-star' + starActive + '"><svg viewBox="0 0 24 24" fill="' + favFill + '" stroke="' + favStroke + '" stroke-width="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></button>';
        html += '<div class="icon-thumb">';
        if (thumbSrc) html += '<img src="' + escapeAttr(thumbSrc) + '" alt="" loading="lazy">';
        else html += '<svg viewBox="0 0 24 24" fill="none" stroke="rgba(168,85,247,0.3)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/></svg>';
        html += '</div>';
        html += '<div class="icon-card-footer"><div class="icon-name" title="' + escapeAttr(t.name) + '">' + escapeHTML(t.name) + '</div>';
        html += '<button class="ic-btn-import-small"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="8 12 12 16 16 12"/><line x1="12" y1="16" x2="12" y2="4"/><path d="M20 18v2H4v-2"/></svg></button></div>';
        html += '</div>';
    });

    grid.innerHTML = html;
    attachIconEvents();
}

// ============================================================
// RENDER CARDS
// ============================================================

function renderCards(templates) {
    var gridId = "comp-list-container";
    if (currentSection === SECTIONS.LAYER) gridId = "transition-list-container";
    else if (isTextSection(currentSection)) gridId = "text-list-container";
    else if (currentSection === SECTIONS.FOOTAGE) gridId = "footage-list-container";
    else if (currentSection === SECTIONS.EFFECT) gridId = "effect-list-container";

    var grid = document.getElementById(gridId);
    if (!grid) return;

    if (templates.length === 0) {
        var sb = document.getElementById("search-box");
        var isS = sb && sb.value.trim();
        var hint = "Press Ctrl+S to save one";
        if (currentSection === SECTIONS.COMP) hint = "Open or select a comp & save";
        else if (currentSection === SECTIONS.TEXT_PROPS) hint = "Select one text layer & save properties";
        else if (currentSection === SECTIONS.TEXT) hint = "Select text layer(s) & save";
        else if (currentSection === SECTIONS.FOOTAGE) hint = "Select footage layer(s) & save";
        else if (currentSection === SECTIONS.EFFECT) hint = "Select layer or effect(s) & save";
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:30px 10px;">' +
            '<p style="color:rgba(255,255,255,0.25);font-size:11px;margin:0 0 4px;font-weight:500;">' +
            (isS ? "No results found" : "No templates yet") + '</p>' +
            '<p style="color:rgba(168,85,247,0.35);font-size:9px;margin:0;">' +
            (isS ? "Try a different search" : hint) + '</p></div>';
        return;
    }

    var html = "";
    templates.forEach(function(t) {
        var favFill = t.favorite ? "#fbbf24" : "none";
        var favStroke = t.favorite ? "#fbbf24" : "rgba(255,255,255,0.35)";
        var favClass = t.favorite ? "btn-favorite active" : "btn-favorite";
        var thumbSrc = t.thumbnail ? t.thumbnail.replace(/\\/g, "/") : "";

        html += '<div class="card" data-file="' + escapeAttr(t.name) + '" data-cat="' + escapeAttr(t.category) +
            '" data-folder="' + escapeAttr((t.folderPath||"").replace(/\\/g, "/")) +
            '" data-thumb="' + escapeAttr(thumbSrc) + '">';
        html += '<div class="thumb-box">';
        if (thumbSrc) html += '<img class="thumb-img" src="' + escapeAttr(thumbSrc) + '" alt="" loading="lazy">';
        else {
            if (currentSection === SECTIONS.EFFECT) {
                html += '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(168,85,247,0.4)" stroke-width="1.5" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>';
            } else {
                html += '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(168,85,247,0.15)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/></svg>';
            }
        }
        html += '</div>';
        html += '<div class="card-name" title="' + escapeAttr(t.name) + '">' + escapeHTML(t.name) + '</div>';
        html += '<div class="card-actions">';
        html += '<button class="btn-icon btn-delete"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2.2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg></button>';
        html += '<button class="btn-icon btn-rename"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2.2"><path d="M17 3a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L17 3z"/></svg></button>';
        html += '<div class="action-divider"></div>';
        html += '<button class="btn-icon btn-move"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" stroke-width="2.2"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button>';
        html += '<button class="btn-icon btn-import"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6ee7b7" stroke-width="2.2"><polyline points="8 12 12 16 16 12"/><line x1="12" y1="16" x2="12" y2="4"/><path d="M20 18v2H4v-2"/></svg></button>';
        html += '</div>';
        html += '<button class="' + favClass + '"><svg width="9" height="9" viewBox="0 0 24 24" fill="' + favFill + '" stroke="' + favStroke + '" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></button>';
        html += '</div>';
    });

    grid.innerHTML = html;
    attachCardEvents();
}

// ============================================================
// EVENTS
// ============================================================

function attachIconEvents() {
    document.querySelectorAll(".icon-card").forEach(function(card) {
        card.addEventListener("dblclick", function(e) {
            if (e.target.closest("button")) return;
            importCurrentCardToTimeline(card);
        });
        card.addEventListener("contextmenu", function(e) { e.preventDefault(); });
    });
    document.querySelectorAll(".icon-card .ic-more").forEach(function(btn) {
        btn.addEventListener("click", function(e) {
            e.stopPropagation();
            var rect = this.getBoundingClientRect();
            openIconRightClickPopup(this.closest(".icon-card"), rect.left, rect.bottom);
        });
    });
    document.querySelectorAll(".icon-card .ic-star").forEach(function(btn) {
        btn.addEventListener("click", function(e) {
            e.stopPropagation();
            toggleFavorite(this.closest(".icon-card"));
        });
    });
    document.querySelectorAll(".icon-card .ic-btn-import-small").forEach(function(btn) {
        btn.addEventListener("click", function(e) {
            e.stopPropagation();
            importCurrentCardToTimeline(this.closest(".icon-card"));
        });
    });
}

function attachCardEvents() {
    document.querySelectorAll(".card").forEach(function(card) {
        card.addEventListener("dblclick", function(e) {
            if (e.target.closest(".btn-icon") || e.target.closest(".btn-favorite")) return;
            importCurrentCardToTimeline(this);
        });
    });
    document.querySelectorAll(".card .btn-import").forEach(function(btn) {
        btn.addEventListener("click", function(e) { e.stopPropagation(); importCurrentCardToTimeline(this.closest(".card")); });
    });
    document.querySelectorAll(".card .btn-delete").forEach(function(btn) {
        btn.addEventListener("click", function(e) {
            e.stopPropagation();
            var c = this.closest(".card");
            deleteTemplate(c.dataset.file, c.dataset.cat);
        });
    });
    document.querySelectorAll(".card .btn-rename").forEach(function(btn) {
        btn.addEventListener("click", function(e) { e.stopPropagation(); openRenameModal(this.closest(".card")); });
    });
    document.querySelectorAll(".card .btn-move").forEach(function(btn) {
        btn.addEventListener("click", function(e) { e.stopPropagation(); openMoveModal(this.closest(".card")); });
    });
    document.querySelectorAll(".card .btn-favorite").forEach(function(btn) {
        btn.addEventListener("click", function(e) { e.stopPropagation(); toggleFavorite(this.closest(".card")); });
    });
}

// ============================================================
// SHARED ACTIONS
// ============================================================

function toggleFavorite(card) {
    if (!card) return;
    csInterface.evalScript(
        'toggleFavTemplate("' + encodeBridge(card.dataset.file) + '","' + encodeBridge(card.dataset.cat) + '","' + encodeBridge(rootPath) + '")',
        function() { setTimeout(loadTemplates, 300); }
    );
}

function deleteTemplate(name, cat) {
    if (!confirm("Delete: " + name + "?")) return;
    csInterface.evalScript(
        'deleteTemplate("' + encodeBridge(name) + '","' + encodeBridge(cat) + '","' + encodeBridge(rootPath) + '")',
        function() {
            showToast("Deleted", "error");
            setTimeout(loadTemplates, 300);
        }
    );
}

// ============================================================
// IMPORT
// ============================================================

function importCurrentCardToTimeline(card) {
    if (!card) return;
    var jsxFunc = "importImageDirect";
    if (currentSection === SECTIONS.COMP) jsxFunc = "importCompDirect";
    else if (currentSection === SECTIONS.LAYER) jsxFunc = "importLayer";
    else if (currentSection === SECTIONS.TEXT) jsxFunc = "importText";
    else if (currentSection === SECTIONS.TEXT_PROPS) jsxFunc = "importTextProperties";
    else if (currentSection === SECTIONS.FOOTAGE) jsxFunc = "importFootage";
    else if (currentSection === SECTIONS.EFFECT) jsxFunc = "importEffect";

    csInterface.evalScript(
        jsxFunc + '("' + encodeBridge(card.dataset.file) + '","' + encodeBridge(card.dataset.cat) + '","' + encodeBridge(rootPath) + '")',
        function(hexResult) {
            var result = decodeBridge(hexResult);
            if (result === "true" || result === "") {
                card.classList.add("imported");
                setTimeout(function() { card.classList.remove("imported"); }, 600);
                if (currentSection === SECTIONS.TEXT_PROPS) {
                    showToast("Applied to text", "success");
                } else if (currentSection === SECTIONS.EFFECT) {
                    showToast("✓ Effect applied", "success");
                } else {
                    showToast("✓ Imported to timeline", "success");
                }
            } else {
                showToast("Import failed", "error");
                console.error("[CompSaver] Import:", result);
                alert("Import Error:\n\n" + result);
            }
        }
    );
}

// ============================================================
// RIGHT CLICK POPUP
// ============================================================

function openIconRightClickPopup(card, clientX, clientY) {
    document.querySelectorAll(".icon-more-popup").forEach(function(p) { p.remove(); });

    var popup = document.createElement("div");
    popup.className = "icon-more-popup open";
    popup.innerHTML =
        '<div class="icon-more-item" data-action="rename">Rename</div>' +
        '<div class="icon-more-item" data-action="move">Move to...</div>' +
        '<div class="icon-more-item danger" data-action="delete">Delete</div>';

    var popupW = 110, popupH = 110;
    var left = clientX + 4, top = clientY + 4;
    if (left + popupW > window.innerWidth - 4) left = clientX - popupW - 4;
    if (top + popupH > window.innerHeight - 4) top = clientY - popupH - 4;
    if (left < 4) left = 4;
    if (top < 4) top = 4;

    popup.style.cssText = "position:fixed;width:" + popupW + "px;left:" + left + "px;top:" + top + "px;z-index:9999;";
    document.body.appendChild(popup);

    popup.querySelector('[data-action="rename"]').addEventListener("click", function() { popup.remove(); openRenameModal(card); });
    popup.querySelector('[data-action="move"]').addEventListener("click", function() { popup.remove(); openMoveModal(card); });
    popup.querySelector('[data-action="delete"]').addEventListener("click", function() { popup.remove(); deleteTemplate(card.dataset.file, card.dataset.cat); });

    setTimeout(function() {
        var closer = function(e) {
            if (!popup.contains(e.target)) {
                popup.remove();
                document.removeEventListener("mousedown", closer);
            }
        };
        document.addEventListener("mousedown", closer);
    }, 10);
}

// ============================================================
// RENAME / MOVE
// ============================================================

function openRenameModal(card) {
    renameTargetCard = card;
    var input = document.getElementById("rename-input");
    if (!input) return;
    input.value = card.dataset.file;
    var modal = document.getElementById("rename-modal");
    if (modal) modal.style.display = "flex";
    setTimeout(function() { input.focus(); input.select(); }, 100);
}

function closeRenameModal() {
    var modal = document.getElementById("rename-modal");
    if (modal) modal.style.display = "none";
    var input = document.getElementById("rename-input");
    if (input) input.value = "";
    renameTargetCard = null;
}

function confirmRename() {
    if (!renameTargetCard) return;
    var newName = (document.getElementById("rename-input").value || "").trim();
    var oldName = renameTargetCard.dataset.file;
    var cat = renameTargetCard.dataset.cat;
    if (!newName || newName === oldName) { closeRenameModal(); return; }
    closeRenameModal();
    csInterface.evalScript(
        'renameTemplatePath("' + encodeBridge(oldName) + '","' + encodeBridge(newName) + '","' + encodeBridge(cat) + '","' + encodeBridge(rootPath) + '")',
        function() { showToast("✓ Renamed", "success"); setTimeout(loadTemplates, 300); }
    );
}

function openMoveModal(card) {
    moveTargetCard = card;
    var cats = [];
    getSectionTemplates().forEach(function(t) {
        if (t.category && cats.indexOf(t.category) === -1) cats.push(t.category);
    });
    updateMoveSelect(cats, card.dataset.cat);
    var modal = document.getElementById("move-modal");
    if (modal) modal.style.display = "flex";
}

function closeMoveModal() {
    var modal = document.getElementById("move-modal");
    if (modal) modal.style.display = "none";
    var w = document.getElementById("move-cat-select-wrapper");
    if (w) w.classList.remove("open");
    moveTargetCard = null;
    selectedMoveCat = "";
}

function confirmMove() {
    if (!moveTargetCard || !selectedMoveCat) { closeMoveModal(); return; }
    var name = moveTargetCard.dataset.file;
    var oldCat = moveTargetCard.dataset.cat;
    var newCat = selectedMoveCat;
    closeMoveModal();
    csInterface.evalScript(
        'moveTemplatePath("' + encodeBridge(name) + '","' + encodeBridge(oldCat) + '","' + encodeBridge(newCat) + '","' + encodeBridge(rootPath) + '")',
        function() { showToast("→ Moved to " + newCat, "info"); setTimeout(loadTemplates, 300); }
    );
}

// ============================================================
// SAVE MODAL
// ============================================================

function openSaveModal() {
    if (currentMainModule !== MODULES.TEMPLATES) return;
    var nameInput = document.getElementById("input-name");
    if (!nameInput) return;
    nameInput.value = "";

    selectedCatValue = (currentCategory !== "All" && currentCategory !== "Favorites") ? currentCategory : "Uncategorized";

    var newCatInput = document.getElementById("input-new-cat");
    if (newCatInput) newCatInput.value = "";

    var destInfo = document.getElementById("save-dest-info");
    if (destInfo) destInfo.textContent = "Detecting selection...";

    document.querySelectorAll(".save-type-btn").forEach(function(btn) {
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.classList.remove("active");
    });

    var modal = document.getElementById("save-modal");
    if (modal) modal.style.display = "flex";

    detectedSaveType = "";
    saveCapabilities = null;
    selectedSaveType = SECTIONS.COMP;

    // Get full capabilities
    csInterface.evalScript("getSaveCapabilities()", function(hexResult) {
        var json = decodeBridge(hexResult);
        var caps = null;

        try {
            caps = JSON.parse(json);
        } catch (e) {
            console.error("[CompSaver] Caps parse error:", e, json);
        }

        if (!caps || caps.primary === "error") {
            var errMsg = (caps && caps.message) ? caps.message : "Detection failed.";
            if (destInfo) destInfo.textContent = errMsg;
            showToast("⚠ " + errMsg, "error");
            document.querySelectorAll(".save-type-btn").forEach(function(btn) {
                btn.disabled = true;
                btn.style.opacity = "0.3";
                btn.style.cursor = "not-allowed";
            });
            return;
        }

        saveCapabilities = caps;
        detectedSaveType = caps.primary;

        if (destInfo) destInfo.textContent = caps.message || rootPath;

        // Apply wall — enable only allowed types
        applyWallLogic();

        // Auto-select primary type. Text section has two save modes.
        var autoType = caps.primary;
        if (caps.primary === SECTIONS.TEXT && currentSection === SECTIONS.TEXT_PROPS) autoType = SECTIONS.TEXT_PROPS;
        setSaveType(autoType);

        // Auto-fill name
        if (caps.suggestedName && !nameInput.value) {
            nameInput.value = caps.suggestedName;
        }

        setTimeout(function() { nameInput.focus(); nameInput.select(); }, 100);
    });
}

function closeSaveModal() {
    var modal = document.getElementById("save-modal");
    if (modal) modal.style.display = "none";
    var n = document.getElementById("input-name");
    if (n) n.value = "";
    var nc = document.getElementById("input-new-cat");
    if (nc) nc.value = "";
    var w = document.getElementById("cat-select-wrapper");
    if (w) w.classList.remove("open");
    detectedSaveType = "";
    saveCapabilities = null;
}

function confirmSave() {
    var name = (document.getElementById("input-name").value || "").trim();
    var newCat = (document.getElementById("input-new-cat").value || "").trim();
    var cat = newCat || selectedCatValue || "Uncategorized";

    if (!name) { alert("Please enter a name!"); return; }

    var saveBtn = document.getElementById("btn-confirm-save");
    if (!saveBtn) return;

    var saveType = selectedSaveType;
    if (!saveType) {
        alert("No save type selected. Please select layers in After Effects first.");
        return;
    }

    var jsxFunc = "";
    var typeArg = "";

    if (saveType === SECTIONS.COMP) jsxFunc = "saveActiveComp";
    else if (saveType === SECTIONS.LAYER) jsxFunc = "saveActiveLayer";
    else if (saveType === SECTIONS.TEXT) jsxFunc = "saveActiveText";
    else if (saveType === SECTIONS.TEXT_PROPS) jsxFunc = "saveActiveTextProperties";
    else if (saveType === SECTIONS.FOOTAGE) jsxFunc = "saveActiveFootage";
    else if (saveType === SECTIONS.EFFECT) jsxFunc = "saveActiveEffect";
    else if (saveType === "png") {
        jsxFunc = "savePNGOnly";
        typeArg = ',"' + encodeBridge(currentImageSection || SECTIONS.ICON) + '"';
    } else {
        alert("Invalid save type: " + saveType);
        return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Checking...";

    csInterface.evalScript('validateSaveRequest("' + encodeBridge(saveType) + '")', function(validationHex) {
        var validation = decodeBridge(validationHex);

        if (!validation) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save";
            alert("Cannot communicate with After Effects. Try again.");
            return;
        }

        if (validation !== "true") {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save";
            alert(validation);
            return;
        }

        var nHex = encodeBridge(name);
        var cHex = encodeBridge(cat);
        var rHex = encodeBridge(rootPath);

        csInterface.evalScript('itemExists("' + nHex + '","' + cHex + '","' + rHex + '")', function(existsHex) {
            var exists = decodeBridge(existsHex) === "true";

            if (exists) {
                var ok = confirm('"' + name + '" already exists in "' + cat + '". Overwrite?');
                if (!ok) {
                    saveBtn.disabled = false;
                    saveBtn.textContent = "Save";
                    return;
                }
            }

            closeSaveModal();
            saveBtn.textContent = "Saving...";

            var runSave = function() {
                csInterface.evalScript(
                    jsxFunc + '("' + nHex + '","' + cHex + '","' + rHex + '"' + typeArg + ")",
                    function(hexResult) {
                        var result = decodeBridge(hexResult);
                        saveBtn.disabled = false;
                        saveBtn.textContent = "Save";

                        if (result === "true") {
                            showToast("✓ Saved " + getSaveTypeLabel(saveType), "success");
                            var loadDelay = (saveType === "png" || saveType === "effect") ? 500 : 3000;
                            setTimeout(loadTemplates, loadDelay);
                        } else {
                            showToast("Save failed", "error");
                            console.error("[CompSaver] Save:", result);
                            alert("Save Error:\n\n" + (result || "Unknown error"));
                        }
                    }
                );
            };

            if (exists) {
                csInterface.evalScript('deleteTemplate("' + nHex + '","' + cHex + '","' + rHex + '")', function() { runSave(); });
            } else {
                runSave();
            }
        });
    });
}

// ============================================================
// RESIZE
// ============================================================

function windowResizeFix() {
    if (isImageSection(currentSection)) forceIconGrid();
}

// ============================================================
// ENTRY
// ============================================================

window.onload = function() {
    init();
    if (window.ResizeObserver) {
        var ro = new ResizeObserver(windowResizeFix);
        ro.observe(document.body);
    } else {
        window.addEventListener("resize", windowResizeFix);
    }
};
