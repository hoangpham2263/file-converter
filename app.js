// Image Converter — convert, compress and resize images in the browser (no upload).
(() => {
  const EXT = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };

  const TEXT = {
    vi: {
      title: "Chuyển đổi & nén ảnh",
      subtitle: "WebP · JPEG · PNG — chạy ngay trên trình duyệt, ảnh không được tải lên đâu cả.",
      drop: "Kéo thả ảnh vào đây hoặc bấm để chọn",
      dropHint: "JPG, PNG, WebP, GIF (khung đầu), BMP… Có thể chọn nhiều ảnh, hoặc dán bằng Ctrl/Cmd + V.",
      format: "Định dạng",
      quality: "Chất lượng",
      maxWidth: "Chiều rộng tối đa",
      original: "Giữ nguyên",
      downloadAll: "Tải tất cả",
      clear: "Xóa hết",
      download: "Tải",
      processing: "Đang xử lý…",
      error: "Không đọc được ảnh này",
      smaller: "nhỏ hơn",
      larger: "lớn hơn",
      footer: "Làm bởi",
      switchTo: "EN",
      switchTitle: "English",
      pngNote: "PNG không nén mất dữ liệu nên bỏ qua chất lượng",
    },
    en: {
      title: "Image converter & compressor",
      subtitle: "WebP · JPEG · PNG — runs in your browser, nothing is uploaded.",
      drop: "Drop images here or click to choose",
      dropHint: "JPG, PNG, WebP, GIF (first frame), BMP… Pick several, or paste with Ctrl/Cmd + V.",
      format: "Format",
      quality: "Quality",
      maxWidth: "Max width",
      original: "Original",
      downloadAll: "Download all",
      clear: "Clear",
      download: "Download",
      processing: "Processing…",
      error: "Could not read this image",
      smaller: "smaller",
      larger: "larger",
      footer: "Made by",
      switchTo: "VI",
      switchTitle: "Tiếng Việt",
      pngNote: "PNG is lossless, so quality is ignored",
    },
  };

  const $ = (id) => document.getElementById(id);
  const state = {
    lang: localStorage.getItem("ic-lang") || (navigator.language.startsWith("vi") ? "vi" : "en"),
    format: "image/webp",
    quality: 80,
    maxWidth: 0,
    items: [], // { id, file, srcUrl, out?: { blob, url, width, height }, error? }
    run: 0,
  };

  const t = (key) => TEXT[state.lang][key];

  const formatBytes = (n) =>
    n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`;

  const fileName = (item) => `${item.file.name.replace(/\.[^.]+$/, "")}.${EXT[state.format]}`;

  function applyLang() {
    document.documentElement.lang = state.lang;
    document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
    $("lang").textContent = t("switchTo");
    $("lang").title = t("switchTitle");
    $("quality").title = state.format === "image/png" ? t("pngNote") : "";
    render();
  }

  const loadImage = (url) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });

  async function convert(item) {
    const img = await loadImage(item.srcUrl);
    const scale = state.maxWidth > 0 && img.naturalWidth > state.maxWidth ? state.maxWidth / img.naturalWidth : 1;
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (state.format === "image/jpeg") {
      // JPEG has no transparency: paint white behind it
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise((r) => canvas.toBlob(r, state.format, state.quality / 100));
    if (!blob) throw new Error("encode failed");
    return { blob, url: URL.createObjectURL(blob), width, height };
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

  function render() {
    const { items } = state;
    $("result").hidden = items.length === 0;
    const busy = items.some((i) => !i.out && !i.error);
    const totalIn = items.reduce((s, i) => s + i.file.size, 0);
    const totalOut = items.reduce((s, i) => s + (i.out ? i.out.blob.size : 0), 0);

    if (busy) {
      $("summary").textContent = t("processing");
    } else if (items.length) {
      const pct = Math.abs(Math.round((1 - totalOut / totalIn) * 100));
      const ok = totalOut <= totalIn;
      $("summary").innerHTML = `${formatBytes(totalIn)} → <b>${formatBytes(totalOut)}</b> <span class="${ok ? "good" : "warn"}">(${pct}% ${t(ok ? "smaller" : "larger")})</span>`;
    }
    $("all").disabled = busy;

    $("list").replaceChildren(
      ...items.map((item) => {
        const li = document.createElement("li");
        const img = document.createElement("img");
        img.alt = "";
        img.src = item.out ? item.out.url : item.srcUrl;
        const info = document.createElement("div");
        info.className = "info";
        const name = document.createElement("div");
        name.className = "name";
        name.textContent = fileName(item);
        const meta = document.createElement("div");
        meta.className = "meta";
        meta.textContent =
          item.error ||
          (item.out
            ? `${formatBytes(item.file.size)} → ${formatBytes(item.out.blob.size)} · ${item.out.width}×${item.out.height}`
            : t("processing"));
        info.append(name, meta);
        const btn = document.createElement("button");
        btn.className = "outline";
        btn.type = "button";
        btn.textContent = t("download");
        btn.disabled = !item.out;
        btn.onclick = () => download(item);
        li.append(img, info, btn);
        return li;
      })
    );
  }

  function download(item) {
    if (!item.out) return;
    const a = document.createElement("a");
    a.href = item.out.url;
    a.download = fileName(item);
    a.click();
  }

  function addFiles(files) {
    const next = [...files]
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({ id: `${file.name}-${file.size}-${Math.random()}`, file, srcUrl: URL.createObjectURL(file) }));
    if (!next.length) return;
    state.items.push(...next);
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
  window.addEventListener("paste", (e) => addFiles([...e.clipboardData.files]));

  $("format").onclick = (e) => {
    const f = e.target.dataset.format;
    if (!f) return;
    state.format = f;
    [...$("format").children].forEach((b) => b.classList.toggle("active", b.dataset.format === f));
    $("quality").disabled = f === "image/png";
    $("qv").textContent = f === "image/png" ? "—" : `${state.quality}%`;
    $("quality").title = f === "image/png" ? t("pngNote") : "";
    process();
  };
  let qTimer;
  $("quality").oninput = (e) => {
    state.quality = Number(e.target.value);
    $("qv").textContent = `${state.quality}%`;
    clearTimeout(qTimer);
    qTimer = setTimeout(process, 200);
  };
  $("maxw").onchange = (e) => {
    state.maxWidth = Number(e.target.value);
    process();
  };
  $("all").onclick = () => state.items.forEach(download);
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
    localStorage.setItem("ic-lang", state.lang);
    applyLang();
  };

  applyLang();
})();
