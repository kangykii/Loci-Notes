import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: ReactNode
  action?: ReactNode
}

export function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <header className="pane-header">
      <div>{typeof title === 'string' ? <h2>{title}</h2> : title}</div>
      {action}
    </header>
  )
}
