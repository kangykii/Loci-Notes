import type { ReactNode } from 'react'

export function PageHeader({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <header className="pane-header">
      <div>
        {typeof title === 'string' ? <h2>{title}</h2> : title}
      </div>
      {action}
    </header>
  )
}
