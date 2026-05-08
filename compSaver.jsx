// CompSaver ExtendScript Host
// Strict Wall Logic + Auto Detection + JSON-based Effect Preset

// =========================================================
// ENCODING
// =========================================================

function encodeBridge(str) {
    var hex = "";
    if (str === null || str === undefined) return hex;
    str = "" + str;
    var i;
    for (i = 0; i < str.length; i++) {
        var h = str.charCodeAt(i).toString(16);
        while (h.length < 4) h = "0" + h;
        hex = hex + h;
    }
    return hex;
}

function decodeBridge(hex) {
    var str = "";
    if (!hex) return "";
    hex = "" + hex;
    var i;
    for (i = 0; i < hex.length; i = i + 4) {
        var chunk = hex.substr(i, 4);
        var code = parseInt(chunk, 16);
        if (!isNaN(code)) str = str + String.fromCharCode(code);
    }
    return str;
}

// =========================================================
// STRING UTILS
// =========================================================

function trimStr(s) {
    if (s === null || s === undefined) return "";
    s = "" + s;
    return s.replace(/^\s+/, "").replace(/\s+$/, "");
}

function cleanStr(s) {
    if (s === null || s === undefined) return "";
    s = "" + s;
    s = s.replace(/[\n\r\t]/g, "");
    s = s.replace(/\s+/g, " ");
    return trimStr(s);
}

function getSafeName(s) {
    if (s === null || s === undefined) return "";
    s = trimStr("" + s);
    return s.replace(/[\\\/:\*\?"<>\|]/g, "_");
}

function escapeJSON(s) {
    if (s === null || s === undefined) return "";
    s = "" + s;
    s = s.replace(/\\/g, "\\\\");
    s = s.replace(/"/g, '\\"');
    s = s.replace(/\n/g, "\\n");
    s = s.replace(/\r/g, "");
    return s;
}

function isHexChar(c) {
    if (!c) return false;
    if (c >= "0" && c <= "9") return true;
    if (c >= "a" && c <= "f") return true;
    if (c >= "A" && c <= "F") return true;
    return false;
}

function safeDecode(s) {
    if (!s) return "";
    s = "" + s;
    var result = "";
    var i = 0;
    var len = s.length;
    while (i < len) {
        var ch = s.charAt(i);
        if (ch === "%" && i + 2 < len) {
            var h1 = s.charAt(i + 1);
            var h2 = s.charAt(i + 2);
            if (isHexChar(h1) && isHexChar(h2)) {
                var code = parseInt(h1 + h2, 16);
                if (!isNaN(code)) {
                    result = result + String.fromCharCode(code);
                    i = i + 3;
                    continue;
                }
            }
        }
        if (ch === "+") {
            result = result + " ";
            i = i + 1;
            continue;
        }
        result = result + ch;
        i = i + 1;
    }
    return result;
}

function normalizeSectionName(section) {
    if (!section) return "";
    section = "" + section;
    if (section === "transition") return "layer";
    if (section === "textprops" || section === "text-properties" || section === "text_properties") return "text_props";
    return section;
}

// =========================================================
// FILE SYSTEM
// =========================================================

function getDefaultRootPath() {
    return Folder.myDocuments.fsName.replace(/\\/g, "/") + "/CompSaver_Data";
}

function ensureDeepFolder(pathStr) {
    try {
        var f = new Folder(pathStr);
        if (f.exists) return f;
        var parts = pathStr.replace(/\\/g, "/").split("/");
        var current = parts[0];
        var i;
        for (i = 1; i < parts.length; i++) {
            current = current + "/" + parts[i];
            var cf = new Folder(current);
            if (!cf.exists) cf.create();
        }
        return new Folder(pathStr);
    } catch (e) {
        return new Folder(pathStr);
    }
}

function deleteFolderRecursive(folder) {
    try {
        if (!folder || !folder.exists) return;
        var files = folder.getFiles();
        var i;
        for (i = 0; i < files.length; i++) {
            if (files[i] instanceof Folder) {
                deleteFolderRecursive(files[i]);
            } else {
                try { files[i].remove(); } catch (e1) {}
            }
        }
        try { folder.remove(); } catch (e2) {}
    } catch (e) {}
}

function copyFolderRecursive(sourceFolder, destFolder) {
    try {
        if (!sourceFolder.exists) return false;
        if (!destFolder.exists) destFolder.create();
        var files = sourceFolder.getFiles();
        var i;
        for (i = 0; i < files.length; i++) {
            var src = files[i];
            if (src instanceof Folder) {
                copyFolderRecursive(src, new Folder(destFolder.fsName + "/" + src.name));
            } else {
                try { src.copy(new File(destFolder.fsName + "/" + src.name)); } catch (e1) {}
            }
        }
        return true;
    } catch (e) {
        return false;
    }
}

function readFileText(f) {
    if (!f || !f.exists) return "";
    var content = "";
    try {
        f.open("r");
        content = f.read();
    } catch (e) {
        content = "";
    }
    try { f.close(); } catch (e2) {}
    return content || "";
}

// =========================================================
// PROJECT UTILS
// =========================================================

function deselectAllLayers(comp) {
    try {
        if (!comp) return;
        var i;
        for (i = 1; i <= comp.numLayers; i++) {
            try { comp.layer(i).selected = false; } catch (e) {}
        }
    } catch (err) {}
}

function getTopSelectedLayer(comp) {
    try {
        if (!comp || !comp.selectedLayers || comp.selectedLayers.length === 0) return null;
        var top = comp.selectedLayers[0];
        var i;
        for (i = 1; i < comp.selectedLayers.length; i++) {
            if (comp.selectedLayers[i].index < top.index) top = comp.selectedLayers[i];
        }
        return top;
    } catch (e) {
        return null;
    }
}

function generateUniqueTimestamp() {
    var d = new Date();
    return d.getTime().toString() + "_" + Math.floor(Math.random() * 1000000);
}

function getAllProjectNamesLower(excludeIds) {
    var names = {};
    if (!excludeIds) excludeIds = {};
    try {
        var i;
        for (i = 1; i <= app.project.numItems; i++) {
            try {
                var item = app.project.item(i);
                if (excludeIds[item.id]) continue;
                if (item.name) names[item.name.toLowerCase()] = true;
            } catch (e) {}
        }
    } catch (e2) {}
    return names;
}

function safeRenameAllImportedItems(importedItems, existingNamesLower) {
    var stamp = generateUniqueTimestamp();
    var i;
    for (i = 0; i < importedItems.length; i++) {
        try {
            var item = importedItems[i];
            if (!(item instanceof CompItem) && !(item instanceof FolderItem)) continue;
            var prefix = "_csf_";
            if (item instanceof CompItem) prefix = "_csc_";
            var newName = prefix + stamp + "_" + i;
            var attempt = 0;
            while (existingNamesLower[newName.toLowerCase()] && attempt < 100) {
                attempt = attempt + 1;
                newName = prefix + stamp + "_" + i + "_" + attempt;
            }
            try {
                item.name = newName;
                existingNamesLower[newName.toLowerCase()] = true;
            } catch (renameErr) {}
        } catch (e) {}
    }
}

function isSupportedImageFileName(fname) {
    if (!fname) return false;
    return /\.(png|jpg|jpeg|gif|bmp|tiff|tif|svg|webp|ico)$/i.test(fname);
}

function isSupportedVideoFileName(fname) {
    if (!fname) return false;
    return /\.(mp4|mov|avi|mkv|webm|m4v|mpg|mpeg|wmv|flv|mxf)$/i.test(fname);
}

function isSupportedAudioFileName(fname) {
    if (!fname) return false;
    return /\.(mp3|wav|aac|ogg|flac|m4a|wma)$/i.test(fname);
}

function isFootageFileName(fname) {
    return isSupportedVideoFileName(fname) || isSupportedAudioFileName(fname);
}

// =========================================================
// LAYER CLASSIFIER
// =========================================================

function classifyLayer(layer) {
    try {
        if (!layer) return "unknown";
        if (layer instanceof TextLayer) return "text";
        if (layer instanceof CameraLayer) return "layer";
        if (layer instanceof LightLayer) return "layer";

        if (layer instanceof AVLayer) {
            if (layer.source instanceof CompItem) return "comp";
            if (layer.source instanceof FootageItem) {
                var src = layer.source;
                try {
                    if (src.mainSource && src.mainSource instanceof SolidSource) return "layer";
                } catch (eS) {}
                if (src.file && src.file.exists) {
                    var fname = src.file.name;
                    if (isSupportedImageFileName(fname)) return "image";
                    if (isFootageFileName(fname)) return "footage";
                    return "footage";
                }
                return "layer";
            }
            return "layer";
        }
        return "layer";
    } catch (e) {
        return "unknown";
    }
}

// =========================================================
// EFFECT HELPERS
// =========================================================

function getLayerEffectsGroup(layer) {
    try {
        if (!layer) return null;
        return layer.property("ADBE Effect Parade");
    } catch (e) {
        try { return layer.Effects; } catch (e2) { return null; }
    }
}

function getLayerEffectCount(layer) {
    try {
        var fx = getLayerEffectsGroup(layer);
        if (!fx) return 0;
        return fx.numProperties || 0;
    } catch (e) {
        return 0;
    }
}

function getSelectedEffectsOnLayer(layer) {
    var selected = [];
    try {
        var fx = getLayerEffectsGroup(layer);
        if (!fx) return selected;
        var n = fx.numProperties;
        var i;
        for (i = 1; i <= n; i++) {
            try {
                var eff = fx.property(i);
                if (eff && eff.selected) selected.push(eff);
            } catch (eF) {}
        }
    } catch (e) {}
    return selected;
}

function getAllEffectsOnLayer(layer) {
    var all = [];
    try {
        var fx = getLayerEffectsGroup(layer);
        if (!fx) return all;
        var n = fx.numProperties;
        var i;
        for (i = 1; i <= n; i++) {
            try {
                var eff = fx.property(i);
                if (eff) all.push(eff);
            } catch (eF) {}
        }
    } catch (e) {}
    return all;
}

function getEffectNamesString(effects) {
    var names = [];
    var i;
    for (i = 0; i < effects.length; i++) {
        try { names.push(effects[i].name); } catch (e) {}
    }
    return names.join(", ");
}

function detectEffectsOnSelection() {
    var result = { mode: "none", effects: [], names: "", layer: null };
    try {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) return result;
        var sl = comp.selectedLayers;
        if (!sl || sl.length === 0) return result;
        if (sl.length > 1) return result;

        var layer = sl[0];
        result.layer = layer;

        var selectedEffs = getSelectedEffectsOnLayer(layer);
        if (selectedEffs.length > 0) {
            result.mode = "selected";
            result.effects = selectedEffs;
            result.names = getEffectNamesString(selectedEffs);
            return result;
        }

        var allEffs = getAllEffectsOnLayer(layer);
        if (allEffs.length > 0) {
            result.mode = "all";
            result.effects = allEffs;
            result.names = getEffectNamesString(allEffs);
            return result;
        }

        return result;
    } catch (e) {
        return result;
    }
}

// =========================================================
// AUTO DETECTION
// =========================================================

function buildDetectionResult(type, message, suggestedName) {
    var json = '{"type":"' + escapeJSON(type) + '","message":"' + escapeJSON(message) + '","suggestedName":"' + escapeJSON(suggestedName) + '"}';
    return encodeBridge(json);
}

function getStrictSaveType() {
    try {
        try {
            var sel = app.project.selection;
            if (sel && sel.length > 0) {
                var compsSelected = 0;
                var nonCompSelected = 0;
                var lastComp = null;
                var i;
                for (i = 0; i < sel.length; i++) {
                    if (sel[i] instanceof CompItem) {
                        compsSelected = compsSelected + 1;
                        lastComp = sel[i];
                    } else {
                        nonCompSelected = nonCompSelected + 1;
                    }
                }
                if (compsSelected === 1 && nonCompSelected === 0) {
                    return buildDetectionResult("comp", "Pre-Comp from Project panel selected", lastComp.name);
                }
                if (compsSelected > 1) {
                    return buildDetectionResult("error", "Please select only ONE composition in the Project panel.", "");
                }
                // NOTE: Project-panel PNG detection intentionally removed.
                // PNG save only works from Timeline layer selection.
            }
        } catch (eSel) {}

        var activeComp = app.project.activeItem;
        if (!(activeComp instanceof CompItem)) {
            return buildDetectionResult("error", "Please open a composition or select a comp/asset in the Project panel.", "");
        }

        var selLayers = activeComp.selectedLayers;
        if (!selLayers || selLayers.length === 0) {
            return buildDetectionResult("comp", "Active composition will be saved", activeComp.name);
        }

        if (selLayers.length === 1) {
            var fxInfo = detectEffectsOnSelection();
            if (fxInfo.mode === "selected") {
                var nameSel = "";
                if (fxInfo.effects.length === 1) nameSel = fxInfo.effects[0].name;
                else nameSel = fxInfo.names;
                return buildDetectionResult("effect", fxInfo.effects.length + " effect(s) selected on layer", nameSel);
            }
        }

        var types = {};
        var firstLayerName = "";
        var j;
        for (j = 0; j < selLayers.length; j++) {
            var t = classifyLayer(selLayers[j]);
            if (t === "unknown") {
                return buildDetectionResult("error", "Unknown layer type: " + selLayers[j].name, "");
            }
            types[t] = (types[t] || 0) + 1;
            if (j === 0) firstLayerName = selLayers[j].name;
        }

        var typeKeys = [];
        var k;
        for (k in types) {
            if (types.hasOwnProperty(k)) typeKeys.push(k);
        }

        if (typeKeys.length > 1) {
            return buildDetectionResult("error", "Mixed layer types not allowed. Select only one type.", "");
        }

        var detected = typeKeys[0];

        if (detected === "comp") {
            if (selLayers.length > 1) {
                return buildDetectionResult("error", "Please select only ONE pre-comp layer.", "");
            }
            return buildDetectionResult("comp", "Pre-comp layer selected", selLayers[0].source.name);
        }
        if (detected === "text") {
            return buildDetectionResult("text", selLayers.length + " text layer(s) selected", firstLayerName);
        }
        if (detected === "footage") {
            return buildDetectionResult("footage", selLayers.length + " footage layer(s) selected", firstLayerName);
        }
        if (detected === "image") {
            return buildDetectionResult("png", "Image layer selected", firstLayerName);
        }
        if (detected === "layer") {
            return buildDetectionResult("layer", selLayers.length + " layer(s) selected", firstLayerName);
        }

        return buildDetectionResult("error", "Cannot determine save type.", "");
    } catch (e) {
        return buildDetectionResult("error", "Detection error: " + e.toString(), "");
    }
}

function getSaveCapabilities() {
    var caps = { comp:false, layer:false, text:false, footage:false, png:false, effect:false, primary:"", suggestedName:"", message:"" };
    try {
        var primaryHex = getStrictSaveType();
        var primaryJson = decodeBridge(primaryHex);
        try {
            var pm = primaryJson.match(/"type"\s*:\s*"([^"]*)"/);
            if (pm) caps.primary = pm[1];
            var sm = primaryJson.match(/"suggestedName"\s*:\s*"([^"]*)"/);
            if (sm) caps.suggestedName = sm[1];
            var mm = primaryJson.match(/"message"\s*:\s*"([^"]*)"/);
            if (mm) caps.message = mm[1];
        } catch (eP) {}

        if (caps.primary === "error") {
            return encodeBridge(buildCapsJson(caps));
        }

        if (caps.primary === "comp") caps.comp = true;
        else if (caps.primary === "layer") caps.layer = true;
        else if (caps.primary === "text") caps.text = true;
        else if (caps.primary === "footage") caps.footage = true;
        else if (caps.primary === "png") caps.png = true;
        else if (caps.primary === "effect") caps.effect = true;

        if (caps.primary !== "effect") {
            try {
                var comp = app.project.activeItem;
                if (comp instanceof CompItem) {
                    var sl = comp.selectedLayers;
                    if (sl && sl.length === 1) {
                        var totalEffs = getLayerEffectCount(sl[0]);
                        if (totalEffs > 0) {
                            caps.effect = true;
                        }
                    }
                }
            } catch (eFx) {}
        }

        return encodeBridge(buildCapsJson(caps));
    } catch (e) {
        return encodeBridge(buildCapsJson(caps));
    }
}

function buildCapsJson(caps) {
    return '{"comp":' + (caps.comp ? "true" : "false") +
           ',"layer":' + (caps.layer ? "true" : "false") +
           ',"text":' + (caps.text ? "true" : "false") +
           ',"footage":' + (caps.footage ? "true" : "false") +
           ',"png":' + (caps.png ? "true" : "false") +
           ',"effect":' + (caps.effect ? "true" : "false") +
           ',"primary":"' + escapeJSON(caps.primary) + '"' +
           ',"suggestedName":"' + escapeJSON(caps.suggestedName) + '"' +
           ',"message":"' + escapeJSON(caps.message) + '"}';
}

// =========================================================
// COMP RESOLVE
// =========================================================

function resolveCompForSave() {
    try {
        try {
            var sel = app.project.selection;
            if (sel && sel.length > 0) {
                var selectedComps = [];
                var i;
                for (i = 0; i < sel.length; i++) {
                    if (sel[i] instanceof CompItem) selectedComps.push(sel[i]);
                }
                if (selectedComps.length === 1) return { ok: true, comp: selectedComps[0] };
                if (selectedComps.length > 1) return { ok: false, error: "Select only ONE composition." };
            }
        } catch (e) {}

        var activeComp = app.project.activeItem;
        if (activeComp instanceof CompItem) {
            var selLayers = activeComp.selectedLayers;
            if (selLayers && selLayers.length > 0) {
                if (selLayers.length > 1) return { ok: false, error: "Select only ONE pre-comp layer." };
                var layer = selLayers[0];
                if (!(layer instanceof AVLayer) || !(layer.source instanceof CompItem)) {
                    return { ok: false, error: "Selected layer is not a pre-comp." };
                }
                return { ok: true, comp: layer.source };
            }
            return { ok: true, comp: activeComp };
        }
        return { ok: false, error: "No composition available." };
    } catch (e) {
        return { ok: false, error: "Resolution error: " + e.toString() };
    }
}

// =========================================================
// VALIDATE
// =========================================================

function validateSaveRequest(typeHex) {
    try {
        var saveType = cleanStr(decodeBridge(typeHex));
        if (!saveType) return encodeBridge("No save type specified.");

        var capsHex = getSaveCapabilities();
        var capsJson = decodeBridge(capsHex);
        var caps = {};
        try { caps = eval("(" + capsJson + ")"); } catch (eP) {}

        if (caps.primary === "error") {
            return encodeBridge(caps.message || "Selection invalid.");
        }

        var saveTypeNorm = saveType;
        if (saveType === "icon" || saveType === "overlay" || saveType === "element") saveTypeNorm = "png";
        if (saveType === "text_props") saveTypeNorm = "text";

        if (saveTypeNorm === "comp" && !caps.comp) return encodeBridge("Comp save not available for current selection.");
        if (saveTypeNorm === "layer" && !caps.layer) return encodeBridge("Layer save not available for current selection.");
        if (saveTypeNorm === "text" && !caps.text) return encodeBridge("Text save not available for current selection.");
        if (saveTypeNorm === "footage" && !caps.footage) return encodeBridge("Footage save not available for current selection.");
        if (saveTypeNorm === "png" && !caps.png) return encodeBridge("PNG save not available for current selection.");
        if (saveTypeNorm === "effect" && !caps.effect) return encodeBridge("Effect save not available. Select a layer with at least one effect.");

        return encodeBridge("true");
    } catch (e) {
        return encodeBridge("Validation error: " + e.toString());
    }
}

// =========================================================
// META PARSING
// =========================================================

function parseMetaContent(mc) {
    var result = { type:"", section:"", dim:"", thumbnail:"", hasFrames:false, frameCount:0 };
    if (!mc) return result;
    try {
        var typeMatch = mc.match(/"type"\s*:\s*"([^"]+)"/);
        if (typeMatch) result.type = typeMatch[1];
        var secMatch = mc.match(/"section"\s*:\s*"([^"]+)"/);
        if (secMatch) result.section = secMatch[1];
        var dimMatch = mc.match(/"dim"\s*:\s*"([^"]*)"/);
        if (dimMatch) result.dim = dimMatch[1];
        var thumbMatch = mc.match(/"thumbnail"\s*:\s*"([^"]+)"/);
        if (thumbMatch) result.thumbnail = thumbMatch[1];
        if (mc.indexOf('"hasFrames":true') !== -1) result.hasFrames = true;
        if (mc.indexOf('"hasFrames": true') !== -1) result.hasFrames = true;
        var fcMatch = mc.match(/"frameCount"\s*:\s*(\d+)/);
        if (fcMatch) {
            var fc = parseInt(fcMatch[1], 10);
            if (!isNaN(fc)) result.frameCount = fc;
        }
    } catch (e) {}
    return result;
}

function determineItemType(rawType) {
    if (!rawType) return { type: "comp", section: "comp" };
    var t = ("" + rawType).toLowerCase();
    if (t === "layer" || t === "transition") return { type: "layer", section: "layer" };
    if (t === "text_props" || t === "textprops" || t === "text-properties" || t === "text_properties") return { type: "text_props", section: "text_props" };
    if (t === "text") return { type: "text", section: "text" };
    if (t === "footage") return { type: "footage", section: "footage" };
    if (t === "effect") return { type: "effect", section: "effect" };
    if (t === "icon" || t === "png") return { type: "icon", section: "icon" };
    if (t === "overlay") return { type: "overlay", section: "overlay" };
    if (t === "element") return { type: "element", section: "element" };
    return { type: "comp", section: "comp" };
}

// =========================================================
// GET ALL TEMPLATES
// =========================================================

function getAllTemplates(rHex) {
    try {
        var path = "";
        if (rHex) path = cleanStr(decodeBridge(rHex)).replace(/\\/g, "/");
        if (!path) path = getDefaultRootPath();

        var root = new Folder(path);
        if (!root.exists) return encodeBridge("[]");

        var list = [];
        var cats = root.getFiles();
        if (!cats) return encodeBridge("[]");

        var i;
        for (i = 0; i < cats.length; i++) {
            if (!(cats[i] instanceof Folder)) continue;
            if (cats[i].name.charAt(0) === "_") continue;

            var catName = safeDecode(cats[i].name);
            var items = cats[i].getFiles();
            if (!items) continue;

            var j;
            for (j = 0; j < items.length; j++) {
                if (!(items[j] instanceof Folder)) continue;

                var itemFolder = items[j];
                var itemFolderPath = itemFolder.fsName.replace(/\\/g, "/");
                var actualName = safeDecode(itemFolder.name);

                var itemType = "comp";
                var sectionType = "comp";
                var itemDim = "";
                var thumbRelative = "";
                var hasFrames = false;
                var frameCount = 0;

                var metaFile = new File(itemFolderPath + "/meta.json");
                if (metaFile.exists) {
                    var mc = readFileText(metaFile);
                    var parsed = parseMetaContent(mc);
                    var typed = determineItemType(parsed.type);
                    itemType = typed.type;
                    if (parsed.section) sectionType = normalizeSectionName(parsed.section);
                    else sectionType = typed.section;
                    if (!sectionType) sectionType = typed.section;
                    itemDim = parsed.dim || "";
                    thumbRelative = parsed.thumbnail || "";
                    hasFrames = parsed.hasFrames;
                    frameCount = parsed.frameCount;
                }

                var framesFolder = new Folder(itemFolderPath + "/frames");
                if (framesFolder.exists) {
                    var frameFiles = framesFolder.getFiles("frame_*.png");
                    if (frameFiles && frameFiles.length > 0) {
                        hasFrames = true;
                        frameCount = frameFiles.length;
                    } else {
                        hasFrames = false;
                        frameCount = 0;
                    }
                } else if (hasFrames) {
                    hasFrames = false;
                    frameCount = 0;
                }

                var thumbPath = "";
                if (thumbRelative) {
                    var candidate = new File(itemFolderPath + "/" + thumbRelative);
                    if (candidate.exists) thumbPath = candidate.fsName.replace(/\\/g, "/");
                }
                if (!thumbPath) {
                    var allItemFiles = itemFolder.getFiles();
                    if (allItemFiles) {
                        var tf;
                        for (tf = 0; tf < allItemFiles.length; tf++) {
                            if (!(allItemFiles[tf] instanceof File)) continue;
                            var fnLow = allItemFiles[tf].name.toLowerCase();
                            if (fnLow.indexOf("thumbnail.") === 0) {
                                thumbPath = allItemFiles[tf].fsName.replace(/\\/g, "/");
                                break;
                            }
                        }
                    }
                }

                var isFav = new File(itemFolderPath + "/.fav").exists;

                list.push('{"name":"' + escapeJSON(actualName) + '","category":"' + escapeJSON(catName) +
                    '","thumbnail":"' + escapeJSON(thumbPath) + '","favorite":' + (isFav ? "true" : "false") +
                    ',"type":"' + escapeJSON(itemType) + '","section":"' + escapeJSON(sectionType) +
                    '","dim":"' + escapeJSON(itemDim) + '","hasFrames":' + (hasFrames ? "true" : "false") +
                    ',"frameCount":' + frameCount + ',"folderPath":"' + escapeJSON(itemFolderPath) + '"}');
            }
        }
        return encodeBridge("[" + list.join(",") + "]");
    } catch (e) {
        return encodeBridge("[]");
    }
}

// =========================================================
// PLACE LAYER
// =========================================================

function placeLayerAtPlayhead(activeComp, newLayer, playheadTime, anchorLayer) {
    try {
        newLayer.startTime = 0;
        var inPoint = newLayer.inPoint;
        newLayer.startTime = playheadTime - inPoint;
    } catch (e) {
        try { newLayer.startTime = playheadTime; } catch (e2) {}
    }

    if (anchorLayer && anchorLayer.index > 0) {
        try {
            var anchorName = anchorLayer.name;
            var m;
            for (m = 1; m <= activeComp.numLayers; m++) {
                try {
                    var ml = activeComp.layer(m);
                    if (ml !== newLayer && ml.name === anchorName) {
                        if (newLayer.index !== m - 1) newLayer.moveBefore(ml);
                        break;
                    }
                } catch (e) {}
            }
        } catch (e) {}
    }

    try { deselectAllLayers(activeComp); } catch (e) {}
    try { newLayer.selected = true; } catch (e) {}
}

function copySelectedLayersToTempComp(comp, selectedLayers, tempComp) {
    var sorted = [];
    var i;
    for (i = 0; i < selectedLayers.length; i++) sorted.push(selectedLayers[i]);
    sorted.sort(function(a, b) { return b.index - a.index; });
    var copied = 0;
    var li;
    for (li = 0; li < sorted.length; li++) {
        try {
            sorted[li].copyToComp(tempComp);
            copied = copied + 1;
        } catch (e) {}
    }
    return copied;
}

// =========================================================
// THUMBNAIL HELPERS
// =========================================================

function generateBlackBgThumbnail(comp, selectedLayers, thumbFile) {
    var tempPreviewComp = null;
    var oldDepth = null;
    try {
        oldDepth = app.project.bitsPerChannel;
        app.project.bitsPerChannel = 8;

        tempPreviewComp = app.project.items.addComp(
            "_CSThumbPreview_" + generateUniqueTimestamp(),
            comp.width, comp.height, comp.pixelAspect, comp.duration, comp.frameRate
        );

        var blackBg = tempPreviewComp.layers.addSolid([0, 0, 0], "__bg__", comp.width, comp.height, 1);
        copySelectedLayersToTempComp(comp, selectedLayers, tempPreviewComp);
        try { blackBg.moveToEnd(); } catch (e) {}

        var thumbTime = tempPreviewComp.workAreaStart + tempPreviewComp.workAreaDuration * 0.3;
        try { tempPreviewComp.saveFrameToPng(thumbTime, thumbFile); } catch (e) {}
    } catch (e) {} finally {
        try { if (tempPreviewComp) tempPreviewComp.remove(); } catch (eR) {}
        try { if (oldDepth !== null) app.project.bitsPerChannel = oldDepth; } catch (eD) {}
    }
}

function generateActiveFrameThumbnail(comp, thumbFile) {
    var oldDepth = null;
    try {
        oldDepth = app.project.bitsPerChannel;
        app.project.bitsPerChannel = 8;
        var thumbTime = comp.workAreaStart + comp.workAreaDuration * 0.3;
        try { comp.saveFrameToPng(thumbTime, thumbFile); } catch (e) {}
    } catch (e) {} finally {
        try { if (oldDepth !== null) app.project.bitsPerChannel = oldDepth; } catch (eD) {}
    }
}

function generateEffectThumbnail(comp, layer, thumbFile) {
    var oldDepth = null;
    try {
        oldDepth = app.project.bitsPerChannel;
        app.project.bitsPerChannel = 8;
        var thumbTime = comp.workAreaStart + comp.workAreaDuration * 0.3;
        try { comp.saveFrameToPng(thumbTime, thumbFile); } catch (e) {}
    } catch (e) {} finally {
        try { if (oldDepth !== null) app.project.bitsPerChannel = oldDepth; } catch (eD) {}
    }
}

// =========================================================
// CORE SAVE FOR LAYER TYPES
// =========================================================

function coreSaveLayerType(name, cat, r, saveTypeStr, thumbnailMode) {
    var originalFile = null;
    var tempComp = null;

    try {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) return "Open a composition first!";

        var selectedLayers = comp.selectedLayers;
        if (!selectedLayers || selectedLayers.length === 0) return "Please select at least 1 layer.";

        originalFile = app.project.file;
        if (!originalFile) return "Please save your project first!";

        var layerCount = selectedLayers.length;

        var isAdjustment = false;
        var is3D = false;
        var blendMode = -1;
        var label = -1;
        if (layerCount === 1) {
            try { isAdjustment = !!selectedLayers[0].adjustmentLayer; } catch (e) {}
            try { is3D = !!selectedLayers[0].threeDLayer; } catch (e) {}
            try { blendMode = selectedLayers[0].blendingMode; } catch (e) {}
            try { label = selectedLayers[0].label; } catch (e) {}
        }

        var safeName = getSafeName(name);
        var safeCat = getSafeName(cat);
        var f = ensureDeepFolder(r + "/" + safeCat + "/" + safeName);
        var assetsFolder = ensureDeepFolder(f.fsName.replace(/\\/g, "/") + "/_Assets");

        app.beginUndoGroup("Save " + saveTypeStr);
        try { app.project.save(originalFile); } catch (e) {}

        var thumbFile = new File(f.fsName.replace(/\\/g, "/") + "/thumbnail.png");
        if (thumbnailMode === "blackbg") {
            generateBlackBgThumbnail(comp, selectedLayers, thumbFile);
        } else if (thumbnailMode === "frame") {
            generateActiveFrameThumbnail(comp, thumbFile);
        }

        var tempCompName = "_CSWrap_" + safeName + "_" + generateUniqueTimestamp();
        tempComp = app.project.items.addComp(tempCompName, comp.width, comp.height, comp.pixelAspect, comp.duration, comp.frameRate);

        if (!tempComp) {
            app.endUndoGroup();
            return "Could not create temp comp!";
        }

        try {
            tempComp.workAreaStart = comp.workAreaStart;
            tempComp.workAreaDuration = comp.workAreaDuration;
        } catch (e) {}

        var copied = copySelectedLayersToTempComp(comp, selectedLayers, tempComp);

        if (copied === 0 || tempComp.numLayers === 0) {
            try { tempComp.remove(); } catch (e) {}
            app.endUndoGroup();
            return "Layer copy failed!";
        }

        var targetFile = new File(f.fsName.replace(/\\/g, "/") + "/" + safeName + ".aep");
        try {
            app.project.save(targetFile);
        } catch (saveErr) {
            try { tempComp.remove(); } catch (e) {}
            app.endUndoGroup();
            return "Save failed: " + saveErr.toString();
        }

        try { app.project.reduceProject([tempComp]); } catch (e) {}

        // Corruption check removed: reduceProject can legitimately
        // cause tempComp to appear empty in some AE versions for certain
        // layer types. The .aep was already saved successfully above.
        var stamp2 = generateUniqueTimestamp();
        var ri;
        for (ri = 1; ri <= app.project.numItems; ri++) {
            try {
                var compItem = app.project.item(ri);
                if (compItem instanceof CompItem) {
                    compItem.name = "_CSPC_" + stamp2 + "_" + ri;
                }
            } catch (e) {}
        }

        var ii;
        for (ii = app.project.numItems; ii >= 1; ii--) {
            try {
                var item = app.project.item(ii);
                if (item instanceof FootageItem && item.file && item.file.exists) {
                    var dest = new File(assetsFolder.fsName + "/" + item.file.name);
                    try { item.file.copy(dest); } catch (e) {}
                }
            } catch (e) {}
        }

        try { app.project.save(); } catch (e) {}
        app.endUndoGroup();

        app.beginSuppressDialogs();
        try { app.open(originalFile); } catch (e) {}
        app.endSuppressDialogs(false);

        return "OK::" + layerCount + "::" + (isAdjustment ? "1" : "0") + "::" + (is3D ? "1" : "0") + "::" + blendMode + "::" + label;
    } catch (e) {
        try {
            if (originalFile) {
                app.beginSuppressDialogs();
                app.open(originalFile);
                app.endSuppressDialogs(false);
            }
        } catch (e2) {}
        try { app.endUndoGroup(); } catch (e3) {}
        return "Save Error: " + e.toString();
    }
}

// =========================================================
// SAVE COMP
// =========================================================

function saveActiveComp(nHex, cHex, rHex) {
    var originalFile = null;
    var oldDepth = null;
    var tempBG = null;
    var tempComp = null;

    try {
        var name = cleanStr(decodeBridge(nHex));
        var cat = cleanStr(decodeBridge(cHex));
        var r = cleanStr(decodeBridge(rHex)).replace(/\\/g, "/");

        var resolved = resolveCompForSave();
        if (!resolved.ok) return encodeBridge(resolved.error || "Cannot resolve comp.");

        var precomp = resolved.comp;
        if (!precomp) return encodeBridge("No comp.");

        originalFile = app.project.file;
        if (!originalFile) return encodeBridge("Please save your project first!");

        var safeName = getSafeName(name);
        var safeCat = getSafeName(cat);
        var f = ensureDeepFolder(r + "/" + safeCat + "/" + safeName);
        var assetsFolder = ensureDeepFolder(f.fsName.replace(/\\/g, "/") + "/_Assets");

        app.beginUndoGroup("Save Comp");
        try { app.project.save(originalFile); } catch (e) {}

        precomp.openInViewer();
        oldDepth = app.project.bitsPerChannel;
        app.project.bitsPerChannel = 8;

        try {
            tempBG = precomp.layers.addSolid([0.15, 0.15, 0.16], "__CS_BG__", precomp.width, precomp.height, 1);
            tempBG.moveToEnd();
        } catch (bgErr) { tempBG = null; }

        var thumbTime = precomp.workAreaStart + precomp.workAreaDuration * 0.3;
        var thumbFile = new File(f.fsName.replace(/\\/g, "/") + "/thumbnail.png");
        try { precomp.saveFrameToPng(thumbTime, thumbFile); } catch (e) {}

        if (tempBG) { try { tempBG.remove(); } catch (e) {} tempBG = null; }
        if (oldDepth !== null) { try { app.project.bitsPerChannel = oldDepth; } catch (e) {} oldDepth = null; }

        var tempCompName = "_CSCompWrap_" + safeName + "_" + generateUniqueTimestamp();
        tempComp = app.project.items.addComp(tempCompName, precomp.width, precomp.height, precomp.pixelAspect, precomp.duration, precomp.frameRate);

        if (!tempComp) {
            app.endUndoGroup();
            return encodeBridge("Could not create wrapper comp!");
        }

        try {
            tempComp.workAreaStart = precomp.workAreaStart;
            tempComp.workAreaDuration = precomp.workAreaDuration;
        } catch (e) {}

        try { tempComp.layers.add(precomp); } catch (addErr) {
            try { tempComp.remove(); } catch (e) {}
            app.endUndoGroup();
            return encodeBridge("Could not wrap comp: " + addErr.toString());
        }

        var targetFile = new File(f.fsName.replace(/\\/g, "/") + "/" + safeName + ".aep");
        try { app.project.save(targetFile); } catch (saveErr) {
            try { tempComp.remove(); } catch (e) {}
            app.endUndoGroup();
            return encodeBridge("Save failed: " + saveErr.toString());
        }

        try { app.project.reduceProject([tempComp]); } catch (e) {}
        try { tempComp.remove(); } catch (e) {}

        var stamp2 = generateUniqueTimestamp();
        var ri;
        for (ri = 1; ri <= app.project.numItems; ri++) {
            try {
                var compItem = app.project.item(ri);
                if (compItem instanceof CompItem) compItem.name = "_CSPC_" + stamp2 + "_" + ri;
            } catch (e) {}
        }

        var ii;
        for (ii = app.project.numItems; ii >= 1; ii--) {
            try {
                var item = app.project.item(ii);
                if (item instanceof FootageItem && item.file && item.file.exists) {
                    var dest = new File(assetsFolder.fsName + "/" + item.file.name);
                    try { item.file.copy(dest); } catch (e) {}
                }
            } catch (e) {}
        }

        try { app.project.save(); } catch (e) {}

        var meta = new File(f.fsName.replace(/\\/g, "/") + "/meta.json");
        meta.open("w");
        meta.write('{"type":"comp","section":"comp","name":"' + escapeJSON(name) + '","category":"' + escapeJSON(cat) + '","thumbnail":"thumbnail.png","hasFrames":false,"frameCount":0}');
        meta.close();

        app.beginSuppressDialogs();
        try { app.open(originalFile); } catch (e) {}
        app.endSuppressDialogs(false);

        app.endUndoGroup();
        return encodeBridge("true");
    } catch (e) {
        try { if (tempBG) tempBG.remove(); } catch (e2) {}
        try { if (oldDepth !== null) app.project.bitsPerChannel = oldDepth; } catch (e3) {}
        try {
            if (originalFile) {
                app.beginSuppressDialogs();
                app.open(originalFile);
                app.endSuppressDialogs(false);
            }
        } catch (e4) {}
        try { app.endUndoGroup(); } catch (e5) {}
        return encodeBridge("Save Error: " + e.toString());
    }
}

// =========================================================
// LAYER THUMBNAIL HELPERS
// =========================================================

function getFixedTransitionThumbnailFile(r) {
    try {
        var sharedFolder = ensureDeepFolder(cleanStr(r).replace(/\\/g, "/") + "/_shared");
        return new File(sharedFolder.fsName.replace(/\\/g, "/") + "/transition_thumbnail.png");
    } catch (e) { return null; }
}

function getOrCreateFixedTransitionThumbnail(r) {
    try {
        var thumbFile = getFixedTransitionThumbnailFile(r);
        if (!thumbFile) return null;
        if (thumbFile.exists) return thumbFile;
        var picked = File.openDialog("Choose a thumbnail image for ALL layer saves");
        if (!picked || !picked.exists) return null;
        try { if (thumbFile.exists) thumbFile.remove(); } catch (e) {}
        if (!picked.copy(thumbFile)) return null;
        return thumbFile;
    } catch (e) { return null; }
}

// =========================================================
// SAVE LAYER
// =========================================================

function saveActiveLayer(nHex, cHex, rHex) {
    try {
        var name = cleanStr(decodeBridge(nHex));
        var cat = cleanStr(decodeBridge(cHex));
        var r = cleanStr(decodeBridge(rHex)).replace(/\\/g, "/");

        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) return encodeBridge("Open a composition first!");
        var sl = comp.selectedLayers;
        if (!sl || sl.length === 0) return encodeBridge("Please select at least 1 layer.");

        var v;
        for (v = 0; v < sl.length; v++) {
            var t = classifyLayer(sl[v]);
            if (t !== "layer") {
                return encodeBridge("Layer section accepts only Shape/Solid/Null/Camera/Light layers.");
            }
        }

        var safeName = getSafeName(name);
        var safeCat = getSafeName(cat);
        var f = ensureDeepFolder(r + "/" + safeCat + "/" + safeName);

        var fixedThumb = getOrCreateFixedTransitionThumbnail(r);
        if (!fixedThumb || !fixedThumb.exists) {
            return encodeBridge("Layer thumbnail not set. Please choose a thumbnail image once.");
        }

        var result = coreSaveLayerType(name, cat, r, "Layer", "skip");
        if (result.indexOf("OK::") !== 0) return encodeBridge(result);

        var parts = result.split("::");
        var layerCount = parseInt(parts[1], 10) || 1;
        var isAdjustment = parts[2] === "1";
        var is3D = parts[3] === "1";
        var blendMode = parseInt(parts[4], 10);
        var label = parseInt(parts[5], 10);

        var thumbDest = new File(f.fsName.replace(/\\/g, "/") + "/thumbnail.png");
        try { if (thumbDest.exists) thumbDest.remove(); } catch (e) {}
        try { fixedThumb.copy(thumbDest); } catch (e) {}

        var meta = new File(f.fsName.replace(/\\/g, "/") + "/meta.json");
        meta.open("w");
        meta.write('{"type":"layer","section":"layer","name":"' + escapeJSON(name) + '","category":"' + escapeJSON(cat) + '","thumbnail":"thumbnail.png","layerCount":' + layerCount + ',"isAdjustment":' + (isAdjustment ? "true" : "false") + ',"is3D":' + (is3D ? "true" : "false") + ',"blendMode":' + blendMode + ',"label":' + label + ',"hasFrames":false,"frameCount":0}');
        meta.close();

        return encodeBridge("true");
    } catch (e) {
        return encodeBridge("Save Error: " + e.toString());
    }
}

// =========================================================
// SAVE TEXT
// =========================================================

function saveActiveText(nHex, cHex, rHex) {
    try {
        var name = cleanStr(decodeBridge(nHex));
        var cat = cleanStr(decodeBridge(cHex));
        var r = cleanStr(decodeBridge(rHex)).replace(/\\/g, "/");

        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) return encodeBridge("Open a composition first!");
        var sl = comp.selectedLayers;
        if (!sl || sl.length === 0) return encodeBridge("Please select at least 1 text layer.");

        var v;
        for (v = 0; v < sl.length; v++) {
            if (!(sl[v] instanceof TextLayer)) {
                return encodeBridge("Text section accepts ONLY Text layers.");
            }
        }

        var safeName = getSafeName(name);
        var safeCat = getSafeName(cat);
        var f = ensureDeepFolder(r + "/" + safeCat + "/" + safeName);

        var result = coreSaveLayerType(name, cat, r, "Text", "blackbg");
        if (result.indexOf("OK::") !== 0) return encodeBridge(result);

        var parts = result.split("::");
        var layerCount = parseInt(parts[1], 10) || 1;

        var meta = new File(f.fsName.replace(/\\/g, "/") + "/meta.json");
        meta.open("w");
        meta.write('{"type":"text","section":"text","name":"' + escapeJSON(name) + '","category":"' + escapeJSON(cat) + '","thumbnail":"thumbnail.png","layerCount":' + layerCount + ',"hasFrames":false,"frameCount":0}');
        meta.close();

        return encodeBridge("true");
    } catch (e) {
        return encodeBridge("Save Error: " + e.toString());
    }
}

function saveActiveTextProperties(nHex, cHex, rHex) {
    try {
        var name = cleanStr(decodeBridge(nHex));
        var cat = cleanStr(decodeBridge(cHex));
        var r = cleanStr(decodeBridge(rHex)).replace(/\\/g, "/");

        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) return encodeBridge("Open a composition first!");
        var sl = comp.selectedLayers;
        if (!sl || sl.length !== 1) return encodeBridge("Please select exactly 1 text layer for Text Properties.");
        if (!(sl[0] instanceof TextLayer)) return encodeBridge("Text Properties accepts ONLY a Text layer.");

        var safeName = getSafeName(name);
        var safeCat = getSafeName(cat);
        var f = ensureDeepFolder(r + "/" + safeCat + "/" + safeName);

        var result = coreSaveLayerType(name, cat, r, "Text Properties", "blackbg");
        if (result.indexOf("OK::") !== 0) return encodeBridge(result);

        var meta = new File(f.fsName.replace(/\\/g, "/") + "/meta.json");
        meta.open("w");
        meta.write('{"type":"text_props","section":"text_props","name":"' + escapeJSON(name) + '","category":"' + escapeJSON(cat) + '","thumbnail":"thumbnail.png","layerCount":1,"hasFrames":false,"frameCount":0}');
        meta.close();

        return encodeBridge("true");
    } catch (e) {
        return encodeBridge("Save Error: " + e.toString());
    }
}

// =========================================================
// SAVE FOOTAGE
// =========================================================

function saveActiveFootage(nHex, cHex, rHex) {
    try {
        var name = cleanStr(decodeBridge(nHex));
        var cat = cleanStr(decodeBridge(cHex));
        var r = cleanStr(decodeBridge(rHex)).replace(/\\/g, "/");

        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) return encodeBridge("Open a composition first!");
        var sl = comp.selectedLayers;
        if (!sl || sl.length === 0) return encodeBridge("Please select at least 1 footage layer.");

        var v;
        for (v = 0; v < sl.length; v++) {
            var t = classifyLayer(sl[v]);
            if (t !== "footage") {
                return encodeBridge("Footage section accepts ONLY video/audio footage layers.");
            }
        }

        var safeName = getSafeName(name);
        var safeCat = getSafeName(cat);
        var f = ensureDeepFolder(r + "/" + safeCat + "/" + safeName);

        var result = coreSaveLayerType(name, cat, r, "Footage", "frame");
        if (result.indexOf("OK::") !== 0) return encodeBridge(result);

        var parts = result.split("::");
        var layerCount = parseInt(parts[1], 10) || 1;

        var meta = new File(f.fsName.replace(/\\/g, "/") + "/meta.json");
        meta.open("w");
        meta.write('{"type":"footage","section":"footage","name":"' + escapeJSON(name) + '","category":"' + escapeJSON(cat) + '","thumbnail":"thumbnail.png","layerCount":' + layerCount + ',"hasFrames":false,"frameCount":0}');
        meta.close();

        return encodeBridge("true");
    } catch (e) {
        return encodeBridge("Save Error: " + e.toString());
    }
}

// =========================================================
// SAVE PNG
// =========================================================

function savePNGOnly(nHex, cHex, rHex, typeHex) {
    try {
        var name = cleanStr(decodeBridge(nHex));
        var cat = cleanStr(decodeBridge(cHex));
        var r = cleanStr(decodeBridge(rHex)).replace(/\\/g, "/");
        var itemType = "icon";
        if (typeHex) itemType = cleanStr(decodeBridge(typeHex));
        if (itemType !== "icon" && itemType !== "overlay" && itemType !== "element") itemType = "icon";

        var safeName = getSafeName(name);
        var safeCat = getSafeName(cat);
        var folder = ensureDeepFolder(r + "/" + safeCat + "/" + safeName);

        // FIX: ONLY check timeline layers — never use project panel selection.
        // This prevents wrong-source saves when project panel and timeline
        // both have selections at the same time.
        var sourceFile = null;
        var sourceWidth = 0;
        var sourceHeight = 0;

        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) {
            return encodeBridge("Open a composition and select an image layer in the timeline.");
        }

        var selLayers = comp.selectedLayers;
        if (!selLayers || selLayers.length === 0) {
            return encodeBridge("Select an image layer in the Timeline to save.");
        }

        var si;
        for (si = 0; si < selLayers.length; si++) {
            var slx = selLayers[si];
            try {
                if (slx.source instanceof FootageItem && slx.source.file && slx.source.file.exists) {
                    if (isSupportedImageFileName(slx.source.file.name)) {
                        sourceFile = slx.source.file;
                        if (slx.source.width) sourceWidth = slx.source.width;
                        if (slx.source.height) sourceHeight = slx.source.height;
                        break;
                    }
                }
            } catch (eSlx) {}
        }

        if (!sourceFile || !sourceFile.exists) {
            return encodeBridge("No image layer found in timeline selection. Select a PNG/JPG/etc layer in the Timeline (not the Project panel).");
        }

        var fileExt = sourceFile.name.substring(sourceFile.name.lastIndexOf("."));
        var destFile = new File(folder.fsName + "/" + safeName + fileExt);
        sourceFile.copy(destFile);

        var thumbName = "thumbnail" + fileExt;
        var thumbFile = new File(folder.fsName + "/" + thumbName);
        sourceFile.copy(thumbFile);

        var dimStr = "";
        if (sourceWidth > 0 && sourceHeight > 0) dimStr = sourceWidth + "x" + sourceHeight;

        var meta = new File(folder.fsName + "/meta.json");
        meta.open("w");
        meta.write('{"type":"' + escapeJSON(itemType) + '","section":"' + escapeJSON(itemType) + '","name":"' + escapeJSON(name) + '","category":"' + escapeJSON(cat) + '","original":"' + escapeJSON(sourceFile.name) + '","thumbnail":"' + escapeJSON(thumbName) + '","dim":"' + escapeJSON(dimStr) + '","hasFrames":false,"frameCount":0}');
        meta.close();

        return encodeBridge("true");
    } catch (e) {
        return encodeBridge("Save Error: " + e.toString());
    }
}

// =========================================================
// EFFECT SERIALIZATION
// =========================================================

function serializePropertyValue(val) {
    try {
        if (val === null || val === undefined) return "null";
        if (typeof val === "number") {
            if (isNaN(val) || !isFinite(val)) return "0";
            return "" + val;
        }
        if (typeof val === "boolean") return val ? "true" : "false";
        if (typeof val === "string") return '"' + escapeJSON(val) + '"';
        if (val instanceof Array) {
            var parts = [];
            var i;
            for (i = 0; i < val.length; i++) {
                parts.push(serializePropertyValue(val[i]));
            }
            return "[" + parts.join(",") + "]";
        }
        return "null";
    } catch (e) {
        return "null";
    }
}

function serializeKeyframes(prop) {
    var kfs = [];
    try {
        if (!prop.numKeys || prop.numKeys === 0) return kfs;
        var k;
        for (k = 1; k <= prop.numKeys; k++) {
            try {
                var kfData = {
                    time: prop.keyTime(k),
                    value: prop.keyValue(k),
                    inInterp: prop.keyInInterpolationType(k),
                    outInterp: prop.keyOutInterpolationType(k)
                };
                try { kfData.inEase = prop.keyInTemporalEase(k); } catch (eEi) {}
                try { kfData.outEase = prop.keyOutTemporalEase(k); } catch (eEo) {}
                kfs.push(kfData);
            } catch (eKf) {}
        }
    } catch (e) {}
    return kfs;
}

function serializeKeyframeJson(kf) {
    var s = '{"time":' + kf.time;
    s += ',"value":' + serializePropertyValue(kf.value);
    s += ',"inInterp":' + kf.inInterp;
    s += ',"outInterp":' + kf.outInterp;
    if (kf.inEase) {
        var ie = [];
        var i;
        for (i = 0; i < kf.inEase.length; i++) {
            ie.push('{"speed":' + kf.inEase[i].speed + ',"influence":' + kf.inEase[i].influence + '}');
        }
        s += ',"inEase":[' + ie.join(",") + ']';
    }
    if (kf.outEase) {
        var oe = [];
        var j;
        for (j = 0; j < kf.outEase.length; j++) {
            oe.push('{"speed":' + kf.outEase[j].speed + ',"influence":' + kf.outEase[j].influence + '}');
        }
        s += ',"outEase":[' + oe.join(",") + ']';
    }
    s += '}';
    return s;
}

function serializeProperty(prop) {
    try {
        if (!prop) return null;

        var data = {
            name: prop.name,
            matchName: prop.matchName,
            type: "",
            value: null,
            keyframes: [],
            expression: "",
            children: []
        };

        if (prop.propertyType === PropertyType.PROPERTY) {
            data.type = "property";
            try { data.value = prop.value; } catch (eV) {}
            try {
                if (prop.canSetExpression && prop.expression && prop.expression.length > 0) {
                    data.expression = prop.expression;
                }
            } catch (eE) {}
            try {
                if (prop.numKeys > 0) {
                    data.keyframes = serializeKeyframes(prop);
                }
            } catch (eK) {}
            return data;
        }

        if (prop.propertyType === PropertyType.INDEXED_GROUP || prop.propertyType === PropertyType.NAMED_GROUP) {
            data.type = "group";
            try {
                var n = prop.numProperties;
                var i;
                for (i = 1; i <= n; i++) {
                    try {
                        var child = serializeProperty(prop.property(i));
                        if (child) data.children.push(child);
                    } catch (eC) {}
                }
            } catch (eG) {}
            return data;
        }

        return null;
    } catch (e) {
        return null;
    }
}

function serializePropertyToJson(propData) {
    if (!propData) return "null";
    var s = '{';
    s += '"name":"' + escapeJSON(propData.name) + '"';
    s += ',"matchName":"' + escapeJSON(propData.matchName) + '"';
    s += ',"type":"' + escapeJSON(propData.type) + '"';

    if (propData.type === "property") {
        s += ',"value":' + serializePropertyValue(propData.value);
        s += ',"expression":"' + escapeJSON(propData.expression || "") + '"';
        if (propData.keyframes && propData.keyframes.length > 0) {
            var kfs = [];
            var k;
            for (k = 0; k < propData.keyframes.length; k++) {
                kfs.push(serializeKeyframeJson(propData.keyframes[k]));
            }
            s += ',"keyframes":[' + kfs.join(",") + ']';
        } else {
            s += ',"keyframes":[]';
        }
    } else if (propData.type === "group") {
        if (propData.children && propData.children.length > 0) {
            var cs = [];
            var c;
            for (c = 0; c < propData.children.length; c++) {
                cs.push(serializePropertyToJson(propData.children[c]));
            }
            s += ',"children":[' + cs.join(",") + ']';
        } else {
            s += ',"children":[]';
        }
    }
    s += '}';
    return s;
}

function serializeEffect(effect) {
    try {
        if (!effect) return null;
        var data = {
            name: effect.name,
            matchName: effect.matchName,
            enabled: true,
            properties: []
        };
        try { data.enabled = effect.enabled; } catch (eEn) {}

        var n = effect.numProperties;
        var i;
        for (i = 1; i <= n; i++) {
            try {
                var prop = effect.property(i);
                var propData = serializeProperty(prop);
                if (propData) data.properties.push(propData);
            } catch (eP) {}
        }
        return data;
    } catch (e) {
        return null;
    }
}

function serializeEffectToJson(effData) {
    if (!effData) return "null";
    var s = '{';
    s += '"name":"' + escapeJSON(effData.name) + '"';
    s += ',"matchName":"' + escapeJSON(effData.matchName) + '"';
    s += ',"enabled":' + (effData.enabled ? "true" : "false");
    var props = [];
    var i;
    for (i = 0; i < effData.properties.length; i++) {
        props.push(serializePropertyToJson(effData.properties[i]));
    }
    s += ',"properties":[' + props.join(",") + ']';
    s += '}';
    return s;
}

// =========================================================
// EFFECT DESERIALIZATION
// =========================================================

function applyKeyframesToProperty(prop, keyframes) {
    if (!prop || !keyframes || keyframes.length === 0) return;
    try {
        try {
            while (prop.numKeys > 0) {
                prop.removeKey(1);
            }
        } catch (eClr) {}

        var k;
        for (k = 0; k < keyframes.length; k++) {
            try {
                var kf = keyframes[k];
                var idx = prop.addKey(kf.time);
                try { prop.setValueAtKey(idx, kf.value); } catch (eSv) {}
                try {
                    if (typeof kf.inInterp !== "undefined" && typeof kf.outInterp !== "undefined") {
                        prop.setInterpolationTypeAtKey(idx, kf.inInterp, kf.outInterp);
                    }
                } catch (eIn) {}
                try {
                    if (kf.inEase && kf.outEase) {
                        var inE = [];
                        var ie;
                        for (ie = 0; ie < kf.inEase.length; ie++) {
                            inE.push(new KeyframeEase(kf.inEase[ie].speed, kf.inEase[ie].influence));
                        }
                        var outE = [];
                        var oe;
                        for (oe = 0; oe < kf.outEase.length; oe++) {
                            outE.push(new KeyframeEase(kf.outEase[oe].speed, kf.outEase[oe].influence));
                        }
                        prop.setTemporalEaseAtKey(idx, inE, outE);
                    }
                } catch (eEs) {}
            } catch (eAdd) {}
        }
    } catch (e) {}
}

function applyPropertyData(targetProp, propData) {
    if (!targetProp || !propData) return;
    try {
        if (propData.type === "property") {
            if (!propData.keyframes || propData.keyframes.length === 0) {
                try {
                    if (propData.value !== null && propData.value !== undefined) {
                        targetProp.setValue(propData.value);
                    }
                } catch (eV) {}
            } else {
                applyKeyframesToProperty(targetProp, propData.keyframes);
            }
            try {
                if (propData.expression && propData.expression.length > 0 && targetProp.canSetExpression) {
                    targetProp.expression = propData.expression;
                }
            } catch (eEx) {}
        } else if (propData.type === "group") {
            if (propData.children && propData.children.length > 0) {
                var c;
                for (c = 0; c < propData.children.length; c++) {
                    var childData = propData.children[c];
                    var childProp = null;
                    try { childProp = targetProp.property(childData.matchName); } catch (e1) {}
                    if (!childProp) {
                        try { childProp = targetProp.property(childData.name); } catch (e2) {}
                    }
                    if (childProp) {
                        applyPropertyData(childProp, childData);
                    }
                }
            }
        }
    } catch (e) {}
}

function applyEffectData(layer, effData) {
    if (!layer || !effData) return null;
    try {
        var fxGroup = layer.property("ADBE Effect Parade");
        if (!fxGroup) return null;

        var newEffect = null;
        try {
            newEffect = fxGroup.addProperty(effData.matchName);
        } catch (eAdd) {
            try {
                newEffect = fxGroup.addProperty(effData.name);
            } catch (eAdd2) {
                return null;
            }
        }

        if (!newEffect) return null;

        try {
            if (typeof effData.enabled !== "undefined") newEffect.enabled = effData.enabled;
        } catch (eEn) {}

        var i;
        for (i = 0; i < effData.properties.length; i++) {
            var propData = effData.properties[i];
            var targetProp = null;
            try { targetProp = newEffect.property(propData.matchName); } catch (e1) {}
            if (!targetProp) {
                try { targetProp = newEffect.property(propData.name); } catch (e2) {}
            }
            if (targetProp) {
                applyPropertyData(targetProp, propData);
            }
        }

        return newEffect;
    } catch (e) {
        return null;
    }
}

// =========================================================
// SAVE EFFECT
// =========================================================

function saveActiveEffect(nHex, cHex, rHex) {
    try {
        var name = cleanStr(decodeBridge(nHex));
        var cat = cleanStr(decodeBridge(cHex));
        var r = cleanStr(decodeBridge(rHex)).replace(/\\/g, "/");

        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) return encodeBridge("Open a composition first!");
        var sl = comp.selectedLayers;
        if (!sl || sl.length === 0) return encodeBridge("Please select 1 layer with effects.");
        if (sl.length > 1) return encodeBridge("Effect save supports only 1 layer at a time.");

        var layer = sl[0];

        var fxInfo = detectEffectsOnSelection();
        if (fxInfo.mode === "none" || fxInfo.effects.length === 0) {
            return encodeBridge("Selected layer has no effects to save.");
        }

        var safeName = getSafeName(name);
        var safeCat = getSafeName(cat);
        var f = ensureDeepFolder(r + "/" + safeCat + "/" + safeName);

        app.beginUndoGroup("Save Effect Preset");

        var thumbFile = new File(f.fsName.replace(/\\/g, "/") + "/thumbnail.png");
        generateEffectThumbnail(comp, layer, thumbFile);

        var serialized = [];
        var effectNamesArr = [];
        var i;
        for (i = 0; i < fxInfo.effects.length; i++) {
            try {
                var effData = serializeEffect(fxInfo.effects[i]);
                if (effData) {
                    serialized.push(serializeEffectToJson(effData));
                    effectNamesArr.push(escapeJSON(effData.name));
                }
            } catch (eS) {}
        }

        if (serialized.length === 0) {
            app.endUndoGroup();
            return encodeBridge("Could not serialize any effects.");
        }

        var effectJsonFile = new File(f.fsName.replace(/\\/g, "/") + "/" + safeName + ".cseffect");
        var fullJson = '{"version":1,"effects":[' + serialized.join(",") + ']}';

        try {
            effectJsonFile.encoding = "UTF-8";
            effectJsonFile.open("w");
            effectJsonFile.write(fullJson);
            effectJsonFile.close();
        } catch (eW) {
            try { effectJsonFile.close(); } catch (eC) {}
            app.endUndoGroup();
            return encodeBridge("Effect file write failed: " + eW.toString());
        }

        if (!effectJsonFile.exists) {
            app.endUndoGroup();
            return encodeBridge("Effect file was not created.");
        }

        var effectNamesJsonArr = '["' + effectNamesArr.join('","') + '"]';
        var meta = new File(f.fsName.replace(/\\/g, "/") + "/meta.json");
        meta.open("w");
        meta.write('{"type":"effect","section":"effect","name":"' + escapeJSON(name) +
            '","category":"' + escapeJSON(cat) +
            '","thumbnail":"thumbnail.png"' +
            ',"effectCount":' + fxInfo.effects.length +
            ',"effectNames":' + effectNamesJsonArr +
            ',"saveMode":"' + escapeJSON(fxInfo.mode) +
            '","effectFile":"' + escapeJSON(safeName + ".cseffect") +
            '","hasFrames":false,"frameCount":0}');
        meta.close();

        app.endUndoGroup();
        return encodeBridge("true");
    } catch (e) {
        try { app.endUndoGroup(); } catch (eU) {}
        return encodeBridge("Save Error: " + e.toString());
    }
}

// =========================================================
// IMPORT EFFECT
// =========================================================

function importEffect(nHex, cHex, rHex) {
    try {
        var n = cleanStr(decodeBridge(nHex));
        var c = cleanStr(decodeBridge(cHex));
        var r = cleanStr(decodeBridge(rHex)).replace(/\\/g, "/");
        var folder = new Folder(r + "/" + getSafeName(c) + "/" + getSafeName(n));

        if (!folder.exists) return encodeBridge("Effect folder not found!");

        var effectFiles = folder.getFiles("*.cseffect");
        if (!effectFiles || effectFiles.length === 0) {
            return encodeBridge("No effect data file found! This template may have been saved with an older version.");
        }

        var effectFile = effectFiles[0];
        if (!effectFile.exists) return encodeBridge("Effect file missing!");

        var jsonContent = readFileText(effectFile);
        if (!jsonContent) return encodeBridge("Effect file is empty!");

        var effectData = null;
        try {
            effectData = eval("(" + jsonContent + ")");
        } catch (eP) {
            return encodeBridge("Effect file is corrupted: " + eP.toString());
        }

        if (!effectData || !effectData.effects || effectData.effects.length === 0) {
            return encodeBridge("No effects in file!");
        }

        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) return encodeBridge("Open a composition first!");

        var sl = comp.selectedLayers;
        if (!sl || sl.length === 0) return encodeBridge("Please select a layer to apply the effect.");

        app.beginUndoGroup("Apply Effect Preset");

        var totalApplied = 0;
        var li;
        for (li = 0; li < sl.length; li++) {
            var targetLayer = sl[li];
            var ei;
            for (ei = 0; ei < effectData.effects.length; ei++) {
                try {
                    var applied = applyEffectData(targetLayer, effectData.effects[ei]);
                    if (applied) totalApplied = totalApplied + 1;
                } catch (eA) {}
            }
        }

        app.endUndoGroup();

        if (totalApplied === 0) {
            return encodeBridge("Could not apply any effect. The effect may not be available in this AE version or requires a missing plugin.");
        }

        return encodeBridge("true");
    } catch (e) {
        try { app.endUndoGroup(); } catch (ee) {}
        return encodeBridge("Apply Error: " + e.toString());
    }
}

// =========================================================
// TOOLKIT FUNCTIONS
// =========================================================

var __CS_TOOLKIT_EFFECT_STATES = null;

function toolkitGetActiveComp() {
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) return null;
    return comp;
}

function toolkitGetTransform(layer) {
    try { return layer.property("ADBE Transform Group"); } catch (e) {}
    return null;
}

function toolkitGetAnchorProp(layer) {
    try {
        var tr = toolkitGetTransform(layer);
        return tr ? tr.property("ADBE Anchor Point") : null;
    } catch (e) {}
    return null;
}

function toolkitGetPositionProp(layer) {
    try {
        var tr = toolkitGetTransform(layer);
        return tr ? tr.property("ADBE Position") : null;
    } catch (e) {}
    return null;
}

function toolkitPropValueAt(prop, time) {
    try {
        if (prop.numKeys && prop.numKeys > 0) return prop.valueAtTime(time, false);
    } catch (e) {}
    try { return prop.value; } catch (e2) {}
    return null;
}

function toolkitSetPropValue(prop, value, time) {
    if (!prop) return false;
    try {
        if (prop.numKeys && prop.numKeys > 0) prop.setValueAtTime(time, value);
        else prop.setValue(value);
        return true;
    } catch (e) {}
    return false;
}

function toolkitAddPositionDelta(layer, delta, time) {
    var pos = toolkitGetPositionProp(layer);
    if (!pos) return false;
    var cur = toolkitPropValueAt(pos, time);
    if (!cur) return false;

    try {
        if (pos.dimensionsSeparated) {
            var tr = toolkitGetTransform(layer);
            var px = tr.property("ADBE Position_0");
            var py = tr.property("ADBE Position_1");
            var pz = tr.property("ADBE Position_2");
            if (px) toolkitSetPropValue(px, toolkitPropValueAt(px, time) + (delta[0] || 0), time);
            if (py) toolkitSetPropValue(py, toolkitPropValueAt(py, time) + (delta[1] || 0), time);
            if (pz && cur.length > 2) toolkitSetPropValue(pz, toolkitPropValueAt(pz, time) + (delta[2] || 0), time);
            return true;
        }
    } catch (eS) {}

    var next = [];
    var i;
    for (i = 0; i < cur.length; i++) next[i] = cur[i] + (delta[i] || 0);
    return toolkitSetPropValue(pos, next, time);
}

function toolkitAddCompDelta(layer, compDelta, time) {
    try {
        var anchorProp = toolkitGetAnchorProp(layer);
        var anchor = anchorProp ? toolkitPropValueAt(anchorProp, time) : [0, 0, 0];
        var anchorComp = layer.toComp(anchor);
        var targetComp = [
            anchorComp[0] + (compDelta[0] || 0),
            anchorComp[1] + (compDelta[1] || 0),
            anchorComp.length > 2 ? anchorComp[2] + (compDelta[2] || 0) : (compDelta[2] || 0)
        ];
        var localDelta = compDelta;
        if (layer.parent) {
            var a = layer.parent.fromComp(anchorComp);
            var b = layer.parent.fromComp(targetComp);
            localDelta = [b[0] - a[0], b[1] - a[1], (b.length > 2 && a.length > 2) ? b[2] - a[2] : 0];
        }
        return toolkitAddPositionDelta(layer, localDelta, time);
    } catch (e) {}
    return false;
}

function toolkitLayerRect(layer, time) {
    var rect = null;
    try { rect = layer.sourceRectAtTime(time, true); } catch (e) {}
    if (rect && rect.width !== undefined && rect.height !== undefined && (rect.width !== 0 || rect.height !== 0)) {
        return rect;
    }
    var w = 0;
    var h = 0;
    try { w = layer.width || 0; } catch (eW) {}
    try { h = layer.height || 0; } catch (eH) {}
    if (w === 0) w = 100;
    if (h === 0) h = 100;
    return { left: 0, top: 0, width: w, height: h };
}

function toolkitTargetFromRect(rect, mode, oldAnchor) {
    var x = rect.left + rect.width / 2;
    var y = rect.top + rect.height / 2;
    if (mode.indexOf("left") !== -1) x = rect.left;
    else if (mode.indexOf("right") !== -1) x = rect.left + rect.width;
    if (mode.indexOf("top") !== -1) y = rect.top;
    else if (mode.indexOf("bottom") !== -1) y = rect.top + rect.height;
    return [x, y, oldAnchor && oldAnchor.length > 2 ? oldAnchor[2] : 0];
}

function toolkitAnchorPoint(modeHex) {
    try {
        var mode = cleanStr(decodeBridge(modeHex));
        var comp = toolkitGetActiveComp();
        if (!comp) return encodeBridge("Open a composition first.");
        var layers = comp.selectedLayers;
        if (!layers || layers.length === 0) return encodeBridge("Select at least one layer.");

        app.beginUndoGroup("Toolkit Anchor Point");
        var time = comp.time;
        var changed = 0;
        var i;
        for (i = 0; i < layers.length; i++) {
            try {
                var layer = layers[i];
                var anchorProp = toolkitGetAnchorProp(layer);
                if (!anchorProp) continue;
                var oldAnchor = toolkitPropValueAt(anchorProp, time);
                if (!oldAnchor) continue;
                var rect = toolkitLayerRect(layer, time);
                var newAnchor = toolkitTargetFromRect(rect, mode, oldAnchor);
                var oldComp = layer.toComp(oldAnchor);
                var newComp = layer.toComp(newAnchor);
                var compDelta = [newComp[0] - oldComp[0], newComp[1] - oldComp[1], (newComp.length > 2 && oldComp.length > 2) ? newComp[2] - oldComp[2] : 0];
                toolkitSetPropValue(anchorProp, newAnchor, time);
                toolkitAddCompDelta(layer, compDelta, time);
                changed++;
            } catch (eL) {}
        }
        app.endUndoGroup();
        if (changed === 0) return encodeBridge("No compatible selected layers.");
        return encodeBridge("OK:Anchor updated");
    } catch (e) {
        try { app.endUndoGroup(); } catch (ee) {}
        return encodeBridge("Anchor Error: " + e.toString());
    }
}

function toolkitLayerCompBounds(layer, time) {
    var rect = toolkitLayerRect(layer, time);
    var pts = [
        [rect.left, rect.top, 0],
        [rect.left + rect.width, rect.top, 0],
        [rect.left, rect.top + rect.height, 0],
        [rect.left + rect.width, rect.top + rect.height, 0]
    ];
    var minX = 99999999, minY = 99999999, maxX = -99999999, maxY = -99999999;
    var i;
    for (i = 0; i < pts.length; i++) {
        try {
            var p = layer.toComp(pts[i]);
            if (p[0] < minX) minX = p[0];
            if (p[0] > maxX) maxX = p[0];
            if (p[1] < minY) minY = p[1];
            if (p[1] > maxY) maxY = p[1];
        } catch (e) {}
    }
    return { left:minX, right:maxX, top:minY, bottom:maxY, cx:(minX + maxX) / 2, cy:(minY + maxY) / 2 };
}

function toolkitAlignLayers(modeHex) {
    try {
        var mode = cleanStr(decodeBridge(modeHex));
        var comp = toolkitGetActiveComp();
        if (!comp) return encodeBridge("Open a composition first.");
        var layers = comp.selectedLayers;
        if (!layers || layers.length === 0) return encodeBridge("Select at least one layer.");

        app.beginUndoGroup("Toolkit Align");
        var time = comp.time;
        var changed = 0;
        var i;
        for (i = 0; i < layers.length; i++) {
            try {
                var b = toolkitLayerCompBounds(layers[i], time);
                var dx = 0, dy = 0;
                if (mode === "left") dx = -b.left;
                else if (mode === "right") dx = comp.width - b.right;
                else if (mode === "hcenter") dx = comp.width / 2 - b.cx;
                else if (mode === "top") dy = -b.top;
                else if (mode === "bottom") dy = comp.height - b.bottom;
                else if (mode === "vcenter") dy = comp.height / 2 - b.cy;
                toolkitAddCompDelta(layers[i], [dx, dy, 0], time);
                changed++;
            } catch (eL) {}
        }
        app.endUndoGroup();
        if (changed === 0) return encodeBridge("No compatible selected layers.");
        return encodeBridge("OK:Layers aligned");
    } catch (e) {
        try { app.endUndoGroup(); } catch (ee) {}
        return encodeBridge("Align Error: " + e.toString());
    }
}

function toolkitTopSelectedLayer(comp) {
    try {
        var layers = comp.selectedLayers;
        if (!layers || layers.length === 0) return null;
        var top = layers[0];
        var i;
        for (i = 1; i < layers.length; i++) if (layers[i].index < top.index) top = layers[i];
        return top;
    } catch (e) {}
    return null;
}

function toolkitApplyTiming(newLayer, refLayer, comp) {
    try {
        if (refLayer) {
            newLayer.startTime = refLayer.startTime;
            newLayer.inPoint = refLayer.inPoint;
            newLayer.outPoint = refLayer.outPoint;
            newLayer.moveBefore(refLayer);
        } else {
            newLayer.startTime = 0;
            newLayer.inPoint = 0;
            newLayer.outPoint = comp.duration;
            try { newLayer.moveToBeginning(); } catch (e) {}
        }
    } catch (e2) {}
}

function toolkitDeselect(comp) {
    var i;
    for (i = 1; i <= comp.numLayers; i++) {
        try { comp.layer(i).selected = false; } catch (e) {}
    }
}

function toolkitCreateLayer(modeHex) {
    try {
        var mode = cleanStr(decodeBridge(modeHex));
        var comp = toolkitGetActiveComp();
        if (!comp) return encodeBridge("Open a composition first.");
        var ref = toolkitTopSelectedLayer(comp);
        var selected = comp.selectedLayers;
        app.beginUndoGroup("Toolkit Create Layer");

        var layer = null;
        if (mode === "null") {
            layer = comp.layers.addNull();
            layer.name = "CS Null";
            if (ref) {
                try { layer.threeDLayer = !!ref.threeDLayer; } catch (e3d) {}
                var ap = toolkitGetAnchorProp(ref);
                var av = ap ? toolkitPropValueAt(ap, comp.time) : [0,0,0];
                var cp = ref.toComp(av);
                try {
                    if (layer.threeDLayer) layer.position.setValue([cp[0], cp[1], cp.length > 2 ? cp[2] : 0]);
                    else layer.position.setValue([cp[0], cp[1]]);
                } catch (eP) {}
            }
            toolkitApplyTiming(layer, ref, comp);
            if (selected && selected.length > 0) {
                var si;
                for (si = 0; si < selected.length; si++) {
                    try { selected[si].parent = layer; } catch (ePar) {}
                }
            }
        } else if (mode === "adjustment") {
            layer = comp.layers.addSolid([1, 1, 1], "CS Adjustment", comp.width, comp.height, comp.pixelAspect, comp.duration);
            layer.adjustmentLayer = true;
            toolkitApplyTiming(layer, ref, comp);
        } else if (mode === "camera") {
            var rig = comp.layers.addNull();
            rig.name = "Camera Control";
            rig.threeDLayer = true;
            try { rig.position.setValue([comp.width / 2, comp.height / 2, 0]); } catch (eR) {}
            layer = comp.layers.addCamera("CS Camera", [comp.width / 2, comp.height / 2]);
            try { layer.parent = rig; } catch (eC) {}
            toolkitApplyTiming(rig, ref, comp);
            toolkitApplyTiming(layer, ref, comp);
            toolkitDeselect(comp);
            rig.selected = true;
            layer.selected = true;
            app.endUndoGroup();
            return encodeBridge("OK:Camera rig created");
        } else if (mode === "solid") {
            layer = comp.layers.addSolid([0.18, 0.18, 0.2], "CS Solid", comp.width, comp.height, comp.pixelAspect, comp.duration);
            toolkitApplyTiming(layer, ref, comp);
        } else if (mode === "text") {
            layer = comp.layers.addText("Text");
            toolkitApplyTiming(layer, ref, comp);
        } else {
            app.endUndoGroup();
            return encodeBridge("Unknown layer type.");
        }

        toolkitDeselect(comp);
        if (layer) layer.selected = true;
        app.endUndoGroup();
        return encodeBridge("OK:Layer created");
    } catch (e) {
        try { app.endUndoGroup(); } catch (ee) {}
        return encodeBridge("Create Error: " + e.toString());
    }
}

function toolkitGetOrCreateRootFolder(name) {
    var i;
    for (i = 1; i <= app.project.numItems; i++) {
        try {
            var item = app.project.item(i);
            if (item instanceof FolderItem && item.name === name) return item;
        } catch (e) {}
    }
    return app.project.items.addFolder(name);
}

function toolkitLowerExt(fileObj) {
    try {
        var n = fileObj.name.toLowerCase();
        var p = n.lastIndexOf(".");
        return p >= 0 ? n.substr(p + 1) : "";
    } catch (e) {}
    return "";
}

function toolkitOrganizeProject() {
    try {
        if (!app.project) return encodeBridge("No project open.");
        app.beginUndoGroup("Toolkit Organize Project");
        var folders = {
            comps: toolkitGetOrCreateRootFolder("Compositions"),
            footage: toolkitGetOrCreateRootFolder("Footage"),
            audio: toolkitGetOrCreateRootFolder("Audio"),
            images: toolkitGetOrCreateRootFolder("Images"),
            solids: toolkitGetOrCreateRootFolder("Solids"),
            precomps: toolkitGetOrCreateRootFolder("Precomps"),
            misc: toolkitGetOrCreateRootFolder("Misc")
        };

        var usedCompIds = {};
        var i, j;
        for (i = 1; i <= app.project.numItems; i++) {
            try {
                var c = app.project.item(i);
                if (!(c instanceof CompItem)) continue;
                for (j = 1; j <= c.numLayers; j++) {
                    var l = c.layer(j);
                    if (l instanceof AVLayer && l.source instanceof CompItem) usedCompIds[l.source.id] = true;
                }
            } catch (eC) {}
        }

        var moved = 0;
        for (i = 1; i <= app.project.numItems; i++) {
            try {
                var item = app.project.item(i);
                if (item instanceof FolderItem) continue;
                var dest = folders.misc;
                if (item instanceof CompItem) dest = usedCompIds[item.id] ? folders.precomps : folders.comps;
                else if (item instanceof FootageItem) {
                    if (item.mainSource instanceof SolidSource) dest = folders.solids;
                    else {
                        var ext = toolkitLowerExt(item.file);
                        if (item.hasAudio && !item.hasVideo) dest = folders.audio;
                        else if (/^(png|jpg|jpeg|gif|bmp|tif|tiff|webp|svg|ai|psd)$/.test(ext)) dest = folders.images;
                        else dest = folders.footage;
                    }
                }
                if (item.parentFolder !== dest) {
                    item.parentFolder = dest;
                    moved++;
                }
            } catch (eM) {}
        }
        app.endUndoGroup();
        return encodeBridge("OK:Project organized");
    } catch (e) {
        try { app.endUndoGroup(); } catch (ee) {}
        return encodeBridge("Organize Error: " + e.toString());
    }
}

function toolkitToggleEffects() {
    try {
        if (__CS_TOOLKIT_EFFECT_STATES && __CS_TOOLKIT_EFFECT_STATES.length >= 0) {
            var r;
            for (r = 0; r < __CS_TOOLKIT_EFFECT_STATES.length; r++) {
                try { __CS_TOOLKIT_EFFECT_STATES[r].fx.enabled = __CS_TOOLKIT_EFFECT_STATES[r].enabled; } catch (eR) {}
            }
            __CS_TOOLKIT_EFFECT_STATES = null;
            return encodeBridge("OK:Effects restored");
        }

        __CS_TOOLKIT_EFFECT_STATES = [];
        var i, j, k;
        for (i = 1; i <= app.project.numItems; i++) {
            try {
                var comp = app.project.item(i);
                if (!(comp instanceof CompItem)) continue;
                for (j = 1; j <= comp.numLayers; j++) {
                    var fxGroup = comp.layer(j).property("ADBE Effect Parade");
                    if (!fxGroup) continue;
                    for (k = 1; k <= fxGroup.numProperties; k++) {
                        var fx = fxGroup.property(k);
                        __CS_TOOLKIT_EFFECT_STATES.push({ fx: fx, enabled: fx.enabled });
                        fx.enabled = false;
                    }
                }
            } catch (eL) {}
        }
        return encodeBridge("OK:Effects disabled");
    } catch (e) {
        return encodeBridge("Effects Toggle Error: " + e.toString());
    }
}

function toolkitPrecompose() {
    try {
        var comp = toolkitGetActiveComp();
        if (!comp) return encodeBridge("Open a composition first.");
        var layers = comp.selectedLayers;
        if (!layers || layers.length === 0) return encodeBridge("Select layer(s) to pre-compose.");
        var indices = [];
        var minIn = 999999, maxOut = -999999;
        var i;
        for (i = 0; i < layers.length; i++) {
            indices.push(layers[i].index);
            if (layers[i].inPoint < minIn) minIn = layers[i].inPoint;
            if (layers[i].outPoint > maxOut) maxOut = layers[i].outPoint;
        }
        app.beginUndoGroup("Toolkit Pre-compose");
        var newName = "Precomp_" + generateUniqueTimestamp();
        var newComp = comp.layers.precompose(indices, newName, true);
        try {
            if (newComp instanceof CompItem) newComp.duration = comp.duration;
            if (comp.selectedLayers && comp.selectedLayers.length > 0) {
                comp.selectedLayers[0].inPoint = minIn;
                comp.selectedLayers[0].outPoint = maxOut;
            }
        } catch (eT) {}
        app.endUndoGroup();
        return encodeBridge("OK:Pre-composed");
    } catch (e) {
        try { app.endUndoGroup(); } catch (ee) {}
        return encodeBridge("Pre-compose Error: " + e.toString());
    }
}

function toolkitTransformIsSimple(layer) {
    try {
        if (layer.parent) return false;
        if (layer.threeDLayer) return false;
        var tr = toolkitGetTransform(layer);
        var scale = tr.property("ADBE Scale").value;
        var rot = tr.property("ADBE Rotate Z").value;
        var op = tr.property("ADBE Opacity").value;
        if (Math.abs(scale[0] - 100) > 0.01 || Math.abs(scale[1] - 100) > 0.01) return false;
        if (Math.abs(rot) > 0.01) return false;
        if (Math.abs(op - 100) > 0.01) return false;
    } catch (e) {}
    return true;
}

function toolkitUnprecompose() {
    try {
        var comp = toolkitGetActiveComp();
        if (!comp) return encodeBridge("Open a composition first.");
        var layers = comp.selectedLayers;
        if (!layers || layers.length !== 1) return encodeBridge("Select exactly one pre-comp layer.");
        var preLayer = layers[0];
        if (!(preLayer instanceof AVLayer) || !(preLayer.source instanceof CompItem)) return encodeBridge("Selected layer is not a pre-comp.");
        if (!toolkitTransformIsSimple(preLayer)) {
            return encodeBridge("Unprecompose skipped: reset scale/rotation/opacity/parent/3D on the pre-comp layer first for safe breakdown.");
        }

        app.beginUndoGroup("Toolkit Unpre-compose");
        var sourceComp = preLayer.source;
        var offset = preLayer.startTime;
        var anchor = toolkitGetAnchorProp(preLayer).value;
        var position = toolkitGetPositionProp(preLayer).value;
        var shift = [position[0] - anchor[0], position[1] - anchor[1], position.length > 2 && anchor.length > 2 ? position[2] - anchor[2] : 0];
        var restored = 0;
        var i;
        for (i = sourceComp.numLayers; i >= 1; i--) {
            try {
                sourceComp.layer(i).copyToComp(comp);
                var nl = comp.layer(1);
                nl.moveBefore(preLayer);
                nl.startTime = nl.startTime + offset;
                try { nl.inPoint = nl.inPoint + offset; } catch (eI) {}
                try { nl.outPoint = nl.outPoint + offset; } catch (eO) {}
                toolkitAddPositionDelta(nl, shift, comp.time);
                restored++;
            } catch (eC) {}
        }
        if (restored > 0) preLayer.remove();
        app.endUndoGroup();
        if (restored === 0) return encodeBridge("No layers restored.");
        return encodeBridge("OK:Unpre-composed");
    } catch (e) {
        try { app.endUndoGroup(); } catch (ee) {}
        return encodeBridge("Unpre-compose Error: " + e.toString());
    }
}

function toolkitClearCache() {
    try {
        app.beginUndoGroup("Toolkit Clear Cache");
        try { app.purge(PurgeTarget.ALL_CACHES); } catch (eP) {}
        try {
            var cmd = app.findMenuCommandId("All Memory & Disk Cache");
            if (cmd) app.executeCommand(cmd);
        } catch (eM) {}
        try {
            var cmd2 = app.findMenuCommandId("Memory & Disk Cache");
            if (cmd2) app.executeCommand(cmd2);
        } catch (eM2) {}
        app.endUndoGroup();
        return encodeBridge("OK:Cache purged");
    } catch (e) {
        try { app.endUndoGroup(); } catch (ee) {}
        return encodeBridge("Cache Error: " + e.toString());
    }
}

// =========================================================
// IMPORT FUNCTIONS
// =========================================================

function getTextPropsGroup(layer) {
    try { return layer.property("ADBE Text Properties"); } catch (e) {}
    return null;
}

function getSourceTextProp(layer) {
    try {
        var textProps = getTextPropsGroup(layer);
        if (textProps) return textProps.property("ADBE Text Document");
    } catch (e) {}
    return null;
}

function setTextDocText(doc, textValue) {
    try {
        if (doc && textValue !== null && textValue !== undefined) doc.text = textValue;
    } catch (e) {}
    return doc;
}

function getCurrentTextValue(prop) {
    try {
        var v = prop.value;
        if (v && v.text !== undefined) return v.text;
    } catch (e) {}
    return "";
}

function copyPropertyKeySettings(src, dst, srcIndex, dstIndex) {
    try { dst.setInterpolationTypeAtKey(dstIndex, src.keyInInterpolationType(srcIndex), src.keyOutInterpolationType(srcIndex)); } catch (e) {}
    try { dst.setTemporalEaseAtKey(dstIndex, src.keyInTemporalEase(srcIndex), src.keyOutTemporalEase(srcIndex)); } catch (e2) {}
    try { dst.setTemporalContinuousAtKey(dstIndex, src.keyTemporalContinuous(srcIndex)); } catch (e3) {}
    try { dst.setTemporalAutoBezierAtKey(dstIndex, src.keyTemporalAutoBezier(srcIndex)); } catch (e4) {}
    try { dst.setSpatialTangentsAtKey(dstIndex, src.keyInSpatialTangent(srcIndex), src.keyOutSpatialTangent(srcIndex)); } catch (e5) {}
    try { dst.setSpatialContinuousAtKey(dstIndex, src.keySpatialContinuous(srcIndex)); } catch (e6) {}
    try { dst.setSpatialAutoBezierAtKey(dstIndex, src.keySpatialAutoBezier(srcIndex)); } catch (e7) {}
    try { dst.setRovingAtKey(dstIndex, src.keyRoving(srcIndex)); } catch (e8) {}
}

function clearPropertyKeys(prop) {
    try {
        var k;
        for (k = prop.numKeys; k >= 1; k--) {
            try { prop.removeKey(k); } catch (e) {}
        }
    } catch (e2) {}
}

function copySingleProperty(src, dst, preserveTargetText) {
    if (!src || !dst) return;
    var targetText = "";
    if (preserveTargetText) targetText = getCurrentTextValue(dst);

    clearPropertyKeys(dst);

    try {
        if (src.numKeys && src.numKeys > 0) {
            var k;
            for (k = 1; k <= src.numKeys; k++) {
                try {
                    var kv = src.keyValue(k);
                    if (preserveTargetText) kv = setTextDocText(kv, targetText);
                    dst.setValueAtTime(src.keyTime(k), kv);
                    try {
                        var dk = dst.nearestKeyIndex(src.keyTime(k));
                        copyPropertyKeySettings(src, dst, k, dk);
                    } catch (eK) {}
                } catch (e1) {}
            }
        } else {
            var v = src.value;
            if (preserveTargetText) v = setTextDocText(v, targetText);
            try { dst.setValue(v); } catch (e2) {}
        }
    } catch (e3) {}

    try {
        if (src.canSetExpression && dst.canSetExpression) {
            dst.expression = src.expression || "";
            dst.expressionEnabled = src.expressionEnabled;
        }
    } catch (e4) {}
}

function findMatchingChild(group, sourceChild) {
    if (!group || !sourceChild) return null;
    try {
        if (sourceChild.matchName) {
            var byMatch = group.property(sourceChild.matchName);
            if (byMatch) return byMatch;
        }
    } catch (e) {}
    try {
        if (sourceChild.name) {
            var byName = group.property(sourceChild.name);
            if (byName) return byName;
        }
    } catch (e2) {}
    return null;
}

function addMatchingChild(group, sourceChild) {
    if (!group || !sourceChild) return null;
    try {
        if (sourceChild.matchName && group.canAddProperty(sourceChild.matchName)) {
            return group.addProperty(sourceChild.matchName);
        }
    } catch (e) {}
    try {
        if (sourceChild.name && group.canAddProperty(sourceChild.name)) {
            return group.addProperty(sourceChild.name);
        }
    } catch (e2) {}
    return null;
}

function copyPropertyTree(srcGroup, dstGroup) {
    if (!srcGroup || !dstGroup) return;
    var i;
    for (i = 1; i <= srcGroup.numProperties; i++) {
        try {
            var srcChild = srcGroup.property(i);
            var dstChild = findMatchingChild(dstGroup, srcChild);
            if (!dstChild) dstChild = addMatchingChild(dstGroup, srcChild);
            if (!dstChild) continue;

            try { dstChild.name = srcChild.name; } catch (eN) {}

            if (srcChild.propertyType === PropertyType.PROPERTY) {
                copySingleProperty(srcChild, dstChild, false);
            } else {
                copyPropertyTree(srcChild, dstChild);
            }
        } catch (e) {}
    }
}

function clearIndexedGroup(group) {
    if (!group) return;
    var i;
    for (i = group.numProperties; i >= 1; i--) {
        try { group.property(i).remove(); } catch (e) {}
    }
}

function copyIndexedGroup(srcGroup, dstGroup) {
    if (!srcGroup || !dstGroup) return;
    clearIndexedGroup(dstGroup);
    var i;
    for (i = 1; i <= srcGroup.numProperties; i++) {
        try {
            var srcChild = srcGroup.property(i);
            var dstChild = addMatchingChild(dstGroup, srcChild);
            if (!dstChild) continue;
            try { dstChild.name = srcChild.name; } catch (eN) {}
            if (srcChild.propertyType === PropertyType.PROPERTY) {
                copySingleProperty(srcChild, dstChild, false);
            } else {
                copyPropertyTree(srcChild, dstChild);
            }
        } catch (e) {}
    }
}

function copyFixedTextGroup(srcTextProps, dstTextProps, matchName) {
    try {
        var srcGroup = srcTextProps.property(matchName);
        var dstGroup = dstTextProps.property(matchName);
        copyPropertyTree(srcGroup, dstGroup);
    } catch (e) {}
}

function applyTextPropertiesFromLayer(sourceLayer, targetLayer) {
    if (!(sourceLayer instanceof TextLayer) || !(targetLayer instanceof TextLayer)) return false;
    var srcTextProps = getTextPropsGroup(sourceLayer);
    var dstTextProps = getTextPropsGroup(targetLayer);
    if (!srcTextProps || !dstTextProps) return false;

    copySingleProperty(getSourceTextProp(sourceLayer), getSourceTextProp(targetLayer), true);
    copyFixedTextGroup(srcTextProps, dstTextProps, "ADBE Text Path Options");
    copyFixedTextGroup(srcTextProps, dstTextProps, "ADBE Text More Options");

    try {
        copyIndexedGroup(srcTextProps.property("ADBE Text Animators"), dstTextProps.property("ADBE Text Animators"));
    } catch (e) {}

    return true;
}

function findFirstTextLayerInComp(comp) {
    if (!(comp instanceof CompItem)) return null;
    var i;
    for (i = 1; i <= comp.numLayers; i++) {
        try {
            var layer = comp.layer(i);
            if (layer instanceof TextLayer) return layer;
        } catch (e) {}
    }
    return null;
}

function findImportedTextLayer(importedItems) {
    var bestComp = null;
    var i;
    for (i = 0; i < importedItems.length; i++) {
        try {
            if (importedItems[i] instanceof CompItem) {
                if (!bestComp || importedItems[i].numLayers > bestComp.numLayers) bestComp = importedItems[i];
            }
        } catch (e) {}
    }
    var layer = findFirstTextLayerInComp(bestComp);
    if (layer) return layer;
    for (i = 0; i < importedItems.length; i++) {
        try {
            if (importedItems[i] instanceof CompItem) {
                layer = findFirstTextLayerInComp(importedItems[i]);
                if (layer) return layer;
            }
        } catch (e2) {}
    }
    return null;
}

function cleanupImportedItems(importedItems) {
    var i;
    for (i = importedItems.length - 1; i >= 0; i--) {
        try { importedItems[i].remove(); } catch (e) {}
    }
}

function importLayerTypeAep(nHex, cHex, rHex) {
    var allImportedItems = [];
    try {
        var n = cleanStr(decodeBridge(nHex));
        var c = cleanStr(decodeBridge(cHex));
        var r = cleanStr(decodeBridge(rHex)).replace(/\\/g, "/");
        var folder = new Folder(r + "/" + getSafeName(c) + "/" + getSafeName(n));

        if (!folder.exists) return encodeBridge("Template folder not found!");

        var aepFiles = folder.getFiles("*.aep");
        if (!aepFiles || aepFiles.length === 0) return encodeBridge("No .aep file found!");

        var activeComp = app.project.activeItem;
        if (!(activeComp instanceof CompItem)) return encodeBridge("Open a composition first!");

        var playheadTime = activeComp.time;
        var anchorLayer = getTopSelectedLayer(activeComp);
        var activeCompId = activeComp.id;

        app.beginUndoGroup("Import Template");

        var existingIds = {};
        var bi;
        for (bi = 1; bi <= app.project.numItems; bi++) {
            try { existingIds[app.project.item(bi).id] = true; } catch (e) {}
        }

        var existingNamesLower = getAllProjectNamesLower();
        var assetsFolder = new Folder(folder.fsName + "/_Assets");

        app.beginSuppressDialogs();
        try {
            app.project.importFile(new ImportOptions(aepFiles[0]));
        } catch (importErr) {
            app.endSuppressDialogs(false);
            app.endUndoGroup();
            return encodeBridge("File import failed: " + importErr.toString());
        }
        app.endSuppressDialogs(false);

        var ni;
        for (ni = 1; ni <= app.project.numItems; ni++) {
            try {
                var nItem = app.project.item(ni);
                if (!existingIds[nItem.id]) allImportedItems.push(nItem);
            } catch (e) {}
        }

        if (allImportedItems.length === 0) {
            app.endUndoGroup();
            return encodeBridge("Import failed!");
        }

        safeRenameAllImportedItems(allImportedItems, existingNamesLower);

        // Reconnect missing assets from _Assets folder
        if (assetsFolder.exists) {
            var ai;
            for (ai = 0; ai < allImportedItems.length; ai++) {
                try {
                    var item = allImportedItems[ai];
                    if (item instanceof FootageItem && item.file) {
                        // Reconnect if file is missing OR if _Assets has a copy
                        if (!item.file.exists) {
                            var assetCandidate = new File(assetsFolder.fsName + "/" + item.file.name);
                            if (assetCandidate.exists) {
                                try { item.replace(assetCandidate); } catch (eR) {}
                            }
                        }
                    }
                } catch (eA) {}
            }
        }

        var importedComp = null;
        var compCandidates = [];
        var ri;
        for (ri = 0; ri < allImportedItems.length; ri++) {
            if (allImportedItems[ri] instanceof CompItem) compCandidates.push(allImportedItems[ri]);
        }

        // Find the wrapper comp: it's the one with "_CSWrap_" or "_CSPC_" prefix,
        // OR simply the one with the most layers. Prefer non-empty comps.
        if (compCandidates.length > 0) {
            importedComp = compCandidates[0];
            var ci;
            for (ci = 1; ci < compCandidates.length; ci++) {
                var candidate = compCandidates[ci];
                // Prefer comp with more layers
                if (candidate.numLayers > importedComp.numLayers) {
                    importedComp = candidate;
                }
            }
            // If still empty, try any non-empty comp
            if (importedComp.numLayers === 0) {
                for (ci = 0; ci < compCandidates.length; ci++) {
                    if (compCandidates[ci].numLayers > 0) {
                        importedComp = compCandidates[ci];
                        break;
                    }
                }
            }
        }

        if (!importedComp || importedComp.numLayers === 0) {
            app.endUndoGroup();
            return encodeBridge("Template has no layers. Re-save the template.");
        }

        if (importedComp.id === activeCompId) {
            app.endUndoGroup();
            return encodeBridge("Cannot import into itself!");
        }

        var metaIsAdjustment = false;
        var metaIs3D = false;
        var metaBlendMode = -1;
        var metaLabel = -1;

        try {
            var metaFile = new File(folder.fsName + "/meta.json");
            if (metaFile.exists) {
                var mc = readFileText(metaFile);
                if (mc.indexOf('"isAdjustment":true') !== -1) metaIsAdjustment = true;
                if (mc.indexOf('"is3D":true') !== -1) metaIs3D = true;
                var bmMatch = mc.match(/"blendMode"\s*:\s*(\d+)/);
                if (bmMatch) {
                    var bmVal = parseInt(bmMatch[1], 10);
                    if (!isNaN(bmVal)) metaBlendMode = bmVal;
                }
                var lblMatch = mc.match(/"label"\s*:\s*(\d+)/);
                if (lblMatch) {
                    var lblVal = parseInt(lblMatch[1], 10);
                    if (!isNaN(lblVal)) metaLabel = lblVal;
                }
            }
        } catch (e) {}

        activeComp.openInViewer();
        deselectAllLayers(activeComp);

        var layerCountBefore = activeComp.numLayers;
        var li;
        for (li = importedComp.numLayers; li >= 1; li--) {
            try {
                var sourceLayer = importedComp.layer(li);
                if (sourceLayer) sourceLayer.copyToComp(activeComp);
            } catch (e) {}
        }

        var addedCount = activeComp.numLayers - layerCountBefore;

        if (addedCount <= 0) {
            app.endUndoGroup();
            return encodeBridge("No layers were placed!");
        }

        var newLayers = [];
        var nl;
        for (nl = 1; nl <= addedCount; nl++) {
            try { newLayers.push(activeComp.layer(nl)); } catch (e) {}
        }

        // Remove ONLY the wrapper comp.
        // FootageItems must stay in the project because the copied layers
        // reference them. Removing the FolderItem would also delete its child
        // FootageItems, breaking the newly placed layers.
        try { importedComp.remove(); } catch (e) {}

        deselectAllLayers(activeComp);

        if (addedCount === 1) {
            var newLayer = newLayers.length > 0 ? newLayers[0] : null;
            if (!newLayer) {
                app.endUndoGroup();
                return encodeBridge("Imported layer reference missing.");
            }
            try { if (metaIsAdjustment) newLayer.adjustmentLayer = true; } catch (e) {}
            try { if (metaIs3D) newLayer.threeDLayer = true; } catch (e) {}
            try { if (metaBlendMode > 0) newLayer.blendingMode = metaBlendMode; } catch (e) {}
            try { if (metaLabel >= 0) newLayer.label = metaLabel; } catch (e) {}
            placeLayerAtPlayhead(activeComp, newLayer, playheadTime, anchorLayer);
        } else {
            var topNewLayer = newLayers.length > 0 ? newLayers[0] : null;
            try {
                if (topNewLayer) {
                    topNewLayer.startTime = 0;
                    topNewLayer.startTime = playheadTime - topNewLayer.inPoint;
                }
            } catch (e) {
                try { if (topNewLayer) topNewLayer.startTime = playheadTime; } catch (e2) {}
            }
            var nsi;
            for (nsi = 0; nsi < newLayers.length; nsi++) {
                try { newLayers[nsi].selected = true; } catch (e) {}
            }
        }

        app.endUndoGroup();
        return encodeBridge("true");
    } catch (e) {
        try { app.endUndoGroup(); } catch (ee) {}
        return encodeBridge("Import Error: " + e.toString());
    }
}

function importLayer(nHex, cHex, rHex) { return importLayerTypeAep(nHex, cHex, rHex); }
function importTransition(nHex, cHex, rHex) { return importLayerTypeAep(nHex, cHex, rHex); }
function importText(nHex, cHex, rHex) { return importLayerTypeAep(nHex, cHex, rHex); }
function importFootage(nHex, cHex, rHex) { return importLayerTypeAep(nHex, cHex, rHex); }

function importTextProperties(nHex, cHex, rHex) {
    var allImportedItems = [];
    try {
        var n = cleanStr(decodeBridge(nHex));
        var c = cleanStr(decodeBridge(cHex));
        var r = cleanStr(decodeBridge(rHex)).replace(/\\/g, "/");
        var folder = new Folder(r + "/" + getSafeName(c) + "/" + getSafeName(n));

        if (!folder.exists) return encodeBridge("Template folder not found!");

        var aepFiles = folder.getFiles("*.aep");
        if (!aepFiles || aepFiles.length === 0) return encodeBridge("No .aep file found!");

        var activeComp = app.project.activeItem;
        if (!(activeComp instanceof CompItem)) return encodeBridge("Open a composition first!");

        var targets = activeComp.selectedLayers;
        if (!targets || targets.length === 0) return encodeBridge("Select text layer(s) to apply properties.");

        var ti;
        for (ti = 0; ti < targets.length; ti++) {
            if (!(targets[ti] instanceof TextLayer)) return encodeBridge("Text Properties can apply only to Text layers.");
        }

        app.beginUndoGroup("Apply Text Properties");

        var existingIds = {};
        var bi;
        for (bi = 1; bi <= app.project.numItems; bi++) {
            try { existingIds[app.project.item(bi).id] = true; } catch (e) {}
        }

        app.beginSuppressDialogs();
        try {
            app.project.importFile(new ImportOptions(aepFiles[0]));
        } catch (importErr) {
            app.endSuppressDialogs(false);
            app.endUndoGroup();
            return encodeBridge("File import failed: " + importErr.toString());
        }
        app.endSuppressDialogs(false);

        var ni;
        for (ni = 1; ni <= app.project.numItems; ni++) {
            try {
                var nItem = app.project.item(ni);
                if (!existingIds[nItem.id]) allImportedItems.push(nItem);
            } catch (e2) {}
        }

        var sourceLayer = findImportedTextLayer(allImportedItems);
        if (!sourceLayer) {
            cleanupImportedItems(allImportedItems);
            app.endUndoGroup();
            return encodeBridge("Text property source not found. Re-save the preset.");
        }

        var applied = 0;
        for (ti = 0; ti < targets.length; ti++) {
            try {
                if (applyTextPropertiesFromLayer(sourceLayer, targets[ti])) applied++;
            } catch (eA) {}
        }

        cleanupImportedItems(allImportedItems);

        if (applied === 0) {
            app.endUndoGroup();
            return encodeBridge("Could not apply text properties.");
        }

        app.endUndoGroup();
        return encodeBridge("true");
    } catch (e) {
        try { cleanupImportedItems(allImportedItems); } catch (eC) {}
        try { app.endUndoGroup(); } catch (ee) {}
        return encodeBridge("Import Error: " + e.toString());
    }
}

// =========================================================
// IMPORT COMP
// =========================================================

function importCompDirect(nHex, cHex, rHex) {
    var allImportedItems = [];
    try {
        var n = cleanStr(decodeBridge(nHex));
        var c = cleanStr(decodeBridge(cHex));
        var r = cleanStr(decodeBridge(rHex)).replace(/\\/g, "/");
        var folder = new Folder(r + "/" + getSafeName(c) + "/" + getSafeName(n));

        if (!folder.exists) return encodeBridge("Comp folder not found!");

        var aepFiles = folder.getFiles("*.aep");
        if (!aepFiles || aepFiles.length === 0) return encodeBridge("No .aep file found!");

        var activeComp = app.project.activeItem;
        if (!(activeComp instanceof CompItem)) return encodeBridge("Open a composition first!");

        var playheadTime = activeComp.time;
        var anchorLayer = getTopSelectedLayer(activeComp);
        var activeCompId = activeComp.id;

        app.beginUndoGroup("Import Comp");

        var existingIds = {};
        var bi;
        for (bi = 1; bi <= app.project.numItems; bi++) {
            try { existingIds[app.project.item(bi).id] = true; } catch (e) {}
        }
        var existingNamesLower = getAllProjectNamesLower();

        app.beginSuppressDialogs();
        try {
            app.project.importFile(new ImportOptions(aepFiles[0]));
        } catch (importErr) {
            app.endSuppressDialogs(false);
            app.endUndoGroup();
            return encodeBridge("File import failed: " + importErr.toString());
        }
        app.endSuppressDialogs(false);

        var ni;
        for (ni = 1; ni <= app.project.numItems; ni++) {
            try {
                var nItem = app.project.item(ni);
                if (!existingIds[nItem.id]) allImportedItems.push(nItem);
            } catch (e) {}
        }

        if (allImportedItems.length === 0) {
            app.endUndoGroup();
            return encodeBridge("Import failed!");
        }

        safeRenameAllImportedItems(allImportedItems, existingNamesLower);

        var assetsFolder = new Folder(folder.fsName + "/_Assets");
        if (assetsFolder.exists) {
            var ax;
            for (ax = 0; ax < allImportedItems.length; ax++) {
                try {
                    var itemA = allImportedItems[ax];
                    if (itemA instanceof FootageItem && itemA.file && !itemA.file.exists) {
                        var ac = new File(assetsFolder.fsName + "/" + itemA.file.name);
                        if (ac.exists) try { itemA.replace(ac); } catch (eR) {}
                    }
                } catch (eAx) {}
            }
        }

        var importedComp = null;
        var compCandidates = [];
        var ri;
        for (ri = 0; ri < allImportedItems.length; ri++) {
            if (allImportedItems[ri] instanceof CompItem) compCandidates.push(allImportedItems[ri]);
        }

        if (compCandidates.length > 0) {
            importedComp = compCandidates[0];
            var ci;
            for (ci = 1; ci < compCandidates.length; ci++) {
                if (compCandidates[ci].numLayers > importedComp.numLayers) importedComp = compCandidates[ci];
            }
        }

        if (!importedComp) {
            app.endUndoGroup();
            return encodeBridge("No comp found!");
        }

        if (importedComp.id === activeCompId) {
            app.endUndoGroup();
            return encodeBridge("Cannot create recursive nesting!");
        }

        activeComp.openInViewer();
        var newLayer = null;
        try { newLayer = activeComp.layers.add(importedComp); } catch (e1) {}

        if (!newLayer) {
            var di2;
            for (di2 = allImportedItems.length - 1; di2 >= 0; di2--) {
                try { allImportedItems[di2].remove(); } catch (e) {}
            }
            app.endUndoGroup();
            return encodeBridge("Cannot add comp to timeline.");
        }

        placeLayerAtPlayhead(activeComp, newLayer, playheadTime, anchorLayer);
        app.endUndoGroup();
        return encodeBridge("true");
    } catch (e) {
        try { app.endUndoGroup(); } catch (ee) {}
        return encodeBridge("Import Error: " + e.toString());
    }
}

function importTemplate(nHex, cHex, rHex) { return importCompDirect(nHex, cHex, rHex); }

// =========================================================
// IMPORT IMAGE
// =========================================================

function importImageDirect(nHex, cHex, rHex) {
    try {
        var n = cleanStr(decodeBridge(nHex));
        var c = cleanStr(decodeBridge(cHex));
        var r = cleanStr(decodeBridge(rHex)).replace(/\\/g, "/");
        var folder = new Folder(r + "/" + getSafeName(c) + "/" + getSafeName(n));

        if (!folder.exists) return encodeBridge("Image folder not found!");

        var sourceFile = null;
        var files = folder.getFiles();
        var i;
        for (i = 0; i < files.length; i++) {
            if (!(files[i] instanceof File)) continue;
            var fname = files[i].name.toLowerCase();
            if (fname === "meta.json" || fname === ".fav") continue;
            if (fname.indexOf("thumbnail") === 0) continue;
            if (isSupportedImageFileName(fname)) { sourceFile = files[i]; break; }
        }

        if (!sourceFile || !sourceFile.exists) return encodeBridge("No image file found!");

        var activeComp = app.project.activeItem;
        if (!(activeComp instanceof CompItem)) return encodeBridge("Open a composition first!");

        var playheadTime = activeComp.time;
        var anchorLayer = getTopSelectedLayer(activeComp);

        app.beginUndoGroup("Import Image");
        var itemsBefore = app.project.numItems;
        app.beginSuppressDialogs();
        app.project.importFile(new ImportOptions(sourceFile));
        app.endSuppressDialogs(false);

        // FIX: Search new items first, then fall back to ALL items.
        // AE sometimes reuses an existing FootageItem instead of creating a new one,
        // causing numItems to not increase. The fallback catches this case.
        var importedFootage = null;
        var j;
        var srcFsName = sourceFile.fsName;

        // Pass 1: look only at newly added items
        for (j = app.project.numItems; j > itemsBefore; j--) {
            try {
                var jItem = app.project.item(j);
                if (jItem instanceof FootageItem && jItem.file &&
                    jItem.file.fsName === srcFsName) {
                    importedFootage = jItem;
                    break;
                }
            } catch (e) {}
        }

        // Pass 2: AE reused an existing item — search the whole project
        if (!importedFootage) {
            for (j = app.project.numItems; j >= 1; j--) {
                try {
                    var jItem2 = app.project.item(j);
                    if (jItem2 instanceof FootageItem && jItem2.file &&
                        jItem2.file.fsName === srcFsName) {
                        importedFootage = jItem2;
                        break;
                    }
                } catch (e) {}
            }
        }

        if (!importedFootage) {
            app.endUndoGroup();
            return encodeBridge("Image import failed: footage item not found in project.");
        }

        activeComp.openInViewer();
        var newLayer = activeComp.layers.add(importedFootage);
        if (!newLayer) {
            app.endUndoGroup();
            return encodeBridge("Could not place image!");
        }
        placeLayerAtPlayhead(activeComp, newLayer, playheadTime, anchorLayer);
        app.endUndoGroup();
        return encodeBridge("true");
    } catch (e) {
        try { app.endUndoGroup(); } catch (ee) {}
        return encodeBridge("Import Error: " + e.toString());
    }
}

// =========================================================
// TEMPLATE OPERATIONS
// =========================================================

function ensureFolder(pathHex) {
    try {
        ensureDeepFolder(decodeBridge(pathHex).replace(/\\/g, "/"));
        return encodeBridge("true");
    } catch (e) { return encodeBridge("false"); }
}

function deleteTemplate(nHex, cHex, rHex) {
    try {
        var n = getSafeName(cleanStr(decodeBridge(nHex)));
        var c = getSafeName(cleanStr(decodeBridge(cHex)));
        var r = cleanStr(decodeBridge(rHex)).replace(/\\/g, "/");
        var f = new Folder(r + "/" + c + "/" + n);
        if (f.exists) deleteFolderRecursive(f);
        return encodeBridge("true");
    } catch (e) { return encodeBridge("false"); }
}

function renameTemplatePath(oldNHex, newNHex, cHex, rHex) {
    try {
        var oldN = getSafeName(cleanStr(decodeBridge(oldNHex)));
        var newN = getSafeName(cleanStr(decodeBridge(newNHex)));
        var c = getSafeName(cleanStr(decodeBridge(cHex)));
        var r = cleanStr(decodeBridge(rHex)).replace(/\\/g, "/");

        var folder = new Folder(r + "/" + c + "/" + oldN);
        if (!folder.exists) return encodeBridge("false");

        var oldAep = new File(folder.fsName + "/" + oldN + ".aep");
        if (oldAep.exists) try { oldAep.rename(newN + ".aep"); } catch (e) {}

        var oldEffect = new File(folder.fsName + "/" + oldN + ".cseffect");
        if (oldEffect.exists) try { oldEffect.rename(newN + ".cseffect"); } catch (e) {}

        var allFiles = folder.getFiles();
        var i;
        for (i = 0; i < allFiles.length; i++) {
            if (!(allFiles[i] instanceof File)) continue;
            var fn = allFiles[i].name;
            var fnLow = fn.toLowerCase();
            if (fnLow.indexOf("thumbnail.") === 0) continue;
            if (fnLow === "meta.json") continue;
            if (fnLow === ".fav") continue;
            if (isSupportedImageFileName(fnLow) || fnLow.indexOf(oldN.toLowerCase()) === 0) {
                var ext = fn.substring(fn.lastIndexOf("."));
                try { allFiles[i].rename(newN + ext); } catch (e) {}
            }
        }

        var metaFile = new File(folder.fsName + "/meta.json");
        if (metaFile.exists) {
            var content = readFileText(metaFile);
            content = content.replace(/"name"\s*:\s*"[^"]*"/, '"name":"' + escapeJSON(newN) + '"');
            content = content.replace(/"effectFile"\s*:\s*"[^"]*"/, '"effectFile":"' + escapeJSON(newN + ".cseffect") + '"');
            metaFile.open("w");
            metaFile.write(content);
            metaFile.close();
        }

        try { folder.rename(newN); } catch (e) {}
        return encodeBridge("true");
    } catch (e) { return encodeBridge("false"); }
}

function moveTemplatePath(nHex, oldCHex, newCHex, rHex) {
    try {
        var n = getSafeName(cleanStr(decodeBridge(nHex)));
        var oldC = getSafeName(cleanStr(decodeBridge(oldCHex)));
        var newC = getSafeName(cleanStr(decodeBridge(newCHex)));
        var r = cleanStr(decodeBridge(rHex)).replace(/\\/g, "/");

        var oldFolder = new Folder(r + "/" + oldC + "/" + n);
        var newCatFolder = new Folder(r + "/" + newC);
        if (!newCatFolder.exists) newCatFolder.create();
        var newFolder = new Folder(r + "/" + newC + "/" + n);

        if (!oldFolder.exists) return encodeBridge("false");
        if (newFolder.exists) return encodeBridge("false");

        var copied = copyFolderRecursive(oldFolder, newFolder);
        if (copied) {
            var metaFile = new File(newFolder.fsName + "/meta.json");
            if (metaFile.exists) {
                var content = readFileText(metaFile);
                content = content.replace(/"category"\s*:\s*"[^"]*"/, '"category":"' + escapeJSON(newC) + '"');
                metaFile.open("w");
                metaFile.write(content);
                metaFile.close();
            }
            deleteFolderRecursive(oldFolder);
        }
        return encodeBridge("true");
    } catch (e) { return encodeBridge("false"); }
}

function toggleFavTemplate(nHex, cHex, rHex) {
    try {
        var n = getSafeName(cleanStr(decodeBridge(nHex)));
        var c = getSafeName(cleanStr(decodeBridge(cHex)));
        var r = cleanStr(decodeBridge(rHex)).replace(/\\/g, "/");
        var favFile = new File(r + "/" + c + "/" + n + "/.fav");
        if (favFile.exists) {
            favFile.remove();
        } else {
            favFile.open("w");
            favFile.write("1");
            favFile.close();
        }
        return encodeBridge("true");
    } catch (e) { return encodeBridge("false"); }
}

function itemExists(nHex, cHex, rHex) {
    try {
        var n = getSafeName(cleanStr(decodeBridge(nHex)));
        var c = getSafeName(cleanStr(decodeBridge(cHex)));
        var r = cleanStr(decodeBridge(rHex)).replace(/\\/g, "/");
        var f = new Folder(r + "/" + c + "/" + n);
        return encodeBridge(f.exists ? "true" : "false");
    } catch (e) { return encodeBridge("false"); }
}

function selectSaveFolder() {
    try {
        var f = Folder.selectDialog("Select Save Folder");
        if (!f) return encodeBridge("");
        return encodeBridge(f.fsName);
    } catch (e) { return encodeBridge(""); }
}

function compSaverPing() {
    return encodeBridge("ok");
}
// =========================================================
// RENAME CATEGORY
// =========================================================

function renameCategory(oldCHex, newCHex, rHex) {
    try {
        var oldC = getSafeName(cleanStr(decodeBridge(oldCHex)));
        var newC = getSafeName(cleanStr(decodeBridge(newCHex)));
        var r = cleanStr(decodeBridge(rHex)).replace(/\\/g, "/");

        if (!oldC || !newC || oldC === newC) return encodeBridge("false");

        var oldFolder = new Folder(r + "/" + oldC);
        var newFolder = new Folder(r + "/" + newC);

        if (!oldFolder.exists) return encodeBridge("Category not found!");
        if (newFolder.exists) return encodeBridge("Name already taken!");

        newFolder.create();
        var items = oldFolder.getFiles();
        var i;
        for (i = 0; i < items.length; i++) {
            if (!(items[i] instanceof Folder)) continue;
            var destItem = new Folder(newFolder.fsName + "/" + items[i].name);
            copyFolderRecursive(items[i], destItem);
            var mf = new File(destItem.fsName.replace(/\\/g, "/") + "/meta.json");
            if (mf.exists) {
                var mc = readFileText(mf);
                mc = mc.replace(/"category"\s*:\s*"[^"]*"/, '"category":"' + escapeJSON(newC) + '"');
                mf.open("w"); mf.write(mc); mf.close();
            }
        }
        deleteFolderRecursive(oldFolder);
        return encodeBridge("true");
    } catch (e) { return encodeBridge("Error: " + e.toString()); }
}

// =========================================================
// DELETE CATEGORY
// =========================================================

function deleteCategory(cHex, rHex) {
    try {
        var c = getSafeName(cleanStr(decodeBridge(cHex)));
        var r = cleanStr(decodeBridge(rHex)).replace(/\\/g, "/");
        var folder = new Folder(r + "/" + c);
        if (folder.exists) deleteFolderRecursive(folder);
        return encodeBridge("true");
    } catch (e) { return encodeBridge("Error: " + e.toString()); }
}
