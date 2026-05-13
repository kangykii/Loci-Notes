import type { ReactNode } from 'react'

export function DashboardPanel({ title, className = '', children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <section className={`dashboard-panel ${className}`}>
      <h3>{title}</h3>
      {children}
    </section>
  )
}
