// File Converter — detects each file's type and converts it in the browser (no upload).
// Images ↔ images, images + PDFs → one PDF, PDF pages → images.
(() => {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  const TARGETS = [
    { id: "webp", mime: "image/webp", label: "WEBP" },
    { id: "jpg", mime: "image/jpeg", label: "JPG" },
    { id: "png", mime: "image/png", label: "PNG" },
    { id: "avif", mime: "image/avif", label: "AVIF" },
    { id: "pdf", mime: "application/pdf", label: "PDF" },
  ];
  const A4 = [595.28, 841.89]; // points

  const TEXT = {
    vi: {
      title: "Chuyển đổi file",
      subtitle: "Ảnh ↔ ảnh, ảnh → PDF, PDF → ảnh — chạy ngay trên trình duyệt, file không được tải lên đâu cả.",
      detected: "Đã nhận",
      to: "Đổi sang",
      quality: "Chất lượng",
      q50: "Nhẹ nhất", q65: "Nhẹ", q80: "Mặc định", q90: "Nét", q100: "Nét nhất",
      qhints: {
        50: "File nhỏ nhất — hợp xem trước, gửi nhanh.",
        65: "Nhẹ hơn mặc định — hợp trang web nhiều ảnh.",
        80: "Cân bằng dung lượng và độ nét — khuyên dùng.",
        90: "Nét hơn mặc định — hợp ảnh sản phẩm, banner.",
        100: "Giữ chi tiết tối đa — file lớn nhất.",
      },
      pngNote: "PNG luôn giữ nguyên chất lượng, không nén được theo cách này.",
      pdfNote: "Gộp tất cả thành 1 file PDF khổ A4 theo thứ tự trong danh sách (dùng ↑ ↓ để sắp xếp).",
      fromPdfNote: "Mỗi trang PDF thành 1 ảnh.",
      drop: "Kéo thả file vào đây hoặc bấm để chọn",
      dropHint: "Ảnh (JPG, PNG, WEBP, AVIF, GIF, BMP, SVG) hoặc PDF — chọn được nhiều file, hoặc dán bằng Ctrl/Cmd + V.",
      downloadZip: "Tải tất cả (ZIP)",
      downloadPdf: "Tải PDF",
      clear: "Xóa hết",
      download: "Tải",
      remove: "Xóa",
      up: "Lên",
      down: "Xuống",
      processing: "Đang xử lý…",
      error: "Không đọc được file này",
      unsupported: "Chưa hỗ trợ loại file này",
      merged: "Đã gộp vào PDF",
      pages: "trang",
      files: "file",
      image: "ảnh",
      footer: "Làm bởi",
      switchTo: "EN",
      switchTitle: "English",
      zipName: "file-da-chuyen-doi",
      pdfName: "tai-lieu",
      pageWord: "trang",
    },
    en: {
      title: "File converter",
      subtitle: "Image ↔ image, images → PDF, PDF → images — runs in your browser, nothing is uploaded.",
      detected: "Detected",
      to: "Convert to",
      quality: "Quality",
      q50: "Smallest", q65: "Light", q80: "Default", q90: "Sharp", q100: "Sharpest",
      qhints: {
        50: "Smallest files — good for previews and quick sharing.",
        65: "Lighter than default — good for image-heavy pages.",
        80: "Balanced size and sharpness — recommended.",
        90: "Sharper than default — good for product photos and banners.",
        100: "Keeps maximum detail — largest files.",
      },
      pngNote: "PNG is lossless, so this setting does not apply.",
      pdfNote: "Everything is merged into one A4 PDF in list order (use ↑ ↓ to reorder).",
      fromPdfNote: "Each PDF page becomes one image.",
      drop: "Drop files here or click to choose",
      dropHint: "Images (JPG, PNG, WEBP, AVIF, GIF, BMP, SVG) or PDF — pick several, or paste with Ctrl/Cmd + V.",
      downloadZip: "Download all (ZIP)",
      downloadPdf: "Download PDF",
      clear: "Clear",
      download: "Download",
      remove: "Remove",
      up: "Up",
      down: "Down",
      processing: "Processing…",
      error: "Could not read this file",
      unsupported: "File type not supported",
      merged: "Merged into the PDF",
      pages: "pages",
      files: "files",
      image: "images",
      footer: "Made by",
      switchTo: "VI",
      switchTitle: "Tiếng Việt",
      zipName: "converted-files",
      pdfName: "document",
      pageWord: "page",
    },
  };

  const $ = (id) => document.getElementById(id);
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  };
  const state = {
    lang: store.get("ic-lang") || (navigator.language.startsWith("vi") ? "vi" : "en"),
    target: "webp",
    quality: 80,
    targets: [],
    items: [], // { file, kind: image|pdf|other, label, thumb, outs: [{name, blob, url}], error, busy }
    combined: null, // { blob, url } when target is PDF
    run: 0,
  };

  const t = (key) => TEXT[state.lang][key];
  const target = () => TARGETS.find((f) => f.id === state.target);
  const formatBytes = (n) =>
    n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`;
  const pct = (a, b) => `${b <= a ? "-" : "+"}${Math.abs(Math.round((1 - b / a) * 100))}%`;
  const base = (name) => name.replace(/\.[^.]+$/, "");
  const extOf = (name) => (name.match(/\.([^.]+)$/)?.[1] || "").toLowerCase();

  // Detect type from the file's content type, falling back to the extension
  function detect(file) {
    const ext = extOf(file.name);
    if (file.type === "application/pdf" || ext === "pdf") return { kind: "pdf", label: "PDF" };
    if (file.type.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "avif", "gif", "bmp", "svg"].includes(ext)) {
      const sub = (file.type.split("/")[1] || ext).replace("jpeg", "jpg").replace("svg+xml", "svg");
      return { kind: "image", label: sub.toUpperCase() };
    }
    return { kind: "other", label: (ext || "?").toUpperCase() };
  }

  // Only show image formats this browser can encode (AVIF is not everywhere)
  async function buildTargets() {
    const c = document.createElement("canvas");
    c.width = c.height = 2;
    state.targets = [];
    for (const f of TARGETS) {
      if (f.id === "pdf") { state.targets.push(f); continue; }
      const blob = await new Promise((r) => c.toBlob(r, f.mime, 0.8));
      if (blob && blob.type === f.mime) state.targets.push(f);
    }
    $("format").replaceChildren(
      ...state.targets.map((f) => {
        const b = document.createElement("button");
        b.type = "button";
        b.dataset.format = f.id;
        b.textContent = f.label;
        return b;
      })
    );
    syncTarget();
  }

  function syncTarget() {
    [...$("format").children].forEach((b) => b.classList.toggle("active", b.dataset.format === state.target));
    const lossless = state.target === "png";
    [...$("quality").children].forEach((b) => {
      b.classList.toggle("active", Number(b.dataset.q) === state.quality);
      b.disabled = lossless;
    });
    const hasPdf = state.items.some((i) => i.kind === "pdf");
    let hint = lossless ? t("pngNote") : t("qhints")[state.quality];
    if (state.target === "pdf") hint += " " + t("pdfNote");
    else if (hasPdf) hint += " " + t("fromPdfNote");
    $("qhint").textContent = hint;
  }

  function syncDetected() {
    const counts = {};
    state.items.forEach((i) => (counts[i.label] = (counts[i.label] || 0) + 1));
    const parts = Object.entries(counts).map(([k, n]) => `${n} ${k}`);
    $("detected").hidden = parts.length === 0;
    $("detectedList").textContent = parts.join(" · ");
  }

  function applyLang() {
    document.documentElement.lang = state.lang;
    document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
    $("lang").textContent = t("switchTo");
    $("lang").title = t("switchTitle");
    syncTarget();
    render();
  }

  const loadImage = (url) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });

  const toBlob = (canvas, mime, q) =>
    new Promise((r, j) => canvas.toBlob((b) => (b ? r(b) : j(new Error("encode failed"))), mime, q));

  // Draw an image file to a canvas (white background when the target has no transparency)
  async function imageCanvas(item, opaque) {
    const img = await loadImage(item.srcUrl);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || 1024;
    canvas.height = img.naturalHeight || 1024;
    const ctx = canvas.getContext("2d");
    if (opaque) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  async function* pdfPages(item, scale) {
    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(await item.file.arrayBuffer()) }).promise;
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const vp = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(vp.width);
      canvas.height = Math.round(vp.height);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: vp, intent: "print" }).promise; // "print" avoids rAF, so it also runs in background tabs
      yield { canvas, page: p, total: doc.numPages };
    }
  }

  // Image target: each image → one file, each PDF page → one file
  async function convertToImage(item) {
    const f = target();
    const q = state.quality / 100;
    const ext = f.id;
    if (item.kind === "image") {
      const canvas = await imageCanvas(item, f.id === "jpg");
      let blob = await toBlob(canvas, f.mime, q);
      // Same format and no smaller: keep the original instead of a bigger copy
      if (item.file.type === f.mime && blob.size >= item.file.size) blob = item.file;
      return [{ name: `${base(item.file.name)}.${ext}`, blob }];
    }
    const outs = [];
    for await (const { canvas, page, total } of pdfPages(item, 2)) {
      const blob = await toBlob(canvas, f.mime, q);
      const name = total > 1 ? `${base(item.file.name)}-${t("pageWord")}-${page}.${ext}` : `${base(item.file.name)}.${ext}`;
      outs.push({ name, blob });
    }
    return outs;
  }

  // PDF target: images become A4 pages, PDF pages are copied as-is
  async function buildPdf(run) {
    const { PDFDocument } = PDFLib;
    const out = await PDFDocument.create();
    const q = state.quality / 100;
    for (const item of state.items) {
      if (run !== state.run) return null;
      if (item.kind === "other") continue;
      item.busy = true;
      render();
      try {
        if (item.kind === "pdf") {
          const src = await PDFDocument.load(new Uint8Array(await item.file.arrayBuffer()), { ignoreEncryption: true });
          (await out.copyPages(src, src.getPageIndices())).forEach((p) => out.addPage(p));
        } else {
          const canvas = await imageCanvas(item, true);
          const jpg = await toBlob(canvas, "image/jpeg", q);
          const img = await out.embedJpg(new Uint8Array(await jpg.arrayBuffer()));
          const landscape = img.width > img.height;
          const [pw, ph] = landscape ? [A4[1], A4[0]] : A4;
          const s = Math.min(pw / img.width, ph / img.height);
          const w = img.width * s;
          const h = img.height * s;
          out.addPage([pw, ph]).drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
        }
        item.done = true;
      } catch (e) {
        console.error(e);
        item.error = t("error");
      }
      item.busy = false;
      render();
    }
    if (!out.getPageCount()) return null;
    return new Blob([await out.save()], { type: "application/pdf" });
  }

  function reset() {
    state.items.forEach((i) => {
      i.outs?.forEach((o) => URL.revokeObjectURL(o.url));
      i.outs = undefined;
      i.error = i.kind === "other" ? t("unsupported") : undefined;
      i.done = false;
      i.busy = false;
    });
    if (state.combined) URL.revokeObjectURL(state.combined.url);
    state.combined = null;
  }

  async function process() {
    const run = ++state.run;
    reset();
    render();
    if (state.target === "pdf") {
      const blob = await buildPdf(run);
      if (run !== state.run) return;
      state.combined = blob ? { blob, url: URL.createObjectURL(blob) } : null;
      render();
      return;
    }
    for (const item of state.items) {
      if (item.kind === "other") continue;
      item.busy = true;
      render();
      try {
        const outs = await convertToImage(item);
        if (run !== state.run) return;
        item.outs = outs.map((o) => ({ ...o, url: URL.createObjectURL(o.blob) }));
        item.done = true;
      } catch (e) {
        if (run !== state.run) return;
        console.error(e);
        item.error = t("error");
      }
      item.busy = false;
      render();
    }
  }

  const outSize = (item) => (item.outs || []).reduce((s, o) => s + o.blob.size, 0);

  function render() {
    const { items } = state;
    const pdfMode = state.target === "pdf";
    $("result").hidden = items.length === 0;
    const active = items.filter((i) => i.kind !== "other");
    const busy = active.some((i) => !i.done && !i.error);
    const totalIn = active.filter((i) => i.done).reduce((s, i) => s + i.file.size, 0);
    const totalOut = pdfMode ? state.combined?.blob.size || 0 : active.reduce((s, i) => s + outSize(i), 0);
    const doneCount = active.filter((i) => i.done || i.error).length;

    if (busy) $("summary").textContent = `${t("processing")} ${doneCount}/${active.length}`;
    else if (totalOut)
      $("summary").innerHTML = `${items.length} ${t("files")} · ${formatBytes(totalIn)} → <b>${formatBytes(totalOut)}</b> <span class="${totalOut <= totalIn ? "good" : "warn"}">(${pct(totalIn, totalOut)})</span>`;
    else $("summary").textContent = "";
    $("zip").textContent = pdfMode ? t("downloadPdf") : t("downloadZip");
    $("zip").disabled = busy || !totalOut;
    syncDetected();

    $("list").replaceChildren(
      ...items.map((item, idx) => {
        const li = document.createElement("li");
        let thumb;
        if (item.thumb) {
          thumb = document.createElement("img");
          thumb.alt = "";
          thumb.src = item.thumb;
        } else {
          thumb = document.createElement("span");
          thumb.className = `badge ${item.kind}`;
          thumb.textContent = item.label;
        }
        const info = document.createElement("div");
        info.className = "info";
        const name = document.createElement("div");
        name.className = "name";
        const n = item.outs?.length || 0;
        name.textContent = n === 1 ? item.outs[0].name : item.file.name;
        const meta = document.createElement("div");
        meta.className = "meta";
        const from = `${item.label} → ${target().label}`;
        if (item.error) {
          meta.innerHTML = `<span class="warn"></span>`;
          meta.firstChild.textContent = item.error;
        } else if (item.busy || (!item.done && !pdfMode) || (pdfMode && !item.done && !state.combined)) meta.textContent = `${from} · ${t("processing")}`;
        else if (pdfMode) meta.textContent = `${from} · ${t("merged")}`;
        else
          meta.textContent = `${from} · ${formatBytes(item.file.size)} → ${formatBytes(outSize(item))} (${pct(item.file.size, outSize(item))})${n > 1 ? ` · ${n} ${t("image")}` : ""}`;
        info.append(name, meta);

        const btns = document.createElement("div");
        btns.className = "row-actions";
        if (pdfMode) {
          const mk = (label, title, disabled, fn) => {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "btn-sm btn-icon";
            b.textContent = label;
            b.title = title;
            b.disabled = disabled;
            b.onclick = fn;
            return b;
          };
          btns.append(
            mk("↑", t("up"), idx === 0, () => move(idx, -1)),
            mk("↓", t("down"), idx === items.length - 1, () => move(idx, 1))
          );
        } else {
          const dl = document.createElement("button");
          dl.type = "button";
          dl.className = "btn-sm";
          dl.title = t("download");
          dl.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg><span></span>`;
          dl.querySelector("span").textContent = t("download");
          dl.disabled = !n;
          dl.onclick = () => download(item);
          btns.append(dl);
        }
        const rm = document.createElement("button");
        rm.type = "button";
        rm.className = "btn-sm btn-icon";
        rm.textContent = "✕";
        rm.title = t("remove");
        rm.onclick = () => removeItem(item);
        btns.append(rm);
        li.append(thumb, info, btns);
        return li;
      })
    );
  }

  function move(idx, dir) {
    const items = state.items;
    [items[idx], items[idx + dir]] = [items[idx + dir], items[idx]];
    process();
  }

  function saveBlob(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  }

  async function zipOuts(outs, name) {
    const used = new Set();
    const files = outs.map((o) => {
      let n = o.name;
      let k = 1;
      while (used.has(n)) n = o.name.replace(/(\.[^.]+)$/, `-${k++}$1`);
      used.add(n);
      return { name: n, blob: o.blob };
    });
    saveBlob(await window.makeZip(files), `${name}.zip`);
  }

  function download(item) {
    if (!item.outs?.length) return;
    if (item.outs.length === 1) saveBlob(item.outs[0].blob, item.outs[0].name);
    else zipOuts(item.outs, base(item.file.name));
  }

  function downloadAll() {
    if (state.target === "pdf") {
      if (!state.combined) return;
      const first = state.items.find((i) => i.kind !== "other");
      const name = state.items.filter((i) => i.kind !== "other").length === 1 && first ? base(first.file.name) : t("pdfName");
      return saveBlob(state.combined.blob, `${name}.pdf`);
    }
    const outs = state.items.flatMap((i) => i.outs || []);
    if (outs.length) zipOuts(outs, t("zipName"));
  }

  function removeItem(item) {
    if (item.srcUrl) URL.revokeObjectURL(item.srcUrl);
    item.outs?.forEach((o) => URL.revokeObjectURL(o.url));
    state.items = state.items.filter((i) => i !== item);
    if (state.target === "pdf") process();
    else render();
    syncTarget();
  }

  async function pdfThumb(item) {
    try {
      for await (const { canvas } of pdfPages(item, 0.3)) {
        item.thumb = canvas.toDataURL("image/jpeg", 0.7);
        break;
      }
      render();
    } catch {}
  }

  function addFiles(files) {
    const next = [...files].map((file) => {
      const d = detect(file);
      const item = { file, ...d };
      if (d.kind === "image") item.thumb = item.srcUrl = URL.createObjectURL(file);
      return item;
    });
    if (!next.length) return;
    state.items.push(...next);
    next.filter((i) => i.kind === "pdf").forEach(pdfThumb);
    // Sensible default: PDFs alone → images, otherwise keep the chosen target
    if (state.items.every((i) => i.kind === "pdf") && state.target === "pdf") state.target = "jpg";
    syncTarget();
    process();
  }

  // Events
  $("drop").onclick = () => $("file").click();
  $("file").onchange = (e) => {
    addFiles(e.target.files);
    e.target.value = "";
  };
  $("drop").ondragover = (e) => {
    e.preventDefault();
    $("drop").classList.add("over");
  };
  $("drop").ondragleave = () => $("drop").classList.remove("over");
  $("drop").ondrop = (e) => {
    e.preventDefault();
    $("drop").classList.remove("over");
    addFiles(e.dataTransfer.files);
  };
  window.addEventListener("paste", (e) => addFiles([...(e.clipboardData?.files || [])]));
  $("format").onclick = (e) => {
    const f = e.target.closest("[data-format]")?.dataset.format;
    if (!f || f === state.target) return;
    state.target = f;
    syncTarget();
    process();
  };
  $("quality").onclick = (e) => {
    const b = e.target.closest("[data-q]");
    if (!b || b.disabled || Number(b.dataset.q) === state.quality) return;
    state.quality = Number(b.dataset.q);
    syncTarget();
    process();
  };
  $("zip").onclick = downloadAll;
  $("clear").onclick = () => {
    state.run++;
    reset();
    state.items.forEach((i) => i.srcUrl && URL.revokeObjectURL(i.srcUrl));
    state.items = [];
    syncTarget();
    render();
  };
  $("lang").onclick = () => {
    state.lang = state.lang === "vi" ? "en" : "vi";
    store.set("ic-lang", state.lang);
    applyLang();
  };

  applyLang();
  buildTargets();
})();
