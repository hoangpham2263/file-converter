# File Converter

Chuyển đổi file **ngay trên trình duyệt** — file không được tải lên server nào. Tự nhận loại file, bạn chỉ cần chọn loại muốn đổi sang.
Convert files **right in your browser** — nothing is uploaded. File types are detected automatically; just pick what to convert to.

**Demo:** https://hoangpham.is-a.dev/file-converter/


## Tính năng / Features

- Kéo thả, chọn file hoặc **dán (Ctrl/Cmd + V)**, nhiều file cùng lúc — *drag & drop, picker or paste, many at once*
- **Tự nhận dạng** ảnh JPG, PNG, WEBP, AVIF, GIF, BMP, SVG và PDF — *detects images and PDFs automatically*
- **Ảnh ↔ ảnh:** đổi sang WebP, JPG, PNG (và AVIF nếu trình duyệt hỗ trợ) — *image to image*
- **Ảnh → PDF:** gộp nhiều ảnh (và cả file PDF) thành 1 PDF khổ A4, sắp xếp bằng ↑ ↓ — *merge images and PDFs into one A4 PDF*
- **PDF → ảnh:** mỗi trang thành 1 ảnh — *each PDF page becomes an image*
- 5 mức chất lượng: Nhẹ nhất, Nhẹ, **Mặc định**, Nét, Nét nhất — *five quality levels*
- Tải từng file hoặc **tất cả thành ZIP** — *download one by one or as a ZIP*
- Giao diện **Việt / Anh**, tự theo chế độ sáng/tối — *Vietnamese / English UI, light/dark mode*

## Cách hoạt động / How it works

- Ảnh được vẽ lên `<canvas>` rồi xuất lại bằng `canvas.toBlob()`.
- Trang PDF được vẽ thành ảnh bằng [PDF.js](https://mozilla.github.io/pdf.js/).
- Gộp PDF bằng [pdf-lib](https://pdf-lib.js.org/): ảnh đặt vừa khổ A4 (ảnh ngang thì trang ngang), trang PDF có sẵn được chép nguyên.
- ZIP tạo bằng `zip.js` tự viết. Không cần build — chỉ HTML, CSS, JavaScript.

> Lưu ý: GIF động chỉ lấy khung hình đầu; JPG và PDF không có nền trong suốt nên dùng nền trắng.
> Note: animated GIFs keep only the first frame; JPG and PDF output use a white background.

## Chạy trên máy / Run locally

```bash
git clone https://github.com/hoangpham2263/file-converter.git
cd file-converter
python3 -m http.server 8000
```

Mở / open http://localhost:8000

## License

MIT © Phạm Quốc Hoàng
