import { loginWithGoogle } from '../firebase'

export default function Login({ error }) {
  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-icon">🧾</div>
        <h1>Kyuby</h1>
        <p className="muted">Control de facturas y suscripciones del hogar</p>
        <button className="btn-primary" onClick={loginWithGoogle}>
          Iniciar sesión con Google
        </button>
        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  )
}
