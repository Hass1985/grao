// Dados de exibição do usuário: foto e nome. Persistidos em AsyncStorage.
// O nome também pode vir do perfil-base (conversa inicial); aqui guardamos
// um override editável nas configurações.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile } from './profile';

const AVATAR_KEY = 'grao.avatarUri.v1';
const NAME_KEY = 'grao.displayName.v1';
const MEMBER_KEY = 'grao.memberSince.v1';

type Listener = () => void;
const avatarListeners = new Set<Listener>();

/** Avisa ProfileButton (e outros) quando a foto muda. */
export function subscribeAvatar(listener: Listener): () => void {
  avatarListeners.add(listener);
  return () => {
    avatarListeners.delete(listener);
  };
}

function notifyAvatar() {
  avatarListeners.forEach((l) => l());
}

export async function getAvatarUri(): Promise<string | null> {
  return AsyncStorage.getItem(AVATAR_KEY);
}

export async function setAvatarUri(uri: string | null): Promise<void> {
  if (uri) await AsyncStorage.setItem(AVATAR_KEY, uri);
  else await AsyncStorage.removeItem(AVATAR_KEY);
  notifyAvatar();
}

export async function getDisplayName(): Promise<string> {
  const override = await AsyncStorage.getItem(NAME_KEY);
  if (override) return override;
  const profile = await getProfile();
  return profile?.name || 'Você';
}

/** True só se a pessoa escolheu um nome (não o fallback "Você"). */
export async function hasDisplayName(): Promise<boolean> {
  const override = await AsyncStorage.getItem(NAME_KEY);
  return !!(override && override.trim());
}

export async function setDisplayName(name: string): Promise<void> {
  const v = name.trim();
  if (v) await AsyncStorage.setItem(NAME_KEY, v);
  else await AsyncStorage.removeItem(NAME_KEY);
}

const DEVOCIONAL_OPTIN_KEY = 'grao.devocional.optin.v1';

export async function hasDevocionalOptIn(): Promise<boolean> {
  return (await AsyncStorage.getItem(DEVOCIONAL_OPTIN_KEY)) === '1';
}

export async function setDevocionalOptIn(aceito = true): Promise<void> {
  if (aceito) await AsyncStorage.setItem(DEVOCIONAL_OPTIN_KEY, '1');
  else await AsyncStorage.removeItem(DEVOCIONAL_OPTIN_KEY);
}

export async function getMemberSince(): Promise<string> {
  let iso = await AsyncStorage.getItem(MEMBER_KEY);
  if (!iso) {
    iso = new Date().toISOString();
    await AsyncStorage.setItem(MEMBER_KEY, iso);
  }
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'V';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
