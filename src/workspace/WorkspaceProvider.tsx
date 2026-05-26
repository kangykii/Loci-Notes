import type { ReactNode } from 'react'

import { workspaceStore } from './workspaceStore'

type WorkspaceProviderProps = {
  children: ReactNode
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  return children
}

export { workspaceStore }
