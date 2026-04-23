import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// NEXT_PUBLIC_* 는 빌드 시 번들에 inline 됨. 클라이언트/서버 양쪽에서 사용 가능.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Supabase 환경변수가 없어요. .env.local 에 NEXT_PUBLIC_SUPABASE_URL 과 NEXT_PUBLIC_SUPABASE_ANON_KEY 를 설정해주세요.",
  );
}

export const supabase: SupabaseClient = createClient(url, anonKey);
