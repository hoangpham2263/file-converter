# Image Converter

Chuyển đổi, nén và resize ảnh **ngay trên trình duyệt** — ảnh không được tải lên server nào.
Convert, compress and resize images **right in your browser** — nothing is uploaded.

**Demo:** https://hoangpham.is-a.dev/image-converter/

![Image Converter](./screenshot.webp)

## Tính năng / Features

- **3 bước rõ ràng:** chọn ảnh → tùy chỉnh → tải về — *3 clear steps: choose → adjust → download*
- **Preset 1 chạm:** Ảnh web, Ảnh sản phẩm, Thumbnail, Facebook/Zalo, Dưới 200 KB, Giữ nguyên — *one-click presets*
- Đổi sang **WebP, AVIF** (nếu trình duyệt hỗ trợ), **JPEG, PNG** — *convert to WebP, AVIF (when supported), JPEG or PNG*
- Nén **theo chất lượng** hoặc **theo dung lượng mục tiêu** (vd. ≤ 200 KB, tự dò chất lượng) — *compress by quality or to a target file size*
- Resize theo **chiều rộng, chiều cao hoặc %**, giữ tỉ lệ, không phóng to ảnh nhỏ — *resize by width, height or percent, never upscales*
- **So sánh trước/sau** bằng thanh kéo — *before/after compare slider*
- **Đổi tên hàng loạt** theo mẫu `{name}`, `{n}` — *batch rename with a pattern*
- **Tải tất cả thành ZIP** hoặc từng file — *download everything as a ZIP or one by one*
- Chọn **màu nền** khi chuyển ảnh trong suốt sang JPG — *background colour for JPG*
- Tự **bỏ metadata EXIF** (GPS, thông tin máy chụp) — *EXIF metadata is stripped*
- Kéo thả, chọn file hoặc **dán (Ctrl/Cmd + V)**; giao diện **Việt / Anh**, sáng/tối — *drag & drop, picker or paste; VI/EN UI, light/dark*

## Cách hoạt động / How it works

Ảnh được vẽ lên `<canvas>` rồi xuất lại bằng `canvas.toBlob()` theo định dạng và chất lượng đã chọn.
Không dùng thư viện, không cần build — chỉ HTML, CSS và JavaScript thuần (file ZIP được tạo bằng `zip.js` tự viết).

Images are drawn onto a `<canvas>` and re-encoded with `canvas.toBlob()` in the chosen format and quality.
No libraries, no build step — plain HTML, CSS and JavaScript (ZIP files come from a small hand-written `zip.js`).

> Lưu ý: GIF động chỉ lấy khung hình đầu; JPEG không có nền trong suốt nên được thay bằng nền trắng.
> Note: animated GIFs keep only the first frame; JPEG has no transparency, so a white background is used.

## Chạy trên máy / Run locally

```bash
git clone https://github.com/hoangpham2263/image-converter.git
cd image-converter
python3 -m http.server 8000
```

Mở / open http://localhost:8000

## License

MIT © [Phạm Quốc Hoàng](https://hoangpham.is-a.dev)
