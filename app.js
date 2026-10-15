// Image Converter — change image format in the browser (no upload).
(() => {
  const FORMATS = [
    { mime: "image/webp", ext: "webp", label: "WEBP" },
    { mime: "image/jpeg", ext: "jpg", label: "JPG" },
    { mime: "image/png", ext: "png", label: "PNG" },
    { mime: "image/avif", ext: "avif", label: "AVIF" },
  ];

  const TEXT = {
    vi: {
      title: "Đổi định dạng ảnh",
      subtitle: "Chạy ngay trên trình duyệt — ảnh không được tải lên đâu cả.",
      to: "Đổi sang",
      quality: "Chất lượng",
      qhints: {
        40: "Nhẹ nhất — hợp ảnh xem trước, thumbnail.",
        60: "Nhẹ — hợp ảnh đăng web nhiều ảnh.",
        70: "Khá nhẹ, vẫn rõ khi xem trên điện thoại.",
        80: "Cân bằng giữa dung lượng và độ nét (khuyên dùng).",
        90: "Nét — hợp ảnh sản phẩm, banner.",
        100: "Nét nhất — giữ chi tiết tối đa, file lớn nhất.",
      },
      pngNote: "PNG luôn giữ nguyên chất lượng, không nén được theo cách này.",
      drop: "Kéo thả ảnh vào đây hoặc bấm để chọn",
      dropHint: "Chọn được nhiều ảnh cùng lúc, hoặc dán bằng Ctrl/Cmd + V.",
      downloadZip: "Tải tất cả (ZIP)",
      clear: "Xóa hết",
      download: "Tải",
      remove: "Xóa",
      processing: "Đang xử lý…",
      error: "Không đọc được ảnh này",
      files: "ảnh",
      footer: "Làm bởi",
      switchTo: "EN",
      switchTitle: "English",
      zipName: "anh-da-chuyen-doi",
    },
    en: {
      title: "Image format converter",
      subtitle: "Runs in your browser — nothing is uploaded.",
      to: "Convert to",
      quality: "Quality",
      qhints: {
        40: "Smallest — good for previews and thumbnails.",
        60: "Light — good for image-heavy web pages.",
        70: "Fairly light, still clear on phones.",
        80: "Balanced size and sharpness (recommended).",
        90: "Sharp — good for product photos and banners.",
        100: "Sharpest — keeps maximum detail, largest files.",
      },
      pngNote: "PNG is lossless, so this setting does not apply.",
      drop: "Drop images here or click to choose",
      dropHint: "Pick several at once, or paste with Ctrl/Cmd + V.",
      downloadZip: "Download all (ZIP)",
      clear: "Clear",
      download: "Download",
      remove: "Remove",
      processing: "Processing…",
      error: "Could not read this image",
      files: "images",
      footer: "Made by",
      switchTo: "VI",
      switchTitle: "Tiếng Việt",
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
    quality: 80,
    items: [],
    run: 0,
  };

  const t = (key) => TEXT[state.lang][key];
  const fmt = () => FORMATS.find((f) => f.mime === state.format);
  const formatBytes = (n) =>
    n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`;
  const fileName = (item) => `${item.file.name.replace(/\.[^.]+$/, "")}.${fmt().ext}`;

  // Only show formats this browser can encode (AVIF is not everywhere)
  async function buildFormats() {
    const c = document.createElement("canvas");
    c.width = c.height = 2;
    const ok = [];
    for (const f of FORMATS) {
      const blob = await new Promise((r) => c.toBlob(r, f.mime, 0.8));
      if (blob && blob.type === f.mime) ok.push(f);
    }
    $("format").replaceChildren(
      ...ok.map((f) => {
        const b = document.createElement("button");
        b.type = "button";
        b.dataset.format = f.mime;
        b.textContent = f.label;
        return b;
      })
    );
    syncFormat();
  }

  function syncFormat() {
    [...$("format").children].forEach((b) => b.classList.toggle("active", b.dataset.format === state.format));
    const png = state.format === "image/png";
    [...$("quality").children].forEach((b) => {
      b.classList.toggle("active", Number(b.dataset.q) === state.quality);
      b.disabled = png;
    });
    $("qhint").textContent = png ? t("pngNote") : t("qhints")[state.quality];
  }

  function applyLang() {
    document.documentElement.lang = state.lang;
    document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
    $("lang").textContent = t("switchTo");
    $("lang").title = t("switchTitle");
    syncFormat();
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
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (state.format === "image/jpeg") {
      // JPG has no transparency: use a white background
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise((r) => canvas.toBlob(r, state.format, state.quality / 100));
    if (!blob) throw new Error("encode failed");
    return { blob, url: URL.createObjectURL(blob) };
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
    const done = items.filter((i) => i.out || i.error).length;
    const busy = done < items.length;
    const totalIn = items.reduce((s, i) => s + i.file.size, 0);
    const totalOut = items.reduce((s, i) => s + (i.out ? i.out.blob.size : 0), 0);
    $("summary").innerHTML = busy
      ? `${t("processing")} ${done}/${items.length}`
      : `${items.length} ${t("files")} · ${formatBytes(totalIn)} → <b>${formatBytes(totalOut)}</b>` +
        (totalIn ? ` <span class="${totalOut <= totalIn ? "good" : "warn"}">(${totalOut <= totalIn ? "-" : "+"}${Math.abs(Math.round((1 - totalOut / totalIn) * 100))}%)</span>` : "");
    $("zip").disabled = busy;

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
            ? `${formatBytes(item.file.size)} → ${formatBytes(item.out.blob.size)} (${item.out.blob.size <= item.file.size ? "-" : "+"}${Math.abs(Math.round((1 - item.out.blob.size / item.file.size) * 100))}%)`
            : t("processing"));
        info.append(name, meta);

        const btns = document.createElement("div");
        btns.className = "row-actions";
        const dl = document.createElement("button");
        dl.type = "button";
        dl.className = "outline";
        dl.textContent = t("download");
        dl.disabled = !item.out;
        dl.onclick = () => download(item);
        const rm = document.createElement("button");
        rm.type = "button";
        rm.className = "icon";
        rm.textContent = "✕";
        rm.title = t("remove");
        rm.onclick = () => removeItem(item);
        btns.append(dl, rm);
        li.append(img, info, btns);
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

  async function downloadZip() {
    const used = new Set();
    const files = state.items
      .filter((i) => i.out)
      .map((item) => {
        let name = fileName(item);
        let k = 1;
        while (used.has(name)) name = name.replace(/(\.[^.]+)$/, `-${k++}$1`);
        used.add(name);
        return { name, blob: item.out.blob };
      });
    if (!files.length) return;
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
      .map((file) => ({ file, srcUrl: URL.createObjectURL(file) }));
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
  window.addEventListener("paste", (e) => addFiles([...(e.clipboardData?.files || [])]));
  $("format").onclick = (e) => {
    const f = e.target.closest("[data-format]")?.dataset.format;
    if (!f || f === state.format) return;
    state.format = f;
    syncFormat();
    process();
  };
  $("quality").onclick = (e) => {
    const b = e.target.closest("[data-q]");
    if (!b || b.disabled || Number(b.dataset.q) === state.quality) return;
    state.quality = Number(b.dataset.q);
    syncFormat();
    process();
  };
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

  applyLang();
  buildFormats();
})();
