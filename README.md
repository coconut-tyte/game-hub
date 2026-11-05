# 🎮 Game Hub — GitHub Pages + Supabase

Frontend tĩnh (GitHub Pages) → Supabase (Postgres + Auth + RLS) qua API key công khai (anon key).
Không cần Node/Express: Supabase tự cung cấp REST API và đăng nhập.

## Cấu trúc
gamehub/
├── index.html
├── css/style.css
├── js/config.js   ← dán URL + anon key
├── js/app.js
└── schema.sql     ← chạy 1 lần trong Supabase

## Bước 1 — Tạo Supabase
1. Vào supabase.com → New project.
2. SQL Editor → dán toàn bộ `schema.sql` → Run.
3. Authentication → Providers → Email → **tắt "Confirm email"** (vì ta dùng email ảo `tên@gamehub.app`).
4. Project Settings → API → copy **Project URL** và **anon public key** → dán vào `js/config.js`.

## Về API key (quan trọng)
- `anon key` được phép nằm trong code công khai; bảo mật dựa vào RLS + các hàm RPC trong schema.sql
  (người chơi không thể tự sửa xu/điểm bằng API).
- **Không bao giờ** commit `service_role key` lên GitHub.

## Bước 2 — Chạy thử ở máy
    npx serve .        # rồi mở http://localhost:3000

## Bước 3 — Đưa lên GitHub
1. github.com → New repository (đặt tên, ví dụ `gamehub`), không tick README.
2. Trong thư mục dự án:

        git init
        git add .
        git commit -m "Game Hub: bản đầu"
        git branch -M main
        git remote add origin https://github.com/<ten-ban>/gamehub.git
        git push -u origin main

## Bước 4 — Bật GitHub Pages
Repo → Settings → Pages → Source: **Deploy from a branch** → `main` / `/ (root)` → Save.
Sau ~1 phút: https://<ten-ban>.github.io/gamehub/

## Bước 5 — Cho phép domain (nếu cần)
Supabase → Authentication → URL Configuration → Site URL = địa chỉ GitHub Pages ở trên.

## Thêm game mới
Thêm 1 dòng vào bảng `games`, viết game, rồi khi kết thúc gọi:
    await sb.rpc('submit_score', { p_game: 'id-game', p_score: điểm, p_won: true/false })

## Nội tại thú cưng
Schema đã gồm sẵn thú cưng nội tại: Chim Én Vàng (+1 mạng/khiên), Mèo Ninja (+20% điểm Bắn Súng), Thỏ Đồng Hồ (+15s Pikachu).
Thú có `coin_bonus` tăng xu nhận được (tính ở server). Các nội tại còn lại tính ở trình duyệt nên chỉ mang tính trải nghiệm, không nên dùng để xếp hạng nghiêm túc.

## Gacha pity
- Sử thi trở lên chắc chắn sau tối đa 10 lượt; Huyền thoại trở lên chắc chắn sau tối đa 50 lượt (đếm riêng, tự reset khi trúng).
- Trùng thú đã có sẽ được hoàn 30 xu.
- Logic nằm trong hàm `gacha_roll` ở Supabase (đã được áp dụng vào database).

## Giao diện thung lũng hoa 3D
- `js/valley.js`: thung lũng hoa về đêm tự dựng bằng three.js r154 (hoa/lá/cỏ/đom đóm dạng point sprite, camera bay dọc đường cong, cuộn chuột/vuốt để di chuyển, chuột đẩy các điểm sáng, rê vào nút mũi tên để hoa tan thành hạt).
- `js/audio.js`: nhạc nền tự tổng hợp bằng WebAudio, mặc định tắt tiếng; rê vào nút mũi tên sẽ làm tiếng bị nghẹn.
- `css/valley-theme.css`: giao diện đêm, chữ kem, tiêu đề Antonio.
- Cần mạng để tải three.js từ jsDelivr; nếu không tải được, trang vẫn chạy với nền đen.

## Game mới: Khủng Long Chạy 🦖
Nhảy (Space/↑/chạm) và cúi (↓) để né xương rồng và chim; 3 màn (mục tiêu 300/500/800 điểm), đổi ngày/đêm theo điểm. Nội tại thú cưng +1 mạng cũng áp dụng. Game đã được thêm vào bảng `games` trên Supabase (id `dino`).
