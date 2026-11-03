// Dán URL và "anon public key" từ Supabase > Project Settings > API.
// Key này CÔNG KHAI được (an toàn nhờ RLS trong schema.sql).
// TUYỆT ĐỐI KHÔNG dán service_role key vào đây.
window.CONFIG = {
  SUPABASE_URL: "https://nxrfnkgmgcqxajfzsfkc.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54cmZua2dtZ2NxeGFqZnpzZmtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1MjgyNTgsImV4cCI6MjEwOTEwNDI1OH0.Nd73UWTQXwLMwYVJB_BPDXprVkazeNBwjlDS3qvhhGg",
};
