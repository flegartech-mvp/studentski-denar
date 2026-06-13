import type { HTMLAttributes, ReactNode } from 'react'

export function SectionCard({
  children,
  className = '',
  ...props
}: { children: ReactNode; className?: string } & HTMLAttributes<HTMLElement>) {
  return (
    <section {...props} className={`rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4 shadow-sm ${className}`}>
      {children}
    </section>
  )
}
