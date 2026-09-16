import { useState } from 'react'
import { loginWithGoogle } from '../firebase'

export default function Login({ error }) {
  const [loginError, setLoginError] = useState('')

  async function handleLogin() {
    setLoginError('')
    try {
      await loginWithGoogle()
    } catch (e) {
      // El usuario cerró el selector de cuentas de Google: no es un error real.
      if (e?.code === 'ERROR_ABORTED_BY_USER' || e?.message?.includes('cancel')) return
      console.error('Error de inicio de sesión:', e)
      setLoginError('No se pudo iniciar sesión. Intenta de nuevo.')
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-icon">
          <img src={`${import.meta.env.BASE_URL}icons/fox-mark.png`} alt="Kyuby" />
        </div>
        <h1>Kyuby</h1>
        <p className="muted">Home Bills &amp; Subs</p>
        <button className="btn-primary" onClick={handleLogin}>
          Iniciar sesión con Google
        </button>
        {(error || loginError) && <p className="error-text">{error || loginError}</p>}
      </div>
    </div>
  )
}
