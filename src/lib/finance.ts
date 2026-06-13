import type { BudgetProfile, Recommendation, RecurringExpense, Settlement } from '../types'
import { daysLeftInMonth } from './date'
import { formatMoney } from './money'

export function sumBy<T>(items: T[], selector: (item: T) => number) {
  return items.reduce((total, item) => total + selector(item), 0)
}

export function getMonthItems<T extends { date: string }>(items: T[], month: string) {
  return items.filter((item) => item.date.startsWith(month))
}

export function getRecurringStatus(entry: RecurringExpense, month: string, now = new Date()) {
  const paid = entry.paidMonths.includes(month)
  if (paid) return 'paid' as const
  const selectedMonth = new Date(`${month}-01T00:00:00`)
  const dueDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), entry.dayOfMonth)
  if (entry.active && dueDate < new Date(now.toDateString())) return 'overdue' as const
  return 'expected' as const
}

export function getUnpaidRecurring(profile: BudgetProfile, now = new Date()) {
  return profile.recurring.filter(
    (entry) => entry.active && getRecurringStatus(entry, profile.month, now) !== 'paid',
  )
}

export function getProfileTotals(profile: BudgetProfile, now = new Date()) {
  const monthIncome = getMonthItems(profile.income, profile.month)
  const monthExpenses = getMonthItems(profile.expenses, profile.month)
  const income = sumBy(monthIncome, (entry) => entry.amount)
  const expenses = sumBy(monthExpenses, (entry) => entry.amount)
  const recurring = sumBy(getUnpaidRecurring(profile, now), (entry) => entry.amount)
  const projectedExpenses = expenses + recurring
  const left = income - projectedExpenses
  const remainingDays = daysLeftInMonth(profile.month, now)

  return {
    income,
    expenses,
    recurring,
    projectedExpenses,
    left,
    remainingDays,
    safeDaily: left / remainingDays,
  }
}

export function buildCategoryData(profile: BudgetProfile, now = new Date()) {
  const totals = new Map<string, number>()
  getMonthItems(profile.expenses, profile.month).forEach((entry) => {
    totals.set(entry.category, (totals.get(entry.category) ?? 0) + entry.amount)
  })
  profile.recurring
    .filter((entry) => entry.active && getRecurringStatus(entry, profile.month, now) !== 'paid')
    .forEach((entry) => totals.set(entry.category, (totals.get(entry.category) ?? 0) + entry.amount))
  return [...totals.entries()].map(([name, value]) => ({ name, value }))
}

export function getCategoryBudgetProgress(profile: BudgetProfile, now = new Date()) {
  const actualByCategory = new Map(buildCategoryData(profile, now).map((item) => [item.name, item.value]))
  return Object.entries(profile.budgetLimits)
    .filter(([, limit]) => Number.isFinite(limit) && limit > 0)
    .map(([category, limit]) => {
      const actual = actualByCategory.get(category) ?? 0
      const percent = limit > 0 ? actual / limit : 0
      const status: 'ok' | 'near' | 'over' = percent >= 1 ? 'over' : percent >= 0.8 ? 'near' : 'ok'
      return {
        category,
        limit,
        actual,
        remaining: limit - actual,
        percent,
        status,
      }
    })
    .sort((a, b) => b.percent - a.percent)
}

export function buildIncomeExpenseData(profile: BudgetProfile) {
  const byDay = new Map<string, { day: string; prihodki: number; stroski: number }>()
  getMonthItems(profile.income, profile.month).forEach((entry) => {
    const day = entry.date.slice(8, 10)
    const row = byDay.get(day) ?? { day, prihodki: 0, stroski: 0 }
    row.prihodki += entry.amount
    byDay.set(day, row)
  })
  getMonthItems(profile.expenses, profile.month).forEach((entry) => {
    const day = entry.date.slice(8, 10)
    const row = byDay.get(day) ?? { day, prihodki: 0, stroski: 0 }
    row.stroski += entry.amount
    byDay.set(day, row)
  })
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day))
}

export function getSurvivalMode(profile: BudgetProfile, now = new Date()) {
  const totals = getProfileTotals(profile, now)
  const actualBalance = profile.currentBalance ?? totals.income - totals.expenses
  const unpaidRecurring = getUnpaidRecurring(profile, now)
  const unpaidExpected = sumBy(unpaidRecurring, (entry) => entry.amount)
  const realBalance = actualBalance - unpaidExpected
  const safeDaily = realBalance / totals.remainingDays
  const tone: 'safe' | 'careful' | 'danger' =
    realBalance < 0 ? 'danger' : safeDaily < 8 ? 'careful' : 'safe'
  const categoryTotals = buildCategoryData(profile, now)
  const priority = ['Malica / kava', 'Zabava', 'Oblačila', 'Telefon / internet', 'Transport']
  const suggestions = [
    ...priority.filter((category) => categoryTotals.some((item) => item.name === category)),
    'Ne-nujni nakupi',
    'Cenejši prevoz / hoja / študentski popusti',
  ]
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, 3)

  return {
    actualBalance,
    realBalance,
    unpaidExpected,
    unpaidRecurring,
    daysLeft: totals.remainingDays,
    safeDaily,
    tone,
    suggestions,
  }
}

export function getRecommendations(profile: BudgetProfile, now = new Date()): Recommendation[] {
  const totals = getProfileTotals(profile, now)
  const survival = getSurvivalMode(profile, now)
  const categoryData = buildCategoryData(profile, now).sort((a, b) => b.value - a.value)
  const budgetProgress = getCategoryBudgetProgress(profile, now)
  const recommendations: Recommendation[] = []

  if (survival.realBalance < 0) {
    recommendations.push({
      id: 'negative-real-balance',
      title: 'Najprej pokrij neplačane obveznosti',
      text: `Po neplačanih rednih stroških si na ${formatMoney(survival.realBalance)}. Preveri najemnino, prevoz in položnice ter označi, kaj je že plačano.`,
      tone: 'danger',
      actionLabel: 'Odpri najem',
      target: 'rent',
    })
  }

  if (survival.safeDaily >= 0 && survival.safeDaily < 8) {
    recommendations.push({
      id: 'low-daily-budget',
      title: 'Ta mesec igraj previdno',
      text: `Varen dnevni znesek je ${formatMoney(survival.safeDaily)}. Za nekaj dni se splača omejiti malico, kavo in nenujne nakupe.`,
      tone: 'careful',
      actionLabel: 'Dodaj strošek',
      target: 'expenses',
    })
  }

  const biggest = categoryData[0]
  if (biggest && biggest.value > Math.max(50, totals.projectedExpenses * 0.28)) {
    recommendations.push({
      id: 'big-category',
      title: `Največ prostora je v: ${biggest.name}`,
      text: `${biggest.name} je trenutno ${formatMoney(biggest.value)}. Če želiš hitro izboljšati mesec, preveri zadnje vnose v tej kategoriji.`,
      tone: 'careful',
      actionLabel: 'Preglej stroške',
      target: 'expenses',
    })
  }

  const overBudget = budgetProgress.find((item) => item.status === 'over')
  if (overBudget) {
    recommendations.push({
      id: 'category-over-budget',
      title: `${overBudget.category} je čez plan`,
      text: `Plan je ${formatMoney(overBudget.limit)}, poraba pa ${formatMoney(overBudget.actual)}. Do konca meseca to kategorijo drži samo za nujne stvari.`,
      tone: 'danger',
      actionLabel: 'Odpri vpoglede',
      target: 'insights',
    })
  }

  const nearBudget = budgetProgress.find((item) => item.status === 'near')
  if (!overBudget && nearBudget) {
    recommendations.push({
      id: 'category-near-budget',
      title: `${nearBudget.category} je blizu limita`,
      text: `Porabil/a si ${formatMoney(nearBudget.actual)} od ${formatMoney(nearBudget.limit)}. Še ${formatMoney(nearBudget.remaining)} prostora.`,
      tone: 'careful',
      actionLabel: 'Odpri vpoglede',
      target: 'insights',
    })
  }

  if (totals.income === 0) {
    recommendations.push({
      id: 'missing-income',
      title: 'Dodaj vsaj približen prihodek',
      text: 'Brez prihodkov app težko izračuna realen dnevni limit. Dovolj je ocena za študentsko delo, štipendijo ali pomoč staršev.',
      tone: 'careful',
      actionLabel: 'Dodaj prihodek',
      target: 'income',
    })
  }

  if (profile.recurring.length === 0) {
    recommendations.push({
      id: 'missing-recurring',
      title: 'Dodaj redne stroške',
      text: 'Najemnina, prevoz, telefon in internet so stroški, ki najpogosteje pokvarijo Survival Mode, če niso vnaprej vpisani.',
      tone: 'safe',
      actionLabel: 'Dodaj redni strošek',
      target: 'rent',
    })
  }

  if (profile.expenses.length < 3) {
    recommendations.push({
      id: 'few-expenses',
      title: 'Vnesi nekaj realnih stroškov',
      text: 'Po treh do petih vnosih bodo hitre predloge, grafi in priporočila precej bolj uporabni.',
      tone: 'safe',
      actionLabel: 'Hiter strošek',
      target: 'expenses',
    })
  }

  return recommendations.slice(0, 4)
}

export function calculateSettlements(profile: BudgetProfile): Settlement[] {
  const roommates = new Map(profile.roommates.map((roommate) => [roommate.id, roommate]))
  const balances = new Map(profile.roommates.map((roommate) => [roommate.id, 0]))

  profile.bills
    .filter((bill) => !bill.settled && bill.participants.length > 0 && roommates.has(bill.paidBy))
    .forEach((bill) => {
      balances.set(bill.paidBy, (balances.get(bill.paidBy) ?? 0) + bill.amount)
      const participants = bill.participants.filter((id) => roommates.has(id))
      const totalPercent = sumBy(participants, (id) => roommates.get(id)?.sharePercent ?? 0)
      participants.forEach((id) => {
        const owed =
          bill.splitMode === 'custom' && totalPercent > 0
            ? bill.amount * ((roommates.get(id)?.sharePercent ?? 0) / totalPercent)
            : bill.amount / participants.length
        balances.set(id, (balances.get(id) ?? 0) - owed)
      })
    })

  const debtors = [...balances.entries()]
    .filter(([, amount]) => amount < -0.01)
    .map(([id, amount]) => ({ id, amount: Math.abs(amount) }))
  const creditors = [...balances.entries()]
    .filter(([, amount]) => amount > 0.01)
    .map(([id, amount]) => ({ id, amount }))
  const settlements: Settlement[] = []

  debtors.forEach((debtor) => {
    let remaining = debtor.amount
    creditors.forEach((creditor) => {
      if (remaining <= 0.01 || creditor.amount <= 0.01) return
      const amount = Math.min(remaining, creditor.amount)
      settlements.push({
        from: roommates.get(debtor.id)?.name ?? 'Nekdo',
        to: roommates.get(creditor.id)?.name ?? 'Nekdo',
        amount,
      })
      remaining -= amount
      creditor.amount -= amount
    })
  })

  return settlements
}
