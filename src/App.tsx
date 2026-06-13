import {
  Banknote,
  CheckCircle2,
  HeartHandshake,
  Home,
  LineChart,
  Lock,
  Plus,
  ReceiptText,
  Repeat2,
  Settings,
  ShieldCheck,
  UserCircle,
  Users,
  Wallet,
} from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import {
  Dashboard,
  ExpensesPage,
  IncomePage,
  InsightsPage,
  NotFoundPage,
  OnboardingPage,
  PrivacyPage,
  RentPage,
  RoommatePage,
  SettingsPage,
  SupporterPage,
} from './pages/AppPages'
import {
  ChangePasswordPage,
  ForgotPasswordPage,
  LoginPage,
  ProfilePage,
  RegisterPage,
  ResetPasswordPage,
} from './pages/AuthPages'
import { getAuthViewFromUrlHash } from './lib/auth'
import { expenseCategories } from './lib/categories'
import { currentMonth, today } from './lib/date'
import { hasActiveSupporterAccess } from './lib/supporterAccess'
import { submitSupporterRequest, updateOwnProfile } from './lib/userData'
import { useAuth } from './hooks/useAuth'
import { useCloudSync } from './hooks/useCloudSync'
import {
  buildCategoryData,
  buildIncomeExpenseData,
  calculateSettlements,
  getCategoryBudgetProgress,
  getProfileTotals,
  getRecommendations,
  getSurvivalMode,
  sumBy,
} from './lib/finance'
import { defaultPublicKeyPem, isSupporter, verifyLicenseKey as verifySignedLicenseKey } from './lib/license'
import { csvEscape, parseMoney, parseOptionalMoney } from './lib/money'
import { createDefaultData, createDefaultProfile, loadData, normalizeAppData, saveData, uid } from './lib/storage'
import { QuickExpenseDrawer } from './components/QuickExpenseDrawer'
import type {
  AppData,
  BudgetProfile,
  ExpenseEntry,
  IncomeEntry,
  OnboardingForm,
  RecurringExpense,
  SplitMode,
  ProfileRow,
  UserSettings,
  View,
} from './types'

const publicKeyPem =
  import.meta.env.VITE_SUPPORTER_PUBLIC_KEY_PEM?.replace(/\\n/g, '\n') ?? defaultPublicKeyPem

const navItems: { id: View; label: string; icon: typeof Wallet }[] = [
  { id: 'dashboard', label: 'Pregled', icon: Wallet },
  { id: 'income', label: 'Prihodki', icon: Banknote },
  { id: 'expenses', label: 'Stroški', icon: ReceiptText },
  { id: 'rent', label: 'Najem', icon: Home },
  { id: 'roommates', label: 'Cimri', icon: Users },
  { id: 'insights', label: 'Vpogledi', icon: LineChart },
  { id: 'supporter', label: 'Supporter', icon: HeartHandshake },
  { id: 'privacy', label: 'Zasebnost', icon: ShieldCheck },
  { id: 'settings', label: 'Nastavitve', icon: Settings },
  { id: 'profile', label: 'Racun', icon: UserCircle },
]
const validViews = new Set<View>([
  ...navItems.map((item) => item.id),
  'login',
  'register',
  'forgot-password',
  'reset-password',
  'change-password',
])

function getInitialView(): View {
  const authView = getAuthViewFromUrlHash()
  if (authView) return authView as View
  const hash = window.location.hash.replace('#', '') as View
  if (!hash) return 'dashboard'
  return validViews.has(hash) ? hash : 'notfound'
}

function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function App() {
  const {
    user: authUser,
    profile: remoteProfile,
    supporterAccess: remoteAccess,
    error: authError,
    signOut: signOutAuthUser,
    refreshProfile,
  } = useAuth()
  const [data, setData] = useState<AppData>(() => loadData())
  const cloudSync = useCloudSync({ user: authUser, data, setData })
  const [view, setView] = useState<View>(() => getInitialView())
  const [remoteMessage, setRemoteMessage] = useState('')
  const [incomeForm, setIncomeForm] = useState({ amount: '', date: today(), source: '', note: '' })
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    date: today(),
    category: expenseCategories[0],
    note: '',
  })
  const [recurringForm, setRecurringForm] = useState({
    name: '',
    amount: '',
    category: expenseCategories[2],
    dayOfMonth: '1',
  })
  const [roommateForm, setRoommateForm] = useState({ name: '', sharePercent: '50' })
  const [billForm, setBillForm] = useState({ name: '', amount: '', paidBy: '', splitMode: 'equal' as SplitMode })
  const [profileForm, setProfileForm] = useState({ name: '', month: currentMonth() })
  const [onboardingForm, setOnboardingForm] = useState<OnboardingForm>({
    monthlyIncome: '',
    rent: '',
    transport: '',
    food: '',
    hasRoommates: false,
    scholarship: '',
    studentWork: '',
    currentBalance: '',
  })
  const [licenseInput, setLicenseInput] = useState('')
  const [licenseMessage, setLicenseMessage] = useState('')
  const [paymentReference, setPaymentReference] = useState('')
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null)
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  const [editingRecurringId, setEditingRecurringId] = useState<string | null>(null)
  const [quickExpenseOpen, setQuickExpenseOpen] = useState(false)
  const [renderedAt] = useState(() => Date.now())
  const databaseSupporter = hasActiveSupporterAccess(remoteAccess)
  const supporter = authUser ? databaseSupporter : isSupporter(data.license)
  const appReady = data.settings.onboardingCompleted || data.settings.onboardingSkipped

  useEffect(() => {
    saveData(data)
  }, [data])

  useEffect(() => {
    const onNavigationChange = () => {
      setView(getInitialView())
    }
    window.addEventListener('hashchange', onNavigationChange)
    window.addEventListener('popstate', onNavigationChange)
    return () => {
      window.removeEventListener('hashchange', onNavigationChange)
      window.removeEventListener('popstate', onNavigationChange)
    }
  }, [])

  useEffect(() => {
    if (getAuthViewFromUrlHash()) return
    if (window.location.hash !== `#${view}`) {
      window.history.pushState(null, '', `#${view}`)
    }
  }, [view])

  useEffect(() => {
    if (!data.license?.raw) return
    verifySignedLicenseKey(data.license.raw, publicKeyPem).then((result) => {
      if (!result.license) {
        setData((current) => ({ ...current, license: null }))
        setLicenseMessage(result.message)
      }
    })
  }, [data.license?.raw])

  const activeProfile = useMemo(() => {
    return data.profiles.find((profile) => profile.id === data.settings.activeProfileId) ?? data.profiles[0]
  }, [data.profiles, data.settings.activeProfileId])

  const totals = useMemo(() => getProfileTotals(activeProfile), [activeProfile])
  const survival = useMemo(() => getSurvivalMode(activeProfile), [activeProfile])
  const recommendations = useMemo(() => getRecommendations(activeProfile), [activeProfile])
  const categoryData = useMemo(() => buildCategoryData(activeProfile), [activeProfile])
  const budgetProgress = useMemo(() => getCategoryBudgetProgress(activeProfile), [activeProfile])
  const incomeExpenseData = useMemo(() => buildIncomeExpenseData(activeProfile), [activeProfile])
  const settlements = useMemo(() => calculateSettlements(activeProfile), [activeProfile])
  const customShareTotal = sumBy(activeProfile.roommates, (roommate) => roommate.sharePercent)
  const authPageOpen = ['login', 'register', 'forgot-password', 'reset-password', 'profile', 'change-password'].includes(view)

  function updateProfile(updater: (profile: BudgetProfile) => BudgetProfile) {
    setData((current) => ({
      ...current,
      profiles: current.profiles.map((profile) =>
        profile.id === activeProfile.id ? updater(profile) : profile,
      ),
    }))
  }

  function updateSettings(settings: Partial<UserSettings>) {
    setData((current) => ({
      ...current,
      settings: { ...current.settings, ...settings },
    }))
  }

  function setBudgetLimit(category: string, limit: number | null) {
    updateProfile((profile) => {
      const budgetLimits = { ...profile.budgetLimits }
      if (limit === null) {
        delete budgetLimits[category]
      } else {
        budgetLimits[category] = limit
      }
      return { ...profile, budgetLimits }
    })
  }

  function applyBudgetPreset(limits: Record<string, number>) {
    updateProfile((profile) => ({
      ...profile,
      budgetLimits: { ...profile.budgetLimits, ...limits },
    }))
  }

  function submitIncome(event: FormEvent) {
    event.preventDefault()
    const amount = parseMoney(incomeForm.amount)
    if (amount === null || !incomeForm.source.trim()) return
    updateProfile((profile) => {
      const previous = editingIncomeId
        ? profile.income.find((item) => item.id === editingIncomeId)?.amount ?? 0
        : 0
      const entry: IncomeEntry = {
        id: editingIncomeId ?? uid('income'),
        amount,
        date: incomeForm.date,
        source: incomeForm.source.trim(),
        note: incomeForm.note.trim(),
      }
      return {
        ...profile,
        currentBalance:
          profile.currentBalance === null ? null : profile.currentBalance + amount - previous,
        income: editingIncomeId
          ? profile.income.map((item) => (item.id === editingIncomeId ? entry : item))
          : [entry, ...profile.income],
      }
    })
    setIncomeForm({ amount: '', date: today(), source: '', note: '' })
    setEditingIncomeId(null)
  }

  function submitExpense(event: FormEvent) {
    event.preventDefault()
    const amount = parseMoney(expenseForm.amount)
    if (amount === null) return
    updateProfile((profile) => {
      const previous = editingExpenseId
        ? profile.expenses.find((item) => item.id === editingExpenseId)?.amount ?? 0
        : 0
      const entry: ExpenseEntry = {
        id: editingExpenseId ?? uid('expense'),
        amount,
        date: expenseForm.date,
        category: expenseForm.category,
        note: expenseForm.note.trim(),
      }
      return {
        ...profile,
        currentBalance:
          profile.currentBalance === null ? null : profile.currentBalance - amount + previous,
        expenses: editingExpenseId
          ? profile.expenses.map((item) => (item.id === editingExpenseId ? entry : item))
          : [entry, ...profile.expenses],
      }
    })
    setExpenseForm({ amount: '', date: today(), category: expenseCategories[0], note: '' })
    setEditingExpenseId(null)
    setQuickExpenseOpen(false)
  }

  function submitRecurring(event: FormEvent) {
    event.preventDefault()
    const amount = parseMoney(recurringForm.amount)
    const dayOfMonth = Number(recurringForm.dayOfMonth)
    if (amount === null || !recurringForm.name.trim()) return
    updateProfile((profile) => ({
      ...profile,
      recurring: editingRecurringId
        ? profile.recurring.map((entry) =>
            entry.id === editingRecurringId
              ? {
                  ...entry,
                  name: recurringForm.name.trim(),
                  amount,
                  category: recurringForm.category,
                  dayOfMonth: Math.min(28, Math.max(1, dayOfMonth || 1)),
                }
              : entry,
          )
        : [
            {
              id: uid('recurring'),
              name: recurringForm.name.trim(),
              amount,
              category: recurringForm.category,
              dayOfMonth: Math.min(28, Math.max(1, dayOfMonth || 1)),
              active: true,
              paidMonths: [],
            },
            ...profile.recurring,
          ],
    }))
    setRecurringForm({ name: '', amount: '', category: expenseCategories[2], dayOfMonth: '1' })
    setEditingRecurringId(null)
  }

  function submitRoommate(event: FormEvent) {
    event.preventDefault()
    if (!roommateForm.name.trim()) return
    updateProfile((profile) => ({
      ...profile,
      roommates: [
        ...profile.roommates,
        {
          id: uid('roommate'),
          name: roommateForm.name.trim(),
          sharePercent: Number(roommateForm.sharePercent) || 0,
        },
      ],
    }))
    setRoommateForm({ name: '', sharePercent: '50' })
  }

  function submitBill(event: FormEvent) {
    event.preventDefault()
    const amount = parseMoney(billForm.amount)
    if (amount === null || !billForm.name.trim() || !billForm.paidBy) return
    updateProfile((profile) => ({
      ...profile,
      bills: [
        {
          id: uid('bill'),
          name: billForm.name.trim(),
          amount,
          paidBy: billForm.paidBy,
          splitMode: billForm.splitMode,
          participants: profile.roommates.map((roommate) => roommate.id),
          settled: false,
        },
        ...profile.bills,
      ],
    }))
    setBillForm({ name: '', amount: '', paidBy: '', splitMode: 'equal' })
  }

  function completeOnboarding(event: FormEvent) {
    event.preventDefault()
    const monthlyIncome = parseOptionalMoney(onboardingForm.monthlyIncome) ?? 0
    const scholarship = parseOptionalMoney(onboardingForm.scholarship) ?? 0
    const studentWork = parseOptionalMoney(onboardingForm.studentWork) ?? 0
    const rent = parseOptionalMoney(onboardingForm.rent) ?? 0
    const transport = parseOptionalMoney(onboardingForm.transport) ?? 0
    const food = parseOptionalMoney(onboardingForm.food) ?? 0
    const currentBalance = parseOptionalMoney(onboardingForm.currentBalance)
    const month = currentMonth()
    const income: IncomeEntry[] = []
    const recurring: RecurringExpense[] = []

    if (studentWork > 0) {
      income.push({
        id: uid('income'),
        amount: studentWork,
        date: `${month}-01`,
        source: 'Študentsko delo',
        note: 'Ocena iz onboardinga',
      })
    }
    if (scholarship > 0) {
      income.push({
        id: uid('income'),
        amount: scholarship,
        date: `${month}-01`,
        source: 'Štipendija',
        note: 'Ocena iz onboardinga',
      })
    }
    const remainingIncome = monthlyIncome - studentWork - scholarship
    if (remainingIncome > 0) {
      income.push({
        id: uid('income'),
        amount: remainingIncome,
        date: `${month}-01`,
        source: 'Drugi prihodki',
        note: 'Mesečna ocena',
      })
    }
    if (rent > 0) {
      recurring.push({
        id: uid('recurring'),
        name: 'Dom / najemnina',
        amount: rent,
        category: 'Dom / najemnina',
        dayOfMonth: 5,
        active: true,
        paidMonths: [],
      })
    }
    if (transport > 0) {
      recurring.push({
        id: uid('recurring'),
        name: 'Subvencioniran prevoz',
        amount: transport,
        category: 'Subvencioniran prevoz',
        dayOfMonth: 1,
        active: true,
        paidMonths: [],
      })
    }
    if (food > 0) {
      recurring.push({
        id: uid('recurring'),
        name: 'Hrana in boni',
        amount: food,
        category: 'Hrana',
        dayOfMonth: 1,
        active: true,
        paidMonths: [],
      })
    }

    updateProfile((profile) => ({
      ...profile,
      name: 'Moj študentski mesec',
      month,
      currentBalance,
      income: [...income, ...profile.income],
      recurring: [...recurring, ...profile.recurring],
      roommates: onboardingForm.hasRoommates
        ? profile.roommates.length
          ? profile.roommates
          : [
              { id: uid('roommate'), name: 'Jaz', sharePercent: 50 },
              { id: uid('roommate'), name: 'Cimer/ka', sharePercent: 50 },
            ]
        : profile.roommates,
    }))
    updateSettings({ onboardingCompleted: true, onboardingSkipped: false })
  }

  function skipOnboarding() {
    updateSettings({ onboardingCompleted: false, onboardingSkipped: true })
  }

  function restartOnboarding() {
    setOnboardingForm({
      monthlyIncome: '',
      rent: '',
      transport: '',
      food: '',
      hasRoommates: false,
      scholarship: '',
      studentWork: '',
      currentBalance: activeProfile.currentBalance ? String(activeProfile.currentBalance) : '',
    })
    updateSettings({ onboardingCompleted: false, onboardingSkipped: false })
    setView('dashboard')
  }

  function repeatLastExpense(entry?: ExpenseEntry) {
    const source = entry ?? activeProfile.expenses[0]
    if (!source) {
      setQuickExpenseOpen(true)
      return
    }
    updateProfile((profile) => ({
      ...profile,
      currentBalance: profile.currentBalance === null ? null : profile.currentBalance - source.amount,
      expenses: [
        {
          ...source,
          id: uid('expense'),
          date: today(),
        },
        ...profile.expenses,
      ],
    }))
  }

  function createProfile(event: FormEvent) {
    event.preventDefault()
    if (!supporter) {
      setView('supporter')
      return
    }
    const profile: BudgetProfile = {
      ...createDefaultProfile(),
      name: profileForm.name.trim() || `Mesec ${profileForm.month}`,
      month: profileForm.month,
    }
    setData((current) => ({
      ...current,
      settings: { ...current.settings, activeProfileId: profile.id },
      profiles: [profile, ...current.profiles],
    }))
    setProfileForm({ name: '', month: currentMonth() })
  }

  function exportJson() {
    const exportedAt = new Date().toISOString()
    const nextData = {
      ...data,
      settings: { ...data.settings, lastBackupAt: exportedAt },
    }
    setData(nextData)
    downloadText(
      `studentski-denar-${activeProfile.month}.json`,
      JSON.stringify(nextData, null, 2),
      'application/json',
    )
  }

  function exportCsv() {
    if (!supporter) {
      setView('supporter')
      return
    }
    const rows = [
      ['tip', 'datum', 'kategorija/vir', 'opis', 'znesek'],
      ...activeProfile.income.map((entry) => [
        'prihodek',
        entry.date,
        entry.source,
        entry.note,
        entry.amount,
      ]),
      ...activeProfile.expenses.map((entry) => [
        'strosek',
        entry.date,
        entry.category,
        entry.note,
        entry.amount,
      ]),
    ]
    downloadText(
      `studentski-denar-${activeProfile.month}.csv`,
      rows.map((row) => row.map(csvEscape).join(',')).join('\n'),
      'text/csv;charset=utf-8',
    )
  }

  async function importJson(file: File | null) {
    if (!file) return
    try {
      const imported = JSON.parse(await file.text()) as AppData
      const normalized = normalizeAppData(imported, { defaultOnboardingCompleted: true })
      if (!normalized) throw new Error('Invalid backup')
      setData(normalized)
    } catch {
      alert('Varnostne kopije ni bilo mogoče uvoziti.')
    }
  }
  async function submitLicense(event: FormEvent) {
    event.preventDefault()
    const result = await verifySignedLicenseKey(licenseInput, publicKeyPem)
    setLicenseMessage(result.message)
    if (result.license) {
      setData((current) => ({ ...current, license: result.license }))
      setLicenseInput('')
    }
  }

  async function markSupporterPending() {
    setRemoteMessage('')
    if (authUser) {
      if (!paymentReference.trim()) {
        setRemoteMessage('Vnesi PayPal transaction ID ali drugo varno referenco.')
        return
      }
      try {
        await submitSupporterRequest(paymentReference)
        await refreshProfile()
        setPaymentReference('')
        setRemoteMessage('Supporter zahteva je shranjena kot pending.')
      } catch (error) {
        setRemoteMessage(error instanceof Error ? error.message : 'Supporter zahteve ni bilo mogoce shraniti.')
      }
      return
    }
    updateSettings({ pendingSupporterAt: new Date().toISOString() })
  }

  async function saveRemoteProfile(values: Pick<ProfileRow, 'display_name' | 'marketing_consent'>) {
    await updateOwnProfile(values)
    await refreshProfile()
  }

  async function logout() {
    await signOutAuthUser()
    setView('login')
  }

  function resetDemoData() {
    if (!confirm('Ali želiš izbrisati lokalne podatke in začeti znova?')) return
    setData(createDefaultData())
    setView('dashboard')
  }

  return (
    <div className={`theme-${data.settings.theme} min-h-screen bg-[var(--app-bg)] text-[var(--ink)]`}>
      <QuickExpenseDrawer
        open={appReady && !authPageOpen && quickExpenseOpen}
        form={expenseForm}
        recentExpenses={activeProfile.expenses}
        setForm={setExpenseForm}
        setOpen={setQuickExpenseOpen}
        onSubmit={submitExpense}
        repeatLastExpense={repeatLastExpense}
      />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col lg:flex-row">
        <aside className="border-b border-[var(--line)] bg-[var(--panel)]/95 p-4 lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-lg bg-[var(--brand)] text-white">
              <Wallet size={22} aria-hidden="true" />
            </div>
            <div>
              <p className="text-lg font-semibold">Študentski Denar</p>
              <p className="text-sm text-[var(--muted)]">Lokalni budget za študente</p>
            </div>
          </div>

          {appReady ? (
            <nav className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = view === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`nav-${item.id}`}
                    onClick={() => setView(item.id)}
                    className={`flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition ${
                      active
                        ? 'bg-[var(--brand)] text-white'
                        : 'bg-transparent text-[var(--muted)] hover:bg-[var(--panel-muted)] hover:text-[var(--ink)]'
                    }`}
                  >
                    <Icon size={18} aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </nav>
          ) : (
            <div className="mt-5 rounded-lg border border-[var(--line)] bg-[var(--panel-muted)] p-3 text-sm text-[var(--muted)]">
              Najprej nastavi okviren mesec ali začni prazno. Navigacija se prikaže takoj po tem.
            </div>
          )}

          <div className="mt-5 rounded-lg border border-[var(--line)] bg-[var(--panel-muted)] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{activeProfile.name}</p>
                <p className="text-sm text-[var(--muted)]">{activeProfile.month}</p>
              </div>
              {supporter ? (
                <CheckCircle2 className="text-[var(--brand)]" size={20} aria-label="Supporter odklenjen" />
              ) : (
                <Lock className="text-[var(--muted)]" size={18} aria-label="Brez supporter dostopa" />
              )}
            </div>
          </div>
        </aside>

        <main className="flex-1 pb-40 p-4 sm:p-6 lg:p-8">
          {(remoteMessage || authError) && (
            <p className="mb-4 rounded-md border border-[var(--line)] bg-[var(--panel-muted)] p-3 text-sm">
              {remoteMessage || authError}
            </p>
          )}
          {view === 'login' && (
            <LoginPage
              navigate={(next) => setView(next as View)}
            />
          )}
          {view === 'register' && <RegisterPage navigate={(next) => setView(next as View)} />}
          {view === 'forgot-password' && <ForgotPasswordPage navigate={(next) => setView(next as View)} />}
          {view === 'reset-password' && <ResetPasswordPage navigate={(next) => setView(next as View)} />}
          {view === 'change-password' && (
            <ChangePasswordPage email={authUser?.email ?? null} navigate={(next) => setView(next as View)} />
          )}
          {view === 'profile' && (
            <ProfilePage
              key={remoteProfile?.id ?? 'local-profile'}
              profile={remoteProfile}
              access={remoteAccess}
              email={authUser?.email ?? null}
              onSave={saveRemoteProfile}
              onLogout={logout}
              navigate={(next) => setView(next as View)}
            />
          )}
          {!authPageOpen && !appReady ? (
            <OnboardingPage
              form={onboardingForm}
              setForm={setOnboardingForm}
              onSubmit={completeOnboarding}
              onSkip={skipOnboarding}
            />
          ) : null}
          {!authPageOpen && appReady && view === 'notfound' && <NotFoundPage setView={setView} />}
          {!authPageOpen && appReady && view === 'dashboard' && (
            <Dashboard
              profile={activeProfile}
              totals={totals}
              survival={survival}
              recommendations={recommendations}
              categoryData={categoryData}
              budgetProgress={budgetProgress}
              setView={setView}
              repeatLastExpense={repeatLastExpense}
            />
          )}
          {!authPageOpen && appReady && view === 'income' && (
            <IncomePage
              profile={activeProfile}
              form={incomeForm}
              setForm={setIncomeForm}
              editingId={editingIncomeId}
              onSubmit={submitIncome}
              onEdit={(entry) => {
                setIncomeForm({
                  amount: String(entry.amount),
                  date: entry.date,
                  source: entry.source,
                  note: entry.note,
                })
                setEditingIncomeId(entry.id)
              }}
              onDelete={(id) =>
                updateProfile((profile) => ({
                  ...profile,
                  currentBalance:
                    profile.currentBalance === null
                      ? null
                      : profile.currentBalance -
                        (profile.income.find((entry) => entry.id === id)?.amount ?? 0),
                  income: profile.income.filter((entry) => entry.id !== id),
                }))
              }
            />
          )}
          {!authPageOpen && appReady && view === 'expenses' && (
            <ExpensesPage
              profile={activeProfile}
              form={expenseForm}
              setForm={setExpenseForm}
              editingId={editingExpenseId}
              onSubmit={submitExpense}
              quickOpen={quickExpenseOpen}
              setQuickOpen={setQuickExpenseOpen}
              repeatLastExpense={repeatLastExpense}
              onEdit={(entry) => {
                setExpenseForm({
                  amount: String(entry.amount),
                  date: entry.date,
                  category: entry.category,
                  note: entry.note,
                })
                setEditingExpenseId(entry.id)
              }}
              onDelete={(id) =>
                updateProfile((profile) => ({
                  ...profile,
                  currentBalance:
                    profile.currentBalance === null
                      ? null
                      : profile.currentBalance +
                        (profile.expenses.find((entry) => entry.id === id)?.amount ?? 0),
                  expenses: profile.expenses.filter((entry) => entry.id !== id),
                }))
              }
            />
          )}
          {!authPageOpen && appReady && view === 'rent' && (
            <RentPage
              profile={activeProfile}
              form={recurringForm}
              setForm={setRecurringForm}
              onSubmit={submitRecurring}
              onToggle={(id) =>
                updateProfile((profile) => ({
                  ...profile,
                  recurring: profile.recurring.map((entry) =>
                    entry.id === id ? { ...entry, active: !entry.active } : entry,
                  ),
                }))
              }
              onPaidToggle={(id) =>
                updateProfile((profile) => ({
                  ...profile,
                  recurring: profile.recurring.map((entry) =>
                    entry.id === id
                      ? {
                          ...entry,
                          paidMonths: entry.paidMonths.includes(profile.month)
                            ? entry.paidMonths.filter((month) => month !== profile.month)
                            : [...entry.paidMonths, profile.month],
                        }
                      : entry,
                  ),
                }))
              }
              onEdit={(entry) => {
                setRecurringForm({
                  name: entry.name,
                  amount: String(entry.amount),
                  category: entry.category,
                  dayOfMonth: String(entry.dayOfMonth),
                })
                setEditingRecurringId(entry.id)
              }}
              editingId={editingRecurringId}
              onDelete={(id) =>
                updateProfile((profile) => ({
                  ...profile,
                  recurring: profile.recurring.filter((entry) => entry.id !== id),
                }))
              }
            />
          )}
          {!authPageOpen && appReady && view === 'roommates' && (
            <RoommatePage
              profile={activeProfile}
              roommateForm={roommateForm}
              setRoommateForm={setRoommateForm}
              billForm={billForm}
              setBillForm={setBillForm}
              customShareTotal={customShareTotal}
              settlements={settlements}
              onRoommateSubmit={submitRoommate}
              onBillSubmit={submitBill}
              onDeleteRoommate={(id) =>
                updateProfile((profile) => ({
                  ...profile,
                  roommates: profile.roommates.filter((roommate) => roommate.id !== id),
                  bills: profile.bills.map((bill) => ({
                    ...bill,
                    participants: bill.participants.filter((participant) => participant !== id),
                  })),
                }))
              }
              onSettleBill={(id) =>
                updateProfile((profile) => ({
                  ...profile,
                  bills: profile.bills.map((bill) =>
                    bill.id === id ? { ...bill, settled: !bill.settled } : bill,
                  ),
                }))
              }
              onDeleteBill={(id) =>
                updateProfile((profile) => ({
                  ...profile,
                  bills: profile.bills.filter((bill) => bill.id !== id),
                }))
              }
            />
          )}
          {!authPageOpen && appReady && view === 'insights' && (
            <InsightsPage
              profile={activeProfile}
              supporter={supporter}
              categoryData={categoryData}
              incomeExpenseData={incomeExpenseData}
              totals={totals}
              recommendations={recommendations}
              setView={setView}
              setBudgetLimit={setBudgetLimit}
              applyBudgetPreset={applyBudgetPreset}
              openSupporter={() => setView('supporter')}
            />
          )}
          {!authPageOpen && appReady && view === 'supporter' && (
            <SupporterPage
              supporter={supporter}
              license={data.license}
              access={remoteAccess}
              authEmail={authUser?.email ?? null}
              licenseInput={licenseInput}
              setLicenseInput={setLicenseInput}
              message={licenseMessage}
              remoteMessage={remoteMessage}
              onSubmit={submitLicense}
              onRemove={() => setData((current) => ({ ...current, license: null }))}
              pendingAt={data.settings.pendingSupporterAt}
              now={renderedAt}
              paymentReference={paymentReference}
              setPaymentReference={setPaymentReference}
              markPending={markSupporterPending}
            />
          )}
          {!authPageOpen && appReady && view === 'privacy' && <PrivacyPage />}
          {!authPageOpen && appReady && view === 'settings' && (
            <SettingsPage
              data={data}
              supporter={supporter}
              activeProfile={activeProfile}
              profileForm={profileForm}
              setProfileForm={setProfileForm}
              createProfile={createProfile}
              setActiveProfile={(id) => updateSettings({ activeProfileId: id })}
              setTheme={(theme) => updateSettings({ theme })}
              exportJson={exportJson}
              exportCsv={exportCsv}
              importJson={importJson}
              resetData={resetDemoData}
              restartOnboarding={restartOnboarding}
              setBackupReminderDays={(backupReminderDays) => updateSettings({ backupReminderDays })}
              now={renderedAt}
              openSupporter={() => setView('supporter')}
              cloudSync={cloudSync}
            />
          )}
        </main>
      </div>
      {appReady && !authPageOpen ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--line)] bg-[var(--panel)]/95 p-3 shadow-lg">
          <div className="mx-auto flex max-w-lg gap-2">
            <button
              type="button"
              data-testid="quick-expense-open"
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white"
              onClick={() => setQuickExpenseOpen(true)}
            >
              <Plus size={16} /> Hiter strošek
            </button>
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[var(--panel-muted)] px-4 py-2 text-sm font-semibold text-[var(--ink)]"
              onClick={() => repeatLastExpense()}
            >
              <Repeat2 size={16} /> Ponovi
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
