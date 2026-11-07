import { useState } from 'react'
import { logout } from '../firebase'
import { createHousehold } from '../lib/household'

// Pantalla para quien inicia sesión y todavía no pertenece a ningún hogar.
export default function HouseholdSetup({ user }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await createHousehold(user, name)
      // watchMyHousehold en App detecta el hogar nuevo y cambia de pantalla.
    } catch (err) {
      console.error('Error creando el hogar:', err)
      setError('No se pudo crear el hogar. Intenta de nuevo.')
      setBusy(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card setup-card">
        <div className="login-icon">
          <img src={`${import.meta.env.BASE_URL}icons/fox-mark.png`} alt="Kyuby" />
        </div>
        <h1>Tu hogar</h1>
        <p>Kyuby guarda los servicios y pagos por hogar. Crea el tuyo para empezar.</p>

        <form onSubmit={handleCreate} className="item-form">
          <label>
            Nombre del hogar
            <input
              type="text"
              placeholder="Ej: Casa Arjona"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
            />
          </label>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Creando…' : 'Crear hogar'}
          </button>
        </form>

        {error && <p className="error-text">{error}</p>}

        <button className="btn-small btn-ghost setup-logout" onClick={logout}>
          Salir ({user.email})
        </button>
      </div>
    </div>
  )
}
