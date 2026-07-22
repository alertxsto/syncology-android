import {createClient} from '@supabase/supabase-js';
import Config from 'react-native-config';

const SUPABASE_URL = Config.SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = Config.SUPABASE_ANON_KEY ?? '';
const SUPABASE_SERVICE_KEY = Config.SUPABASE_SERVICE_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[supabase] SUPABASE_URL atau SUPABASE_ANON_KEY tidak terset di .env');
}

// Client untuk read-ops (anon key)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {persistSession: false},
});

// Client untuk write/mutate ops (service key — bypass RLS)
// Sama dengan yang dipakai Rust backend di desktop
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {persistSession: false},
});

export {SUPABASE_URL};
