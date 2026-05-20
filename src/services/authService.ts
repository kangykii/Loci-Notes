import type { AccountProfile, AuthSession } from '../db'
import { authManager, signedOutSession } from './authManager'

export type OnlineAccountState = {
  session: AuthSession
  profile?: AccountProfile
}

export type AuthService = {
  getAccountState: () => Promise<OnlineAccountState>
  signOut: () => Promise<AuthSession>
}

export { signedOutSession }

export const authService: AuthService = {
  getAccountState: () => authManager.getAccountState(),

  signOut: () => authManager.signOut(),
}
