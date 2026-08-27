// Dados de exibição do usuário: foto e nome. Persistidos em AsyncStorage.
// O nome também pode vir do perfil-base (conversa inicial); aqui guardamos
// um override editável nas configurações.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile } from './profile';

const AVATAR_KEY = 'grao.avatarUri.v1';
const NAME_KEY = 'grao.displayName.v1';
const MEMBER_KEY = 'grao.memberSince.v1';

export async function getAvatarUri(): Promise<string | null> {
  return AsyncStorage.getItem(AVATAR_KEY);
}
export async function setAvatarUri(uri: string | null): Promise<void> {
  if (uri) await AsyncStorage.setItem(AVATAR_KEY, uri);
  else await AsyncStorage.removeItem(AVATAR_KEY);
}

export async function getDisplayName(): Promise<string> {
  const override = await AsyncStorage.getItem(NAME_KEY);
  if (override) return override;
  const profile = await getProfile();
  return profile?.name || 'Você';
}
export async function setDisplayName(name: string): Promise<void> {
  await AsyncStorage.setItem(NAME_KEY, name.trim());
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
