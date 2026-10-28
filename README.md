# 🎮 Game Hub - Cổng Game Trực Tuyến Kinh Điển

Trang web chơi game trực tuyến thuần **HTML, CSS, JavaScript** (Zero dependencies), thiết kế hiện đại, mượt mà chuẩn 60FPS không bị khựng, hỗ trợ cả máy tính và điện thoại.

---

## 🌟 Tính năng nổi bật

1. **8 Trò chơi kinh điển đầy đủ chế độ:**
   - ⬛ **Caro (Gomoku)**: 2 người chơi, vs Máy Dễ, vs Máy Khó (Minimax $\alpha$-$\beta$ pruning).
   - ♟️ **Cờ Vua (Chess)**: Chuẩn quốc tế, nhập thành, phong cấp, bắt tốt qua đường, AI 3 cấp độ.
   - 🀄 **Cờ Tướng (Xiangqi)**: Bàn cờ 9x10 có sông, đủ quân (Tướng, Sĩ, Tượng, Xe, Pháo, Mã, Tốt), vs AI hoặc 2 người.
   - 🟣 **Ô Ăn Quan**: Dân gian Việt Nam 14 ô, có rải quân, ăn quân dây chuyền mượt mà.
   - 🐦 **Flappy Bird**: Vật lý mượt mà, 3 độ khó (Dễ / Thường / Khó), tính điểm kỷ lục.
   - 👾 **Pac-Man**: Mê cung chuẩn, 4 bóng ma với AI săn đuổi khác nhau, ăn hạt năng lượng phản công.
   - 🍄 **Super Mario**: Platformer 2D cuộn cảnh, nhảy nhót đạp quái, nhặt xu, 3 màn chơi (Màn 1, Màn 2, Vô tận). Có nút cảm ứng cho mobile!
   - 🐍 **Snake (Rắn Săn Mồi)**: 4 chế độ (Dễ, Bình thường, Khó - tường chết, Xuyên tường), quả sao vàng đặc biệt.

2. **Chế độ Sáng / Tối (Light / Dark Theme):**
   - Nút chuyển theme trên thanh menu.
   - Tự động lưu cấu hình vào `localStorage`.

3. **Chức năng Chuỗi Thắng (Winning Streak 🔥):**
   - Đếm chuỗi thắng liên tiếp thời gian thực hiển thị trên thanh điều hướng.
   - Thống kê chi tiết từng game (số lượt thắng, điểm cao nhất).
   - Bảng xếp hạng (Leaderboard) xem nhanh thành tích.

4. **Hiệu ứng đồ họa & Âm thanh:**
   - Hiệu ứng hạt tương tác bay lơ lửng nền Canvas (`particles.js`).
   - Pháo hoa giấy (Confetti) chúc mừng khi chiến thắng.
   - Âm thanh tích hợp bằng **Web Audio API** tổng hợp tần số trực tiếp, không cần tải bất kỳ file mp3 bên ngoài nào.

---

## 📂 Cấu trúc thư mục

```
game-hub/
├── index.html              # Trang giao diện chính
├── README.md
├── css/
│   ├── style.css           # Bố cục, thẻ game, modal, bàn cờ
│   ├── themes.css          # Biến màu Sáng / Tối
│   └── animations.css      # Hiệu ứng chuyển động mượt mà
└── js/
    ├── particles.js        # Hiệu ứng hạt nền canvas
    ├── theme.js            # Điều khiển giao diện Sáng / Tối
    ├── sound.js            # Bộ phát âm thanh Web Audio API
    ├── streak.js           # Quản lý chuỗi thắng và thống kê
    ├── ui.js               # Quản lý Modal, Toast, Màn hình thắng/thua
    ├── main.js             # Lọc thể loại, khởi động game
    └── games/
        ├── caroo.js        # Game Caro
        ├── chess.js        # Game Cờ Vua
        ├── xiangqi.js      # Game Cờ Tướng
        ├── oanquan.js      # Game Ô Ăn Quan
        ├── flappybird.js   # Game Flappy Bird
        ├── pacman.js       # Game Pac-Man
        ├── mario.js        # Game Super Mario
        └── snake.js        # Game Snake
```

---

## 🚀 Cách mở và chơi ngay trên máy tính

Chỉ cần click đúp vào file `index.html` trong thư mục:
`C:\Users\nguye\.gemini\antigravity\scratch\game-hub\index.html`
hoặc kéo thả file `index.html` vào trình duyệt Chrome, Edge, Cốc Cốc là chơi được ngay lập tức!

---

## 🌐 Cách đưa lên GitHub Pages để chia sẻ cho bạn bè

1. Tạo 1 repository mới trên GitHub (ví dụ: `game-hub`).
2. Mở terminal tại thư mục `game-hub`:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Game Hub with 8 games"
   git branch -M main
   git remote add origin https://github.com/<username-cua-ban>/game-hub.git
   git push -u origin main
   ```
3. Vào repository trên GitHub $\rightarrow$ **Settings** $\rightarrow$ **Pages** $\rightarrow$ Tại mục Branch chọn `main` / `/(root)` $\rightarrow$ **Save**.
4. Sau 1 phút, bạn sẽ có link web online dạng: `https://<username>.github.io/game-hub/` để gửi cho bạn bè chơi cùng!
