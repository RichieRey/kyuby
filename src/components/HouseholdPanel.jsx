import { useState } from 'react'
import Modal from './Modal'
import { createInvite, INVITE_HOURS } from '../lib/household'

export default function HouseholdPanel({ household, user, onClose }) {
  const [invite, setInvite] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const members = Object.entries(household.members || {})

  async function handleInvite() {
    setBusy(true)
    setError('')
    setCopied(false)
    try {
      setInvite(await createInvite(household.id, user.uid))
    } catch (e) {
      console.error('Error creando la invitación:', e)
      setError('No se pudo generar el código. Intenta de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  async function handleCopy() {
    const text =
      `Te invito a mi hogar "${household.name}" en Kyuby. ` +
      `Entra con tu cuenta de Google, elige "Tengo un código" y escribe: ${invite.code}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Modal title={household.name} onClose={onClose}>
      <div className="household-panel">
        <h3 className="household-subtitle">Miembros</h3>
        <ul className="household-members">
          {members.map(([uid, email]) => (
            <li key={uid}>
              {email || 'Sin correo'}
              {uid === household.ownerId && <span className="muted"> · creador</span>}
              {uid === user.uid && <span className="muted"> · tú</span>}
            </li>
          ))}
        </ul>

        <h3 className="household-subtitle">Invitar a alguien</h3>
        <p className="muted">
          Genera un código y compártelo. Sirve una sola vez y vence en {INVITE_HOURS} horas.
        </p>

        {invite ? (
          <div className="invite-box">
            <span className="invite-code">{invite.code}</span>
            <span className="muted">
              Vence el{' '}
              {invite.expiresAt.toLocaleString('es-CO', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
            <div className="invite-actions">
              <button className="btn-small btn-ghost" onClick={handleCopy}>
                {copied ? 'Copiado' : 'Copiar mensaje'}
              </button>
              <button className="btn-small btn-ghost" onClick={handleInvite} disabled={busy}>
                Otro código
              </button>
            </div>
          </div>
        ) : (
          <button className="btn-primary" onClick={handleInvite} disabled={busy}>
            {busy ? 'Generando…' : 'Generar código'}
          </button>
        )}

        {error && <p className="error-text">{error}</p>}
      </div>
    </Modal>
  )
}
