// Parses the "XRD JSON" file downloaded from a Materials Project material page
// (shape: { meta: ["amplitude","hkl","two_theta","d_spacing"], pattern: [[...], ...] })
// and exports the 2Theta / hkl values as an Excel workbook, one sheet per file.

const dropzone = document.getElementById("dropzone");
const browseBtn = document.getElementById("browseBtn");
const fileInput = document.getElementById("fileInput");
const cardsEl = document.getElementById("cards");
const actionsEl = document.getElementById("actions");
const downloadBtn = document.getElementById("downloadBtn");
const clearBtn = document.getElementById("clearBtn");
const statusEl = document.getElementById("status");

// Each entry: { id, fileName, sheetName, rows: [{twoTheta, hkl}], wavelength, error }
const entries = [];
let nextId = 1;

browseBtn.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  handleFiles(e.dataTransfer.files);
});
fileInput.addEventListener("change", (e) => {
  handleFiles(e.target.files);
  fileInput.value = "";
});
clearBtn.addEventListener("click", () => {
  entries.length = 0;
  render();
});
downloadBtn.addEventListener("click", downloadWorkbook);

function handleFiles(fileList) {
  const files = Array.from(fileList || []).filter((f) =>
    f.name.toLowerCase().endsWith(".json") || f.type === "application/json"
  );
  files.forEach(readFile);
}

function readFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const entry = {
      id: nextId++,
      fileName: file.name,
      sheetName: sanitizeSheetName(file.name.replace(/\.json$/i, "")),
      rows: [],
      wavelength: null,
      error: null,
    };
    try {
      const json = JSON.parse(reader.result);
      const parsed = parseXrdJson(json);
      entry.rows = parsed.rows;
      entry.wavelength = parsed.wavelength;
      if (entry.rows.length === 0) {
        entry.error = "No 2Θ/hkl pairs found in this file.";
      }
    } catch (err) {
      entry.error = "Could not parse this file: " + err.message;
    }
    entries.push(entry);
    render();
  };
  reader.onerror = () => {
    entries.push({
      id: nextId++,
      fileName: file.name,
      sheetName: sanitizeSheetName(file.name),
      rows: [],
      error: "Could not read this file.",
    });
    render();
  };
  reader.readAsText(file);
}

// Accepts the Materials Project XRD JSON shape and returns
// { rows: [{twoTheta, hkl}], wavelength: {element, in_angstroms} | null }
function parseXrdJson(json) {
  let patternRows = null;
  let meta = null;
  let wavelength = null;

  if (Array.isArray(json)) {
    patternRows = json;
  } else if (json && Array.isArray(json.pattern)) {
    patternRows = json.pattern;
    meta = Array.isArray(json.meta) ? json.meta : null;
    wavelength = json.wavelength || null;
  } else {
    throw new Error('expected a "pattern" array');
  }

  let hklIndex = 1;
  let twoThetaIndex = 2;
  if (meta) {
    const hi = meta.indexOf("hkl");
    const ti = meta.indexOf("two_theta");
    if (hi !== -1) hklIndex = hi;
    if (ti !== -1) twoThetaIndex = ti;
  }

  const rows = [];
  for (const row of patternRows) {
    if (!Array.isArray(row)) continue;
    const twoTheta = Number(row[twoThetaIndex]);
    const hkl = extractHkl(row[hklIndex]);
    if (Number.isFinite(twoTheta) && hkl) {
      rows.push({ twoTheta: roundTo(twoTheta, 3), hkl: formatHkl(hkl) });
    }
  }
  rows.sort((a, b) => a.twoTheta - b.twoTheta);
  return { rows, wavelength };
}

// Normalizes the many shapes MP/pymatgen use for an hkl entry down to [h, k, l].
function extractHkl(value) {
  if (!Array.isArray(value) || value.length === 0) return null;
  // Plain [h, k, l]
  if (typeof value[0] === "number") {
    return value.slice(0, 3).map(Number);
  }
  // List of equivalent reflections, e.g. [{hkl: [1,1,1], multiplicity: 8}, ...]
  const first = value[0];
  if (first && Array.isArray(first.hkl)) {
    return first.hkl.slice(0, 3).map(Number);
  }
  if (Array.isArray(first)) {
    return first.slice(0, 3).map(Number);
  }
  return null;
}

// Matches the Materials Project convention of concatenating single-digit,
// non-negative indices (e.g. [1,1,1] -> "111"); falls back to a spaced form
// for negative or multi-digit indices (e.g. [1,1,-1] -> "1 1 -1").
function formatHkl(hkl) {
  const allSimpleDigits = hkl.every(
    (v) => Number.isInteger(v) && v >= 0 && v <= 9
  );
  return allSimpleDigits ? hkl.join("") : hkl.join(" ");
}

function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function sanitizeSheetName(name) {
  const cleaned = name.replace(/[\\/?*[\]:]/g, "").trim() || "Sheet";
  return cleaned.slice(0, 31);
}

function render() {
  cardsEl.innerHTML = "";
  entries.forEach((entry) => cardsEl.appendChild(renderCard(entry)));
  const hasValidData = entries.some((e) => !e.error && e.rows.length > 0);
  actionsEl.hidden = entries.length === 0;
  downloadBtn.disabled = !hasValidData;
  statusEl.textContent = "";
}

function renderCard(entry) {
  const card = document.createElement("div");
  card.className = "card" + (entry.error ? " error" : "");

  const header = document.createElement("div");
  header.className = "card-header";

  const label = document.createElement("label");
  label.textContent = "Sheet name:";
  label.htmlFor = "sheet-name-" + entry.id;

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.id = "sheet-name-" + entry.id;
  nameInput.value = entry.sheetName;
  nameInput.addEventListener("input", () => {
    entry.sheetName = sanitizeSheetName(nameInput.value);
  });

  const meta = document.createElement("span");
  meta.className = "card-meta";
  meta.textContent = entry.error
    ? entry.fileName
    : `${entry.fileName} · ${entry.rows.length} peaks` +
      (entry.wavelength ? ` · ${entry.wavelength.element} Kα` : "");

  const removeBtn = document.createElement("button");
  removeBtn.className = "remove";
  removeBtn.textContent = "Remove";
  removeBtn.addEventListener("click", () => {
    const idx = entries.findIndex((e) => e.id === entry.id);
    if (idx !== -1) entries.splice(idx, 1);
    render();
  });

  header.append(label, nameInput, meta, removeBtn);
  card.appendChild(header);

  if (entry.error) {
    const msg = document.createElement("p");
    msg.className = "error-message";
    msg.textContent = entry.error;
    card.appendChild(msg);
    return card;
  }

  const tableWrap = document.createElement("div");
  tableWrap.className = "table-wrap";
  const table = document.createElement("table");
  const preview = entry.rows.slice(0, 5);
  table.innerHTML =
    "<thead><tr><th>2Θ</th><th>hkl</th></tr></thead><tbody>" +
    preview
      .map((r) => `<tr><td>${r.twoTheta}</td><td>${r.hkl}</td></tr>`)
      .join("") +
    "</tbody>";
  tableWrap.appendChild(table);
  card.appendChild(tableWrap);

  if (entry.rows.length > preview.length) {
    const more = document.createElement("p");
    more.className = "more-rows";
    more.textContent = `+ ${entry.rows.length - preview.length} more row(s)`;
    card.appendChild(more);
  }

  return card;
}

function downloadWorkbook() {
  const valid = entries.filter((e) => !e.error && e.rows.length > 0);
  if (valid.length === 0) return;

  const wb = XLSX.utils.book_new();
  const usedNames = new Set();

  valid.forEach((entry) => {
    let name = entry.sheetName || "Sheet";
    let unique = name;
    let n = 2;
    while (usedNames.has(unique.toLowerCase())) {
      unique = sanitizeSheetName(`${name} (${n++})`);
    }
    usedNames.add(unique.toLowerCase());

    const sheetData = [["2Θ", "hkl"], ...entry.rows.map((r) => [r.twoTheta, r.hkl])];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws["!cols"] = [{ wch: 10 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws, unique);
  });

  const fileName =
    valid.length === 1 ? `${valid[0].sheetName}_XRD.xlsx` : "MP_XRD_data.xlsx";
  XLSX.writeFile(wb, fileName);
  statusEl.textContent = `Downloaded ${fileName}`;
}
