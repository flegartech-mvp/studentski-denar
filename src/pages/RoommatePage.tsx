import { Plus, Trash2 } from 'lucide-react'
import type { FormEvent } from 'react'
import { EmptyState } from '../components/EmptyState'
import { Button, Field, inputClass } from '../components/FormControls'
import { PageHeader } from '../components/PageHeader'
import { SectionCard as Panel } from '../components/SectionCard'
import { formatMoney } from '../lib/money'
import type { BudgetProfile, Settlement, SplitMode } from '../types'

export function RoommatePage({
  profile,
  roommateForm,
  setRoommateForm,
  billForm,
  setBillForm,
  customShareTotal,
  settlements,
  onRoommateSubmit,
  onBillSubmit,
  onDeleteRoommate,
  onSettleBill,
  onDeleteBill,
}: {
  profile: BudgetProfile
  roommateForm: { name: string; sharePercent: string }
  setRoommateForm: (value: { name: string; sharePercent: string }) => void
  billForm: { name: string; amount: string; paidBy: string; splitMode: SplitMode }
  setBillForm: (value: { name: string; amount: string; paidBy: string; splitMode: SplitMode }) => void
  customShareTotal: number
  settlements: Settlement[]
  onRoommateSubmit: (event: FormEvent) => void
  onBillSubmit: (event: FormEvent) => void
  onDeleteRoommate: (id: string) => void
  onSettleBill: (id: string) => void
  onDeleteBill: (id: string) => void
}) {
  return (
    <div data-testid="roommates-page">
      <PageHeader title="Cimri in delitev" eyebrow="Kdo je plačal in kdo komu dolguje" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <h2 className="text-xl font-semibold">Cimri</h2>
          <form className="mt-3 grid gap-3 sm:grid-cols-[1fr_140px_auto]" onSubmit={onRoommateSubmit}>
            <Field label="Ime">
              <input className={inputClass} value={roommateForm.name} onChange={(e) => setRoommateForm({ ...roommateForm, name: e.target.value })} />
            </Field>
            <Field label="Delež %">
              <input className={inputClass} type="number" min="0" max="100" value={roommateForm.sharePercent} onChange={(e) => setRoommateForm({ ...roommateForm, sharePercent: e.target.value })} />
            </Field>
            <div className="flex items-end">
              <Button type="submit" className="w-full">
                <Plus size={16} /> Dodaj
              </Button>
            </div>
          </form>
          {customShareTotal !== 100 && profile.roommates.length > 0 && (
            <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              Skupni custom deleži so {customShareTotal} %. Za natančno custom delitev jih nastavi na 100 %.
            </p>
          )}
          <div className="mt-4 grid gap-2">
            {profile.roommates.length ? (
              profile.roommates.map((roommate) => (
                <div key={roommate.id} className="flex items-center justify-between rounded-md border border-[var(--line)] bg-white p-3">
                  <div>
                    <p className="font-semibold">{roommate.name}</p>
                    <p className="text-sm text-[var(--muted)]">Custom delež: {roommate.sharePercent} %</p>
                  </div>
                  <Button type="button" variant="danger" onClick={() => onDeleteRoommate(roommate.id)} aria-label="Izbriši cimra">
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))
            ) : (
              <EmptyState title="Dodaj cimre" text="Potem lahko deliš položnice in skupne nakupe." />
            )}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-xl font-semibold">Skupni račun</h2>
          <form className="mt-3 grid gap-3" onSubmit={onBillSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Opis">
                <input className={inputClass} value={billForm.name} onChange={(e) => setBillForm({ ...billForm, name: e.target.value })} placeholder="npr. elektrika" />
              </Field>
              <Field label="Znesek">
                <input className={inputClass} type="text" inputMode="decimal" value={billForm.amount} onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })} />
              </Field>
              <Field label="Plačal/a">
                <select className={inputClass} value={billForm.paidBy} onChange={(e) => setBillForm({ ...billForm, paidBy: e.target.value })}>
                  <option value="">Izberi</option>
                  {profile.roommates.map((roommate) => <option key={roommate.id} value={roommate.id}>{roommate.name}</option>)}
                </select>
              </Field>
              <Field label="Delitev">
                <select className={inputClass} value={billForm.splitMode} onChange={(e) => setBillForm({ ...billForm, splitMode: e.target.value as SplitMode })}>
                  <option value="equal">Enako</option>
                  <option value="custom">Po deležih</option>
                </select>
              </Field>
            </div>
            <Button type="submit" disabled={profile.roommates.length < 2}>
              <Plus size={16} /> Dodaj račun
            </Button>
          </form>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel>
          <h2 className="text-xl font-semibold">Odprti računi</h2>
          <div className="mt-3 grid gap-2">
            {profile.bills.length ? (
              profile.bills.map((bill) => (
                <div key={bill.id} className="rounded-md border border-[var(--line)] bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{bill.name}</p>
                      <p className="text-sm text-[var(--muted)]">
                        {formatMoney(bill.amount)} · {bill.splitMode === 'equal' ? 'enaka delitev' : 'custom delitev'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="secondary" onClick={() => onSettleBill(bill.id)}>
                        {bill.settled ? 'Plačano' : 'Odprto'}
                      </Button>
                      <Button type="button" variant="danger" onClick={() => onDeleteBill(bill.id)} aria-label="Izbriši račun">
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="Ni skupnih računov" text="Dodaj račun, ko nekdo plača za stanovanje ali skupino." />
            )}
          </div>
        </Panel>
        <Panel>
          <h2 className="text-xl font-semibold">Kdo komu nakaže</h2>
          <div className="mt-3 grid gap-2">
            {settlements.length ? (
              settlements.map((settlement) => (
                <div key={`${settlement.from}-${settlement.to}-${settlement.amount}`} className="rounded-md border border-[var(--line)] bg-white p-3">
                  <p className="font-semibold">
                    {settlement.from} → {settlement.to}
                  </p>
                  <p className="text-sm text-[var(--muted)]">{formatMoney(settlement.amount)}</p>
                </div>
              ))
            ) : (
              <EmptyState title="Vse je poravnano" text="Ko bodo odprti računi, se bodo predlogi prikazali tukaj." />
            )}
          </div>
        </Panel>
      </div>
    </div>
  )
}
