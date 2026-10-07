import { convertImage } from './converter.js';
import { makeZip } from './zip.js';

const fileInput = document.querySelector("#file-input");
const dropZone = document.querySelector("#drop-zone");
const queueSection = document.querySelector("#queue-section");
const fileList = document.querySelector("#file-list");
const fileCount = document.querySelector("#file-count");
const convertButton = document.querySelector("#convert");
const downloadAllButton = document.querySelector("#download-all");
const clearButton = document.querySelector("#clear-list");
const progressWrap = document.querySelector("#progress-wrap");
const progressBar = document.querySelector("#progress-bar");
const progressTrack = document.querySelector(".progress-track");
const progressLabel = document.querySelector("#progress-label");
const entries = [];
let converting = false;

document.querySelector("#choose-files").addEventListener("click", () => fileInput.click());
const addMoreButton = document.querySelector("#add-more");
const linksInput = document.querySelector("#image-links");
const addLinksButton = document.querySelector("#add-links");
document.querySelector("#add-more").addEventListener("click", () => fileInput.click());
addLinksButton.addEventListener("click", addImageLinks);
fileInput.addEventListener("change", () => {
  addFiles(fileInput.files);
  fileInput.value = "";
});

for (const eventName of ["dragenter", "dragover"]) {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("dragging");
  });
}
for (const eventName of ["dragleave", "drop"]) {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    if (eventName === "drop") addFiles(event.dataTransfer.files);
    dropZone.classList.remove("dragging");
  });
}

clearButton.addEventListener("click", () => {
  if (converting) return;
  entries.splice(0, entries.length);
  renderQueue();
});
convertButton.addEventListener("click", convertAll);
downloadAllButton.addEventListener("click", downloadArchive);

function addFiles(files) {
  if (converting) return;
  const images = Array.from(files).filter((file) => file.type.startsWith("image/"));
  for (const file of images) {
    entries.push({ file, source: file, result: null, error: null });
  }
  renderQueue();
  if (files.length > images.length) {
    setProgressMessage("Se omitieron los archivos que no son imágenes.");
  }
}

function addImageLinks() {
  if (converting) return;
  const lines = linksInput.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const invalid = [];
  for (const value of lines) {
    let url;
    try {
      url = new URL(value);
    } catch {
      invalid.push(value);
      continue;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      invalid.push(value);
      continue;
    }
    const wikiFileTitle = getWikiFileTitle(url);
    const pathName = wikiFileTitle
      ? wikiFileTitle.split(":").pop().replace(/_/g, " ")
      : decodeURIComponent(url.pathname.split("/").pop() || "imagen");
    const name = pathName.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_") || "imagen";
    entries.push({
      file: { name, size: 0 },
      source: url.href,
      wikiFileTitle,
      result: null,
      error: null
    });
  }
  linksInput.value = "";
  renderQueue();
  if (invalid.length) {
    setProgressMessage(`${invalid.length} enlace${invalid.length === 1 ? "" : "s"} no válido${invalid.length === 1 ? "" : "s"}; usa una URL http o https.`);
  }
}

function getWikiFileTitle(url) {
  if (!/(^|\.)wiki\.gg$/i.test(url.hostname)) return null;
  let mediaPath;
  try {
    mediaPath = decodeURIComponent(url.hash.slice(1));
  } catch {
    return null;
  }
  const match = mediaPath.match(/^\/media\/(?:File|Image):(.+)$/i);
  return match ? `File:${match[1].replace(/_/g, " ")}` : null;
}

function renderQueue() {
  queueSection.hidden = entries.length === 0;
  fileCount.textContent = `${entries.length} ${entries.length === 1 ? "imagen" : "imágenes"}`;
  fileList.replaceChildren();
  entries.forEach((entry, index) => {
    const row = document.createElement("div");
    row.className = "file-row";

    const info = document.createElement("div");
    info.className = "file-info";
    const name = document.createElement("div");
    name.className = "file-name";
    name.textContent = entry.file.name;
    const size = document.createElement("div");
    size.className = "file-size";
    size.textContent = typeof entry.source === "string" ? "Enlace web" : formatSize(entry.file.size);
    info.append(name, size);

    const status = document.createElement("span");
    status.className = `file-status${entry.result ? " done" : entry.error ? " error" : ""}`;
    status.textContent = entry.result
      ? entry.result.frameCount > 1 ? `GIF animado · ${entry.result.frameCount} cuadros` : "GIF estático"
      : entry.error ? "Error — ver detalle" : "Pendiente";
    if (entry.error) status.title = entry.error;
    const tools = document.createElement("div");
    tools.className = "file-tools";
    tools.append(status);
    if (entry.result) {
      const download = document.createElement("button");
      download.className = "button small";
      download.type = "button";
      download.textContent = "Descargar";
      download.disabled = converting;
      download.setAttribute("aria-label", `Descargar ${entry.result.name}`);
      download.addEventListener("click", () => downloadOne(entry.result));
      tools.append(download);
    }

    const remove = document.createElement("button");
    remove.className = "button small remove";
    remove.type = "button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Quitar ${entry.file.name}`);
    remove.disabled = converting;
    remove.addEventListener("click", () => {
      entries.splice(index, 1);
      renderQueue();
    });
    row.append(info, tools, remove);
    fileList.append(row);
  });

  const readyCount = entries.filter((entry) => entry.result).length;
  downloadAllButton.disabled = converting || readyCount === 0;
  convertButton.disabled = converting || entries.length === 0;
  clearButton.disabled = converting;
  addMoreButton.disabled = converting;
  addLinksButton.disabled = converting;
  linksInput.disabled = converting;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unit]}`;
}

function setProgress(done, total, message) {
  const percent = total ? Math.round((done / total) * 100) : 0;
  progressWrap.hidden = false;
  progressBar.style.width = `${percent}%`;
  progressTrack.setAttribute("aria-valuenow", String(percent));
  progressLabel.textContent = message;
}

function setProgressMessage(message) {
  progressWrap.hidden = false;
  progressLabel.textContent = message;
}

async function convertAll() {
  if (converting) return;
  converting = true;
  progressWrap.hidden = false;
  renderQueue();
  const pending = entries.filter((entry) => !entry.result);
  let completed = 0;

  for (const entry of pending) {
    try {
      entry.result = await convertImage(entry);
      entry.result.name = uniqueGifName(entry.result.name, entry);
      entry.error = null;
    } catch (error) {
      entry.error = error instanceof Error ? error.message : String(error);
      console.error(`No se pudo convertir "${entry.file.name}":`, error);
    }
    completed++;
    renderQueue();
    setProgress(completed, pending.length, `Procesadas ${completed} de ${pending.length} imágenes`);
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }

  converting = false;
  renderQueue();
  const failed = pending.filter((entry) => entry.error).length;
  setProgress(
    pending.length,
    pending.length,
    failed ? `Conversión terminada: ${failed} imagen${failed === 1 ? "" : "es"} no se pudo${failed === 1 ? "" : "ieron"} convertir.` : "Conversión terminada. Tus GIFs están listos para descargar."
  );
}

function uniqueGifName(name, currentEntry) {
  const usedNames = new Set(
    entries.filter((entry) => entry !== currentEntry && entry.result).map((entry) => entry.result.name)
  );
  if (!usedNames.has(name)) return name;
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const extension = dot > 0 ? name.slice(dot) : "";
  let suffix = 2;
  while (usedNames.has(`${base} (${suffix})${extension}`)) suffix++;
  return `${base} (${suffix})${extension}`;
}

function downloadOne(result) {
  const url = URL.createObjectURL(new Blob([result.bytes], { type: "image/gif" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = result.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadArchive() {
  const ready = entries.filter((entry) => entry.result).map((entry) => entry.result);
  if (!ready.length) return;
  const archive = makeZip(ready);
  const url = URL.createObjectURL(new Blob([archive], { type: "application/zip" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "imagenes-convertidas.zip";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
