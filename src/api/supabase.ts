import {createClient} from '@supabase/supabase-js';
import Config from 'react-native-config';

const SUPABASE_URL = Config.SUPABASE_URL || 'https://xfspbfxrlgzapmnbhewo.supabase.co';
const SUPABASE_ANON_KEY = Config.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhmc3BiZnhybGd6YXBtbmJoZXdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNDUxMTYsImV4cCI6MjA5OTYyMTExNn0.97U0gwVfLT5rjFJzWyY4XxZAv2SuLzdYBNhEuc4jByI';
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
