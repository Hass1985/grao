import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = (process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined)?.trim() || '';
const key =
  (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
  (process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ||
  '';

export const SUPABASE_CONFIGURED = Boolean(url && key);

export const supabase: SupabaseClient | null = SUPABASE_CONFIGURED
  ? createClient(url, key, {
      auth: {
        storage: Platform.OS === 'web' ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
    })
  : null;

if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
