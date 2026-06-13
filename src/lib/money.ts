const moneyFormatter = new Intl.NumberFormat('sl-SI', {
  style: 'currency',
  currency: 'EUR',
})

export function formatMoney(value: number) {
  return moneyFormatter.format(Number.isFinite(value) ? value : 0)
}

export function parseMoney(value: string, max = 1_000_000) {
  const parsed = Number(value.replace(',', '.').trim())
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > max) return null
  return Math.round(parsed * 100) / 100
}

export function parseOptionalMoney(value: string, max = 1_000_000) {
  if (!value.trim()) return null
  const parsed = Number(value.replace(',', '.').trim())
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > max) return null
  return Math.round(parsed * 100) / 100
}

export function csvEscape(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`
}
