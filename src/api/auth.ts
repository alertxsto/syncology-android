/**
 * Google Sign-In native + Firebase token exchange untuk Android.
 *
 * Flow:
 * 1. GoogleSignin.signIn() — native Google sheet muncul
 * 2. Ambil idToken dari result
 * 3. Exchange ke Firebase ID token via REST (identitytoolkit)
 * 4. Return FirebaseUser dengan uid, displayName, email, idToken
 *
 * Tidak ada localhost, tidak ada browser popup.
 * Semua keys dibaca dari .env via react-native-config.
 */

import {
  GoogleSignin,
  statusCodes,
  isSuccessResponse,
  isCancelledResponse,
} from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';
import type {FirebaseUser} from '../types';

const FIREBASE_API_KEY = Config.FIREBASE_API_KEY || 'AIzaSyCD7pAHMkUH7yTxzWbHaJ294tjdFXTA4gE';
const FIREBASE_PROJECT_ID = Config.FIREBASE_PROJECT_ID || 'syncology';
const WEB_CLIENT_ID = Config.GOOGLE_WEB_CLIENT_ID || '884634335184-1lbj14fcqcck8lvlloofrj3vhh0bdesp.apps.googleusercontent.com';

const AUTH_KEY = '@syncology/auth_user';

export function configureGoogleSignIn() {
  if (!WEB_CLIENT_ID) {
    console.warn('[auth] GOOGLE_WEB_CLIENT_ID tidak terset di .env');
  }
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    offlineAccess: false,
    scopes: ['profile', 'email'],
  });
}

/**
 * Tukar Google ID token ke Firebase ID token via REST API.
 * Menggantikan FirebaseApp SDK — cukup pakai identitytoolkit endpoint langsung.
 */
async function exchangeGoogleTokenForFirebase(googleIdToken: string): Promise<{
  idToken: string;
  refreshToken: string;
  uid: string;
}> {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${FIREBASE_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      postBody: `id_token=${googleIdToken}&providerId=google.com`,
      requestUri: `https://${FIREBASE_PROJECT_ID}.firebaseapp.com/__/auth/handler`,
      returnIdpCredential: true,
      returnSecureToken: true,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Firebase token exchange gagal');
  }

  const data = await response.json();
  return {
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    uid: data.localId,
  };
}

export async function signInWithGoogle(): Promise<FirebaseUser> {
  // Pastikan SDK selalu terkonfigurasi
  configureGoogleSignIn();

  await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});

  // Clear sesi lokal sebelumnya agar Google Play Services selalu memicu modal pilih akun baru
  try {
    await GoogleSignin.signOut();
  } catch (_) {}

  const signInResult = await GoogleSignin.signIn();
  if (isCancelledResponse(signInResult)) {
    throw new Error('Login dibatalkan oleh pengguna');
  }

  let googleIdToken: string | undefined | null;
  let userInfo: any;

  if (isSuccessResponse(signInResult)) {
    googleIdToken = signInResult.data.idToken || (signInResult as any).idToken;
    userInfo = signInResult.data.user || (signInResult as any).user;
  } else {
    // Check direct property fallback
    googleIdToken = (signInResult as any)?.data?.idToken || (signInResult as any)?.idToken;
    userInfo = (signInResult as any)?.data?.user || (signInResult as any)?.user;
  }

  // Fallback ke GoogleSignin.getTokens() jika idToken belum didapat dari signInResult
  if (!googleIdToken) {
    try {
      const tokens = await GoogleSignin.getTokens();
      googleIdToken = tokens.idToken;
    } catch (e) {
      console.warn('[auth] getTokens fallback gagal:', e);
    }
  }

  if (!googleIdToken) {
    throw new Error(
      'Tidak mendapat ID token dari Google. Pastikan GOOGLE_WEB_CLIENT_ID di .env sudah benar dan SHA-1 sudah terdaftar di Firebase Console.',
    );
  }

  const {idToken, refreshToken, uid} = await exchangeGoogleTokenForFirebase(
    googleIdToken,
  );

  const firebaseUser: FirebaseUser = {
    uid,
    displayName: userInfo?.name ?? '',
    email: userInfo?.email ?? '',
    photoURL: userInfo?.photo ?? undefined,
    idToken,
    refreshToken,
  };

  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(firebaseUser));
  return firebaseUser;
}

export async function refreshFirebaseToken(
  refreshToken: string,
): Promise<string> {
  const url = `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: `grant_type=refresh_token&refresh_token=${refreshToken}`,
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Token refresh gagal');
  }

  const data = await response.json();
  return data.id_token;
}

export async function getStoredUser(): Promise<FirebaseUser | null> {
  const raw = await AsyncStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as FirebaseUser;
}

export async function updateStoredToken(
  user: FirebaseUser,
  newIdToken: string,
): Promise<FirebaseUser> {
  const updated = {...user, idToken: newIdToken};
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(updated));
  return updated;
}

export async function signOut(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch (_) {
    // bisa gagal kalau user belum sign in — abaikan
  }
  await AsyncStorage.removeItem(AUTH_KEY);
}

export {statusCodes};
