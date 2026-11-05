// Nội dung màn hướng dẫn: hướng dẫn từng game + hướng dẫn tổng quan.
window.HELP = {
  games: {
    fps: { keys: 'Chạm hoặc bấm chuột vào 🎯 để bắn.', goal: 'Đạt đủ điểm trước khi hết giờ (8 / 10 / 14 điểm tùy màn).', tips: ['⭐ vàng cho +3 điểm nhưng biến mất rất nhanh.', 'Màn khó: mục tiêu xuất hiện dày hơn và biến mất sớm hơn.'] },
    minesweeper: { keys: 'Chạm để mở ô. Bấm nút 🚩 hoặc giữ lâu / chuột phải để cắm cờ.', goal: 'Mở hết ô an toàn mà không chạm 💣.', tips: ['Con số trên ô là số mìn xung quanh nó.', '💎 +100 điểm; 🌀 bẫy trừ 50 điểm và đổi màu bàn 4 giây.', 'Nước đi đầu tiên luôn an toàn.'] },
    pikachu: { keys: 'Chạm hai ô giống nhau để nối chúng.', goal: 'Xóa hết 24 cặp trước khi hết giờ.', tips: ['Đường nối tối đa 2 lần rẽ và không xuyên qua ô khác.', 'Cứ 3 cặp bạn nhận ngẫu nhiên 🧊 (dừng giờ 5 giây) hoặc 🔀 (xáo trộn).'] },
    chess: { keys: 'Chạm quân rồi chạm ô viền xanh để đi.', goal: 'Chiếu hết vua / tướng của máy.', tips: ['Chế độ ✨ Ma Thuật: 1 lần đi thêm lượt, 1 lần biến Tốt/Chốt thành Hậu/Xe.', 'Màn Dễ máy hay đi sai, màn Khó máy tính trước 3 nước.'] },
    oanquan: { keys: 'Chọn một ô Dân của bạn rồi chọn chiều rải.', goal: 'Nhiều điểm hơn máy khi cả hai ô Quan đã bị ăn.', tips: ['Ô ⭐ Thần Tài nhân đôi điểm khi bị ăn.', 'Hết dân trên bàn của mình thì trả 5 điểm để rải lại.'] },
    flappy: { keys: 'Chạm hoặc nhấn Space để vỗ cánh.', goal: 'Đạt điểm mục tiêu (8 / 10 / 12 tùy màn).', tips: ['🛡️ chống 1 va chạm, 🪶 giảm trọng lực 5 giây, ⚡ tăng tốc 3 giây (mỗi ống +2 điểm).'] },
    mario: { keys: '← → hoặc A D để chạy, Space / ↑ để nhảy (hoặc dùng 3 nút trên màn hình).', goal: 'Chạm 🚩 ở cuối màn.', tips: ['Nhảy lên đầu 🐛 để diệt (+20).', '🍄 biến hình 8 giây: nhảy cao hơn và húc bay kẻ địch.'] },
    pacman: { keys: 'Mũi tên / WASD, vuốt trên màn hình hoặc 4 nút bên dưới.', goal: 'Ăn hết chấm nhỏ trong mê cung.', tips: ['Chấm lớn dọa ma 😱 — ăn ma được +200.', 'Màn sau ma đông hơn và đuổi sát hơn.'] },
    dino: { keys: 'Space / ↑ / chạm để nhảy (giữ lâu nhảy cao hơn), giữ ↓ để cúi.', goal: 'Đạt 300 / 500 / 800 điểm rồi cứ chạy tiếp để lấy điểm cao.', tips: ['Chim bay thấp: nhảy. Chim ngang đầu: cúi. Chim bay cao: cứ chạy qua.', 'Bấm nhảy sớm một chút — game nhớ phím bạn vừa bấm.', 'Cúi khi đang bay giúp rơi nhanh hơn.'] },
  },
  perks: { fps: ['score_boost', 'bonus_time'], minesweeper: ['score_boost'], pikachu: ['score_boost', 'bonus_time'], chess: ['score_boost'], oanquan: ['score_boost'],
    flappy: ['extra_life', 'calm', 'score_boost'], mario: ['extra_life', 'score_boost'], pacman: ['extra_life', 'calm', 'score_boost'], dino: ['extra_life', 'calm', 'score_boost'] },
  topics: [
    { t: '🎮 Bắt đầu chơi', h: '<ul class="gl"><li>Chọn một trò chơi, chọn màn (Dễ/Vừa/Khó hoặc Màn 1-3) rồi bấm <b>Bắt đầu</b>.</li><li>Điểm của bạn được nhân với <b>hệ số màn</b> (×1 / ×1.3 / ×1.7) và <b>kỹ năng Nhân Điểm</b> của thú cưng.</li><li>Mỗi ván xong, điểm được ghi lên bảng xếp hạng — mỗi tài khoản chỉ hiện điểm cao nhất.</li></ul>' },
    { t: '🪙 Xu & nhiệm vụ', h: '<ul class="gl"><li>Mỗi ván cho xu theo điểm số (tối đa khoảng 55 xu/ván, chưa tính thú cưng).</li><li>Nhiệm vụ ngày làm mới mỗi ngày: chơi 3 ván, thắng 1 trận, quay gacha 1 lần. Nhớ bấm <b>Nhận</b> khi hoàn thành.</li></ul>' },
    { t: '🎁 Gacha & bảo hiểm', h: '<ul class="gl"><li>Mỗi lượt quay tốn 🪙100.</li><li><b>Bảo hiểm:</b> tối đa 10 lượt có Sử thi trở lên, tối đa 50 lượt có Huyền thoại trở lên (kỹ năng Mắt Thần rút ngắn các mốc này).</li><li>Quay trúng thú đã có: nhận <b>+1 mảnh tiến hóa</b> và hoàn 🪙10.</li></ul>' },
    { t: '⚡ Tiến hóa thú cưng', h: '<ul class="gl"><li>Mỗi thú có 3 bậc: Sơ sinh → Trưởng thành → Tối thượng.</li><li>Bậc 1→2 cần <b>3 mảnh + 🪙100</b>; bậc 2→3 cần <b>6 mảnh + 🪙300</b>.</li><li>Kỹ năng mạnh lên: <b>×1.5 ở bậc 2</b> và <b>×2 ở bậc 3</b>.</li></ul>' },
    { t: '🐾 Kỹ năng thú cưng', h: '<ul class="gl"><li><b>Kho Báu</b>: +% xu nhận được sau mỗi ván.</li><li><b>Chăm Chỉ</b>: +% xu thưởng nhiệm vụ.</li><li><b>Mắt Thần</b>: gacha ra Sử thi+/Huyền thoại+ sớm hơn.</li><li><b>Hồi Sinh</b>: thêm mạng / khiên khởi đầu (Khủng Long, Mario, Pac-Man, Flappy).</li><li><b>Nhân Điểm</b>: +% điểm mọi game.</li><li><b>Kéo Dài</b>: thêm giây ở Pikachu và Bắn Súng.</li><li><b>Bình Tĩnh</b>: game chạy chậm lại (Khủng Long, Flappy, ma Pac-Man).</li><li>Mỗi kỹ năng chỉ lấy giá trị cao nhất trong bộ sưu tập của bạn, không cộng dồn.</li></ul>' },
    { t: '🏅 Danh hiệu', h: '<ul class="gl"><li>Danh hiệu mở khóa tự động khi đạt thành tích (số ván, chiến thắng, sưu tầm, tiến hóa, kỷ lục từng game…).</li><li>Vào tab <b>Danh hiệu</b> để trang bị — danh hiệu hiện cạnh tên bạn và trên bảng xếp hạng.</li><li>Độ hiếm càng cao, hiệu ứng ánh sáng càng rực rỡ: Thường → Hiếm → Sử thi → Huyền thoại → Thần thoại.</li></ul>' },
  ],
};
