# Kyuby — Home Bills & Subs

Control de servicios públicos y suscripciones del hogar (antes "FacturApp"), con alertas antes del
vencimiento y lectura de facturas desde Gmail.

PWA hecha con React + Vite, con Firebase (Auth + Firestore) como backend, publicada en GitHub Pages
con GitHub Actions. También se compila como app Android con Capacitor.

## Datos y acceso

- Los datos viven por hogar: `households/{id}` con `memberIds`, y adentro `items`, `payments` y
  `gmailImports`.
- Solo los miembros de un hogar leen y escriben sus datos (ver `firestore.rules`).
- Para sumar a alguien: Hogar → Generar código. La otra persona inicia sesión, escoge "Tengo un
  código" y lo escribe. El código sirve una vez y vence en 48 horas.

## Configuración

1. Config web de Firebase: en GitHub → Settings → Secrets and variables → Actions, crea estos
   secrets con los valores de Firebase Console → Configuración del proyecto → Tus apps → Config:
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
   `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
   No son secretos de verdad; la seguridad está en las reglas y en los dominios autorizados.
2. Publica `firestore.rules` en Firebase Console → Firestore Database → Reglas.
3. En Firebase Console → Authentication → Configuración → Dominios autorizados debe estar
   `richierey.github.io`.
4. En GitHub → Settings → Pages, el source es **GitHub Actions**. Cada push a `main` compila y
   publica.

## Desarrollo local

```bash
cp .env.example .env.local   # y llena los valores
npm install
npm run dev
```
