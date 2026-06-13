export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--line)] bg-[var(--panel-muted)] p-5 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{text}</p>
    </div>
  )
}
