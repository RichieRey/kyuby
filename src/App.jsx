import { useEffect, useMemo, useState } from 'react'
import {
  db,
  watchAuth,
  logout,
  collection,
  onSnapshot,
  doc,
  setDoc,
  addDoc,
  serverTimestamp,
} from './firebase'
import Login from './components/Login'
import AlertBanner from './components/AlertBanner'
import MonthSummary from './components/MonthSummary'
import ItemList from './components/ItemList'
import ItemFormModal from './components/ItemFormModal'
import PayModal from './components/PayModal'
import {
  paymentId,
  statusFor,
  monthLabel,
  addMonths,
} from './lib/billing'

const AUTHORIZED_HINT =
  'Tu cuenta de Google no está autorizada en Kyuby. Pídele al dueño que agregue tu correo en las reglas de Firestore.'

export default function App() {
  const [user, setUser] = useState(undefined) // undefined = cargando, null = sin sesión
  const [authError, setAuthError] = useState('')
  const [items, setItems] = useState([])
  const [payments, setPayments] = useState({}) // keyed by paymentId
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [editingItem, setEditingItem] = useState(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [payingItem, setPayingItem] = useState(null)

  useEffect(() => watchAuth(setUser), [])

  useEffect(() => {
    if (!user) return
    const unsubItems = onSnapshot(
      collection(db, 'items'),
      (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => {
        console.error('Firestore items error:', err)
        setAuthError(AUTHORIZED_HINT)
      }
    )
    const unsubPayments = onSnapshot(
      collection(db, 'payments'),
      (snap) => {
        const map = {}
        snap.docs.forEach((d) => (map[d.id] = { id: d.id, ...d.data() }))
        setPayments(map)
      },
      (err) => console.error('Firestore payments error:', err)
    )
    return () => {
      unsubItems()
      unsubPayments()
    }
  }, [user])

  useEffect(() => {
    if (user && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [user])

  const activeItems = useMemo(() => items.filter((i) => i.active !== false), [items])

  const rows = useMemo(() => {
    return activeItems.map((item) => {
      const pid = paymentId(item.id, cursor.year, cursor.month)
      const payment = payments[pid] || null
      const status = statusFor(item, payment, cursor.year, cursor.month)
      return { item, payment, status }
    })
  }, [activeItems, payments, cursor])

  const alerts = useMemo(
    () => rows.filter((r) => r.status === 'vencido' || r.status === 'proximo'),
    [rows]
  )

  // Notificación local (solo si la app está abierta) para pagos próximos/vencidos.
  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    if (!alerts.length) return
    const key = `kyuby_notified_${cursor.year}_${cursor.month}`
    const already = sessionStorage.getItem(key)
    if (already) return
    sessionStorage.setItem(key, '1')
    const vencidos = alerts.filter((a) => a.status === 'vencido').length
    const proximos = alerts.filter((a) => a.status === 'proximo').length
    const parts = []
    if (vencidos) parts.push(`${vencidos} vencido(s)`)
    if (proximos) parts.push(`${proximos} por vencer`)
    new Notification('Kyuby', { body: parts.join(' · '), icon: `${import.meta.env.BASE_URL}icons/icon-192.png` })
  }, [alerts, cursor])

  async function saveItem(data) {
    if (editingItem) {
      await setDoc(doc(db, 'items', editingItem.id), data, { merge: true })
    } else {
      await addDoc(collection(db, 'items'), { ...data, createdAt: serverTimestamp() })
    }
    setEditingItem(null)
    setShowNewForm(false)
  }

  async function deleteItem(id) {
    if (!confirm('¿Eliminar este servicio/suscripción? Se conservará el historial de pagos.')) return
    await setDoc(doc(db, 'items', id), { active: false }, { merge: true })
    setEditingItem(null)
  }

  async function confirmPay({ paidAmount, paidDate }) {
    const item = payingItem
    const pid = paymentId(item.id, cursor.year, cursor.month)
    await setDoc(doc(db, 'payments', pid), {
      itemId: item.id,
      year: cursor.year,
      month: cursor.month,
      paid: true,
      paidAmount,
      paidDate,
    })
    setPayingItem(null)
  }

  async function unpay(item, payment) {
    if (!payment) return
    await setDoc(doc(db, 'payments', payment.id), { paid: false }, { merge: true })
  }

  if (user === undefined) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    )
  }

  if (!user) {
    return <Login error={authError} />
  }

  if (authError) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-icon">🚫</div>
          <h1>Sin acceso</h1>
          <p className="muted">{authError}</p>
          <button className="btn-primary" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-icon">
            <img src={`${import.meta.env.BASE_URL}icons/fox-mark.png`} alt="" />
          </span>
          <span className="brand-name">Kyuby</span>
        </div>
        <div className="header-right">
          <span className="user-email">{user.email}</span>
          <button className="btn-small btn-ghost" onClick={logout}>
            Salir
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="hero-card">
          <div className="month-nav">
            <button className="btn-small btn-ghost" onClick={() => setCursor((c) => addMonths(c.year, c.month, -1))}>
              ←
            </button>
            <h2>{monthLabel(cursor.year, cursor.month)}</h2>
            <button className="btn-small btn-ghost" onClick={() => setCursor((c) => addMonths(c.year, c.month, 1))}>
              →
            </button>
          </div>
          <MonthSummary rows={rows} />
        </div>

        <AlertBanner alerts={alerts} />

        <div className="section-header">
          <h3>Servicios y suscripciones</h3>
          <button className="btn-primary btn-small" onClick={() => setShowNewForm(true)}>
            + Agregar
          </button>
        </div>

        <ItemList
          rows={rows}
          year={cursor.year}
          month={cursor.month}
          onEdit={setEditingItem}
          onPay={setPayingItem}
          onUnpay={unpay}
        />
      </main>

      {(showNewForm || editingItem) && (
        <ItemFormModal
          initial={editingItem}
          onSave={saveItem}
          onDelete={deleteItem}
          onClose={() => {
            setShowNewForm(false)
            setEditingItem(null)
          }}
        />
      )}

      {payingItem && (
        <PayModal item={payingItem} onConfirm={confirmPay} onClose={() => setPayingItem(null)} />
      )}
    </div>
  )
}
