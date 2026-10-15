// Image Converter — convert, compress, resize and rename images in the browser (no upload).
(() => {
  const FORMATS = [
    { mime: "image/webp", ext: "webp", label: "WEBP" },
    { mime: "image/avif", ext: "avif", label: "AVIF" },
    { mime: "image/jpeg", ext: "jpg", label: "JPG" },
    { mime: "image/png", ext: "png", label: "PNG" },
  ];

  const PRESETS = [
    { id: "web", vi: "Ảnh web", en: "Web image", hint: "WebP · 1920px · 80%", format: "image/webp", mode: "quality", quality: 80, resize: "width", value: 1920 },
    { id: "product", vi: "Ảnh sản phẩm", en: "Product photo", hint: "WebP · 1200px · 82%", format: "image/webp", mode: "quality", quality: 82, resize: "width", value: 1200 },
    { id: "thumb", vi: "Thumbnail", en: "Thumbnail", hint: "WebP · 600px · 75%", format: "image/webp", mode: "quality", quality: 75, resize: "width", value: 600 },
    { id: "social", vi: "Đăng Facebook / Zalo", en: "Facebook / Zalo", hint: "JPG · 2048px · 85%", format: "image/jpeg", mode: "quality", quality: 85, resize: "width", value: 2048 },
    { id: "small", vi: "Dưới 200 KB", en: "Under 200 KB", hint: "WebP · 1920px · ≤200KB", format: "image/webp", mode: "target", target: 200, resize: "width", value: 1920 },
    { id: "keep", vi: "Giữ nguyên kích thước", en: "Keep size", hint: "WebP · 90%", format: "image/webp", mode: "quality", quality: 90, resize: "none" },
  ];

  const TEXT = {
    vi: {
      title: "Chuyển đổi & nén ảnh",
      subtitle: "WebP · AVIF · JPEG · PNG — chạy ngay trên trình duyệt, ảnh không được tải lên đâu cả.",
      step1: "Chọn ảnh", step2: "Tùy chỉnh", step3: "Tải về",
      drop: "Kéo thả ảnh vào đây hoặc bấm để chọn",
      dropHint: "JPG, PNG, WebP, AVIF, GIF (khung đầu), BMP… Chọn được nhiều ảnh, hoặc dán bằng Ctrl/Cmd + V.",
      format: "Định dạng", compress: "Nén", byQuality: "Theo chất lượng", bySize: "Theo dung lượng",
      quality: "Chất lượng", targetSize: "Tối đa", resize: "Kích thước", original: "Giữ nguyên",
      width: "Rộng", height: "Cao", noUpscale: "Không phóng to ảnh nhỏ hơn kích thước đã chọn.",
      more: "Tùy chọn thêm", rename: "Đổi tên file", renameHint: "{name} = tên gốc, {n} = số thứ tự. Ví dụ: san-pham-{n}",
      bg: "Màu nền (cho JPG)", bgHint: "JPG không có nền trong suốt, phần trong suốt sẽ được tô màu này.",
      exif: "Ảnh xuất ra tự động bỏ metadata EXIF (vị trí GPS, thông tin máy chụp…).",
      downloadZip: "Tải tất cả (ZIP)", downloadAll: "Tải từng file", clear: "Xóa hết",
      download: "Tải", compare: "So sánh", remove: "Xóa",
      processing: "Đang xử lý…", error: "Không đọc được ảnh này",
      smaller: "nhỏ hơn", larger: "lớn hơn", files: "ảnh",
      targetMiss: "chưa đạt mục tiêu, đã nén tối đa",
      pngNote: "PNG không nén mất dữ liệu nên bỏ qua chất lượng",
      before: "Trước", after: "Sau", footer: "Làm bởi", switchTo: "EN", switchTitle: "English",
      zipName: "anh-da-chuyen-doi",
    },
    en: {
      title: "Image converter & compressor",
      subtitle: "WebP · AVIF · JPEG · PNG — runs in your browser, nothing is uploaded.",
      step1: "Choose images", step2: "Adjust", step3: "Download",
      drop: "Drop images here or click to choose",
      dropHint: "JPG, PNG, WebP, AVIF, GIF (first frame), BMP… Pick several, or paste with Ctrl/Cmd + V.",
      format: "Format", compress: "Compression", byQuality: "By quality", bySize: "By file size",
      quality: "Quality", targetSize: "Max", resize: "Size", original: "Original",
      width: "Width", height: "Height", noUpscale: "Smaller images are never upscaled.",
      more: "More options", rename: "Rename files", renameHint: "{name} = original name, {n} = number. E.g. product-{n}",
      bg: "Background (for JPG)", bgHint: "JPG has no transparency; transparent areas get this colour.",
      exif: "Exported images drop EXIF metadata (GPS location, camera info…) automatically.",
      downloadZip: "Download all (ZIP)", downloadAll: "Download each", clear: "Clear",
      download: "Download", compare: "Compare", remove: "Remove",
      processing: "Processing…", error: "Could not read this image",
      smaller: "smaller", larger: "larger", files: "images",
      targetMiss: "target not reached, max compression used",
      pngNote: "PNG is lossless, so quality is ignored",
      before: "Before", after: "After", footer: "Made by", switchTo: "VI", switchTitle: "Tiếng Việt",
      zipName: "converted-images",
    },
  };

  const $ = (id) => document.getElementById(id);
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  };

  const state = {
    lang: store.get("ic-lang") || (navigator.language.startsWith("vi") ? "vi" : "en"),
    format: "image/webp",
    mode: "quality",
    quality: 80,
    target: 200,
    resize: "none",
    resizeValue: 1920,
    rename: "",
    bg: "#ffffff",
    preset: null,
    items: [],
    run: 0,
    supported: {},
  };

  const t = (key) => TEXT[state.lang][key];
  const fmt = () => FORMATS.find((f) => f.mime === state.format);
  const formatBytes = (n) =>
    n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`;
  const slug = (s) => s.replace(/\.[^.]+$/, "");

  function fileName(item, index) {
    const base = slug(item.file.name);
    const pattern = state.rename.trim();
    const name = pattern
      ? pattern.replaceAll("{name}", base).replaceAll("{n}", String(index + 1).padStart(String(state.items.length).length, "0"))
      : base;
    return `${name}.${fmt().ext}`;
  }

  // Detect encoder support (AVIF is not available everywhere)
  async function detectSupport() {
    const c = document.createElement("canvas");
    c.width = c.height = 2;
    for (const f of FORMATS) {
      const blob = await new Promise((r) => c.toBlob(r, f.mime, 0.8));
      state.supported[f.mime] = !!blob && blob.type === f.mime;
    }
  }

  // ---------- UI building ----------
  function buildFormatButtons() {
    $("format").replaceChildren(
      ...FORMATS.filter((f) => state.supported[f.mime]).map((f) => {
        const b = document.createElement("button");
        b.type = "button";
        b.dataset.format = f.mime;
        b.textContent = f.label;
        return b;
      })
    );
  }

  function buildPresets() {
    $("presets").replaceChildren(
      ...PRESETS.filter((p) => state.supported[p.format]).map((p) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "preset";
        b.dataset.preset = p.id;
        b.innerHTML = `<strong></strong><span></span>`;
        b.querySelector("strong").textContent = p[state.lang];
        b.querySelector("span").textContent = p.hint;
        return b;
      })
    );
  }

  function syncControls() {
    [...$("format").children].forEach((b) => b.classList.toggle("active", b.dataset.format === state.format));
    [...$("mode").children].forEach((b) => b.classList.toggle("active", b.dataset.mode === state.mode));
    [...$("resizeMode").children].forEach((b) => b.classList.toggle("active", b.dataset.resize === state.resize));
    [...$("presets").children].forEach((b) => b.classList.toggle("active", b.dataset.preset === state.preset));
    const png = state.format === "image/png";
    $("mode").querySelector('[data-mode="target"]').disabled = png;
    if (png && state.mode === "target") state.mode = "quality";
    $("qualityBox").hidden = state.mode !== "quality";
    $("targetBox").hidden = state.mode !== "target";
    $("quality").value = state.quality;
    $("quality").disabled = png;
    $("quality").title = png ? t("pngNote") : "";
    $("qv").textContent = png ? "—" : `${state.quality}%`;
    $("target").value = state.target;
    $("resizeBox").hidden = state.resize === "none";
    $("resizeValue").value = state.resizeValue;
    $("resizeUnit").textContent = state.resize === "percent" ? "%" : "px";
  }

  function applyLang() {
    document.documentElement.lang = state.lang;
    document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
    $("lang").textContent = t("switchTo");
    $("lang").title = t("switchTitle");
    $("rename").placeholder = state.lang === "vi" ? "{name}" : "{name}";
    buildPresets();
    syncControls();
    render();
  }

  // ---------- Encoding ----------
  const loadImage = (url) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });

  function targetSize(img) {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    let scale = 1;
    const v = Number(state.resizeValue) || 0;
    if (state.resize === "width" && v > 0) scale = Math.min(1, v / w);
    if (state.resize === "height" && v > 0) scale = Math.min(1, v / h);
    if (state.resize === "percent" && v > 0) scale = Math.min(1, v / 100);
    return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
  }

  const encode = (canvas, quality) => new Promise((r) => canvas.toBlob(r, state.format, quality));

  async function convert(item) {
    const img = await loadImage(item.srcUrl);
    const { width, height } = targetSize(img);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (state.format === "image/jpeg") {
      ctx.fillStyle = state.bg;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);

    let blob;
    let missed = false;
    if (state.mode === "target" && state.format !== "image/png") {
      // Binary search the highest quality that fits under the target size
      const limit = Math.max(1, Number(state.target) || 200) * 1024;
      let lo = 0.05, hi = 0.95, best = null;
      for (let i = 0; i < 8; i++) {
        const q = (lo + hi) / 2;
        const b = await encode(canvas, q);
        if (b && b.size <= limit) { best = b; lo = q; } else { hi = q; }
      }
      blob = best || (await encode(canvas, 0.05));
      missed = !best;
    } else {
      blob = await encode(canvas, state.quality / 100);
    }
    if (!blob) throw new Error("encode failed");
    return { blob, url: URL.createObjectURL(blob), width, height, missed };
  }

  async function process() {
    const run = ++state.run;
    state.items.forEach((i) => {
      if (i.out) URL.revokeObjectURL(i.out.url);
      i.out = undefined;
      i.error = undefined;
    });
    render();
    for (const item of state.items) {
      try {
        const out = await convert(item);
        if (run !== state.run) return URL.revokeObjectURL(out.url);
        item.out = out;
      } catch {
        if (run !== state.run) return;
        item.error = t("error");
      }
      render();
    }
  }

  let timer;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(process, 200);
  };

  // ---------- Rendering ----------
  function render() {
    const { items } = state;
    $("result").hidden = items.length === 0;
    const done = items.filter((i) => i.out || i.error).length;
    const busy = done < items.length;
    const totalIn = items.reduce((s, i) => s + i.file.size, 0);
    const totalOut = items.reduce((s, i) => s + (i.out ? i.out.blob.size : 0), 0);

    if (busy) {
      $("summary").textContent = `${t("processing")} ${done}/${items.length}`;
    } else if (items.length) {
      const pct = Math.abs(Math.round((1 - totalOut / totalIn) * 100));
      const ok = totalOut <= totalIn;
      $("summary").innerHTML = `${items.length} ${t("files")} · ${formatBytes(totalIn)} → <b>${formatBytes(totalOut)}</b> <span class="${ok ? "good" : "warn"}">(${pct}% ${t(ok ? "smaller" : "larger")})</span>`;
    }
    $("all").disabled = busy;
    $("zip").disabled = busy;

    $("list").replaceChildren(
      ...items.map((item, index) => {
        const li = document.createElement("li");
        const img = document.createElement("img");
        img.alt = "";
        img.src = item.out ? item.out.url : item.srcUrl;

        const info = document.createElement("div");
        info.className = "info";
        const name = document.createElement("div");
        name.className = "name";
        name.textContent = fileName(item, index);
        const meta = document.createElement("div");
        meta.className = "meta";
        if (item.error) meta.textContent = item.error;
        else if (!item.out) meta.textContent = t("processing");
        else {
          const pct = Math.round((1 - item.out.blob.size / item.file.size) * 100);
          meta.innerHTML = `${formatBytes(item.file.size)} → <b>${formatBytes(item.out.blob.size)}</b> <span class="${pct >= 0 ? "good" : "warn"}">(${pct >= 0 ? "-" : "+"}${Math.abs(pct)}%)</span> · ${item.out.width}×${item.out.height}`;
          if (item.out.missed) meta.innerHTML += ` · <span class="warn">${t("targetMiss")}</span>`;
        }
        info.append(name, meta);

        const btns = document.createElement("div");
        btns.className = "row-actions";
        const mk = (label, cls, onClick, disabled) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = cls;
          b.textContent = label;
          b.disabled = !!disabled;
          b.onclick = onClick;
          return b;
        };
        btns.append(
          mk(t("compare"), "outline", () => openCompare(item, index), !item.out),
          mk(t("download"), "outline", () => download(item, index), !item.out),
          mk("✕", "icon", () => removeItem(item), false)
        );
        btns.lastChild.title = t("remove");
        li.append(img, info, btns);
        return li;
      })
    );
  }

  // ---------- Actions ----------
  function download(item, index) {
    if (!item.out) return;
    const a = document.createElement("a");
    a.href = item.out.url;
    a.download = fileName(item, index);
    a.click();
  }

  async function downloadZip() {
    const ready = state.items.map((item, i) => ({ item, i })).filter(({ item }) => item.out);
    if (!ready.length) return;
    const used = new Set();
    const files = ready.map(({ item, i }) => {
      let name = fileName(item, i);
      let k = 1;
      while (used.has(name)) name = name.replace(/(\.[^.]+)$/, `-${k++}$1`);
      used.add(name);
      return { name, blob: item.out.blob };
    });
    const zip = await window.makeZip(files);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(zip);
    a.download = `${t("zipName")}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  }

  function removeItem(item) {
    URL.revokeObjectURL(item.srcUrl);
    if (item.out) URL.revokeObjectURL(item.out.url);
    state.items = state.items.filter((i) => i !== item);
    render();
  }

  function addFiles(files) {
    const next = [...files]
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({ id: `${file.name}-${file.size}-${Math.random()}`, file, srcUrl: URL.createObjectURL(file) }));
    if (!next.length) return;
    state.items.push(...next);
    process();
  }

  function openCompare(item, index) {
    if (!item.out) return;
    $("cmpTitle").textContent = fileName(item, index);
    $("cmpBefore").src = item.srcUrl;
    $("cmpAfter").src = item.out.url;
    $("cmpRange").value = 50;
    setCompare(50);
    $("cmpInfo").textContent = `${t("before")}: ${formatBytes(item.file.size)} · ${t("after")}: ${formatBytes(item.out.blob.size)} (${item.out.width}×${item.out.height})`;
    $("compare").showModal();
  }

  function setCompare(v) {
    $("cmpBeforeWrap").style.clipPath = `inset(0 ${100 - v}% 0 0)`;
    $("cmpLine").style.left = `calc(${v}% - 1px)`;
  }

  function applyPreset(id) {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    state.preset = id;
    state.format = p.format;
    state.mode = p.mode;
    if (p.quality) state.quality = p.quality;
    if (p.target) state.target = p.target;
    state.resize = p.resize;
    if (p.value) state.resizeValue = p.value;
    syncControls();
    schedule();
  }

  const custom = () => {
    state.preset = null;
    syncControls();
    schedule();
  };

  // ---------- Events ----------
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

  $("presets").onclick = (e) => {
    const b = e.target.closest("[data-preset]");
    if (b) applyPreset(b.dataset.preset);
  };
  $("format").onclick = (e) => {
    const f = e.target.closest("[data-format]")?.dataset.format;
    if (!f) return;
    state.format = f;
    custom();
  };
  $("mode").onclick = (e) => {
    const m = e.target.closest("[data-mode]");
    if (!m || m.disabled) return;
    state.mode = m.dataset.mode;
    custom();
  };
  $("quality").oninput = (e) => {
    state.quality = Number(e.target.value);
    $("qv").textContent = `${state.quality}%`;
    state.preset = null;
    [...$("presets").children].forEach((b) => b.classList.remove("active"));
    schedule();
  };
  $("target").oninput = (e) => {
    state.target = Number(e.target.value);
    state.preset = null;
    schedule();
  };
  $("resizeMode").onclick = (e) => {
    const r = e.target.closest("[data-resize]")?.dataset.resize;
    if (!r) return;
    state.resize = r;
    if (r === "percent" && state.resizeValue > 100) state.resizeValue = 50;
    if ((r === "width" || r === "height") && state.resizeValue <= 100) state.resizeValue = 1200;
    custom();
  };
  $("resizeValue").oninput = (e) => {
    state.resizeValue = Number(e.target.value);
    state.preset = null;
    schedule();
  };
  $("rename").oninput = (e) => {
    state.rename = e.target.value;
    render();
  };
  $("bg").oninput = (e) => {
    state.bg = e.target.value;
    if (state.format === "image/jpeg") schedule();
  };
  $("all").onclick = () => state.items.forEach((item, i) => download(item, i));
  $("zip").onclick = downloadZip;
  $("clear").onclick = () => {
    state.run++;
    state.items.forEach((i) => {
      URL.revokeObjectURL(i.srcUrl);
      if (i.out) URL.revokeObjectURL(i.out.url);
    });
    state.items = [];
    render();
  };
  $("lang").onclick = () => {
    state.lang = state.lang === "vi" ? "en" : "vi";
    store.set("ic-lang", state.lang);
    applyLang();
  };
  $("cmpRange").oninput = (e) => setCompare(e.target.value);
  $("cmpClose").onclick = () => $("compare").close();
  $("compare").onclick = (e) => {
    if (e.target === $("compare")) $("compare").close();
  };

  detectSupport().then(() => {
    buildFormatButtons();
    applyPreset("web");
    applyLang();
  });
})();
