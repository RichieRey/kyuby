import { useState } from 'react'
import { migrateLegacyData } from '../lib/migration'

// Aparece solo si el dueño del hogar no terminó la copia de los datos
// anteriores (por ejemplo, se cortó la conexión al crear el hogar).
export default function MigrationBanner({ householdId, uid }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleRetry() {
    setBusy(true)
    setError('')
    try {
      await migrateLegacyData(householdId, uid)
    } catch (e) {
      console.error('Error copiando los datos anteriores:', e)
      setError('No se pudo completar. Intenta de nuevo.')
      setBusy(false)
    }
  }

  return (
    <div className="migration-banner">
      <span>Falta copiar a tu hogar los datos que tenías antes en Kyuby.</span>
      <button className="btn-small btn-primary" onClick={handleRetry} disabled={busy}>
        {busy ? 'Copiando…' : 'Copiar ahora'}
      </button>
      {error && <span className="error-text">{error}</span>}
    </div>
  )
}
