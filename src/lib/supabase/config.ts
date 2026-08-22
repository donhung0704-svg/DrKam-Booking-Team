// Cấu hình kết nối Supabase (dùng chung cho client / server / proxy).
//
// Vì sao để trực tiếp trong code thay vì env var:
//   - anon/publishable key là key CÔNG KHAI (Supabase ghi rõ "can be safely
//     shared publicly") và vốn đã nằm trong bundle trình duyệt, nên không phải
//     bí mật.
//   - Trỏ thẳng tới project mới giúp không phụ thuộc biến môi trường cũ trên
//     Vercel (đang trỏ project cũ đã bị khóa).
//
// Muốn đổi project sau này: chỉ cần sửa 2 dòng dưới đây rồi deploy lại.
export const SUPABASE_URL = "https://aapzzpgkrfuenfjpqade.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_C3862YN0tw3Ux9p22RfRoQ_kLowRhX_";
