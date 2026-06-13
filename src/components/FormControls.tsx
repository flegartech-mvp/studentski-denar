import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function Button({
  children,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  const style =
    variant === 'primary'
      ? 'bg-[var(--brand)] text-white hover:bg-[var(--brand-dark)]'
      : variant === 'danger'
        ? 'bg-red-50 text-red-700 hover:bg-red-100'
        : 'bg-[var(--panel-muted)] text-[var(--ink)] hover:bg-[var(--line)]'
  return (
    <button
      {...props}
      className={`relative z-10 inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 ${style} ${props.className ?? ''}`}
    >
      {children}
    </button>
  )
}

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-[var(--ink)]">
      <span>{label}</span>
      {children}
    </label>
  )
}

export const inputClass =
  'min-h-11 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)] shadow-sm'
