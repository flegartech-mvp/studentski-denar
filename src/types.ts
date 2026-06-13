export type View =
  | 'dashboard'
  | 'income'
  | 'expenses'
  | 'rent'
  | 'roommates'
  | 'insights'
  | 'supporter'
  | 'privacy'
  | 'settings'
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'reset-password'
  | 'profile'
  | 'change-password'
  | 'notfound'

export type RoutableView = Exclude<View, 'notfound'>
export type SplitMode = 'equal' | 'custom'
export type Theme = 'default' | 'sava' | 'lipica' | 'triglav'
export type Tone = 'safe' | 'careful' | 'danger'

export type IncomeEntry = {
  id: string
  amount: number
  date: string
  source: string
  note: string
}

export type ExpenseEntry = {
  id: string
  amount: number
  date: string
  category: string
  note: string
}

export type RecurringExpense = {
  id: string
  name: string
  amount: number
  category: string
  dayOfMonth: number
  active: boolean
  paidMonths: string[]
}

export type Roommate = {
  id: string
  name: string
  sharePercent: number
}

export type SharedBill = {
  id: string
  name: string
  amount: number
  paidBy: string
  splitMode: SplitMode
  participants: string[]
  settled: boolean
}

export type BudgetProfile = {
  id: string
  name: string
  month: string
  currentBalance: number | null
  budgetLimits: Record<string, number>
  income: IncomeEntry[]
  expenses: ExpenseEntry[]
  recurring: RecurringExpense[]
  roommates: Roommate[]
  bills: SharedBill[]
}

export type UserSettings = {
  currency: 'EUR'
  language: 'sl'
  theme: Theme
  activeProfileId: string
  onboardingCompleted: boolean
  onboardingSkipped: boolean
  lastBackupAt: string | null
  backupReminderDays: number
  pendingSupporterAt: string | null
}

export type SupporterLicense = {
  raw: string
  emailHash: string
  tier: string
  expiresAt: string | null
  lifetime: boolean
  issuedAt: string
  signature: string
  activatedAt: string
}

export type ProfileRow = {
  id: string
  email: string
  display_name: string | null
  marketing_consent: boolean
  created_at: string
  updated_at: string
}

export type SupporterStatus = 'free' | 'pending' | 'active' | 'expiring_soon' | 'expired'

export type SupporterAccessRow = {
  id: string
  user_id: string
  status: SupporterStatus
  plan_name: string
  starts_at: string | null
  expires_at: string | null
  payment_provider: string | null
  payment_reference: string | null
  created_at: string
  updated_at: string
}

export type AppData = {
  version: 1
  settings: UserSettings
  profiles: BudgetProfile[]
  license: SupporterLicense | null
}

export type OnboardingForm = {
  monthlyIncome: string
  rent: string
  transport: string
  food: string
  hasRoommates: boolean
  scholarship: string
  studentWork: string
  currentBalance: string
}

export type LicensePayload = {
  emailHash: string
  tier: string
  expiresAt?: string | null
  lifetime?: boolean
  issuedAt: string
}

export type Settlement = {
  from: string
  to: string
  amount: number
}

export type Recommendation = {
  id: string
  title: string
  text: string
  tone: Tone
  actionLabel: string
  target: RoutableView
}
