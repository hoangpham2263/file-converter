# Image Converter

Chuyển đổi, nén và resize ảnh **ngay trên trình duyệt** — ảnh không được tải lên server nào.
Convert, compress and resize images **right in your browser** — nothing is uploaded.

**Demo:** https://hoangpham2263.github.io/image-converter/

![Image Converter](./screenshot.webp)

## Tính năng / Features

- Đổi sang **WebP, JPEG, PNG** — convert to WebP, JPEG or PNG
- Chỉnh **chất lượng** để nén — adjust quality to compress
- Giới hạn **chiều rộng tối đa** (resize giữ tỉ lệ) — cap the max width, keeping the aspect ratio
- Xử lý **nhiều ảnh** cùng lúc: kéo thả, chọn file hoặc dán (Ctrl/Cmd + V) — batch: drag & drop, file picker or paste
- Hiện dung lượng trước/sau và % giảm — shows size before/after and % saved
- Giao diện **Việt / Anh**, tự theo chế độ sáng/tối — Vietnamese / English UI, follows light/dark mode

## Cách hoạt động / How it works

Ảnh được vẽ lên `<canvas>` rồi xuất lại bằng `canvas.toBlob()` theo định dạng và chất lượng đã chọn.
Không dùng thư viện, không cần build — chỉ HTML, CSS và JavaScript thuần.

Images are drawn onto a `<canvas>` and re-encoded with `canvas.toBlob()` in the chosen format and quality.
No libraries, no build step — plain HTML, CSS and JavaScript.

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
