import { assertLocalSupabase } from "../support/local-supabase";

assertLocalSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL);
