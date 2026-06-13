export function currentMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function today(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function daysLeftInMonth(month: string, now = new Date()) {
  const selectedMonth = new Date(`${month}-01T00:00:00`)
  const lastDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate()
  const day = month === currentMonth(now) ? now.getDate() : 1
  return Math.max(1, lastDay - day + 1)
}
