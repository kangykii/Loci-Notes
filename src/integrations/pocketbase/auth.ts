import type { AuthModel, OAuth2AuthConfig, RecordAuthResponse } from 'pocketbase'
import { pb } from './client'

export type OAuthProvider = 'google' | 'github'

export async function signInWithEmail(email: string, password: string) {
  return await pb.collection('users').authWithPassword(email, password)
}

export async function signUpWithEmail(email: string, password: string, name: string) {
  await pb.collection('users').create({
    email,
    password,
    passwordConfirm: password,
    name,
  })
  return await signInWithEmail(email, password)
}

export function signOut() {
  pb.authStore.clear()
}

export function getCurrentUser(): AuthModel {
  return pb.authStore.model
}

export function onAuthChange(callback: (token: string, user: AuthModel) => void) {
  return pb.authStore.onChange(callback, true)
}

export async function signInWithOAuth(provider: OAuthProvider): Promise<RecordAuthResponse> {
  // TODO: Register the Tauri deep link in tauri.conf.json:
  // "deep-link": { "urls": ["loci://auth/callback"] }
  return await pb.collection('users').authWithOAuth2({
    provider,
    redirectUrl: 'loci://auth/callback',
  } as OAuth2AuthConfig & { redirectUrl: string })
}

export const signInWithGoogle = () => signInWithOAuth('google')
export const signInWithGitHub = () => signInWithOAuth('github')
