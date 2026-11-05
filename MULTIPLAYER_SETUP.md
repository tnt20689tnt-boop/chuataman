# Kết nối nhiều Phật tử – Chùa Tâm An

## Biến môi trường

Thiết lập hai biến sau trong phần Environment Variables của nơi đang triển khai website:

- `VITE_SUPABASE_URL`: URL dự án Supabase.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: publishable key của dự án (hoặc `VITE_SUPABASE_ANON_KEY` nếu dự án đang dùng anon key cũ).

Chỉ dùng publishable/anon key ở trình duyệt. Không đưa secret key hoặc service_role key vào website.

## Supabase Realtime

Ứng dụng dùng kênh Realtime công khai `tam-an-world`:
- Presence để đếm người đang tham gia.
- Broadcast `player_move` để gửi vị trí và hướng nhìn.
- NPC 1.000 người vẫn là nhân vật mô phỏng, không được tính vào số người online thật.

Không cần tạo bảng dữ liệu cho giai đoạn Presence/Broadcast này. Kiểm tra Realtime đã được bật trong Supabase project settings.

## Lưu ý

Nếu chưa cấu hình biến môi trường hoặc Realtime chưa kết nối, giao diện hiển thị trạng thái chưa kết nối thay vì giả số người online. Sau khi thêm biến môi trường, cần build/deploy lại website.
