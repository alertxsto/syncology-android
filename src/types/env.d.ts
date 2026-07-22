declare module 'react-native-config' {
  interface NativeConfig {
    FIREBASE_API_KEY?: string;
    FIREBASE_PROJECT_ID?: string;
    GOOGLE_WEB_CLIENT_ID?: string;
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
    SUPABASE_SERVICE_KEY?: string;
  }

  const Config: NativeConfig;
  export default Config;
}
