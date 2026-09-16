# Kyuby

Control de facturas y suscripciones del hogar (antes "FacturApp") — servicios públicos y
suscripciones digitales en un solo lugar, con alertas antes del vencimiento.

Construida como PWA (React + Vite), con Firebase (Auth + Firestore) como
backend, desplegada gratis en GitHub Pages vía GitHub Actions.

## Antes de desplegar

1. Reemplaza el `firebaseConfig` en `src/firebase.js` con la config real de
   tu proyecto Firebase (Configuración del proyecto → Tus apps → Config).
2. Ajusta los correos autorizados en `firestore.rules` si el de tu pareja
   es distinto a `jeragui10@gmail.com`, y publícalas en Firebase Console
   (Firestore Database → Reglas).
3. En Firebase Console → Authentication → Configuración → Dominios
   autorizados, agrega `richierey.github.io`.
4. En GitHub → Settings → Pages, en "Build and deployment" selecciona
   **GitHub Actions** como source (el workflow en
   `.github/workflows/deploy.yml` ya se encarga del resto: cada push a
   `main` compila y publica automáticamente).

## Desarrollo local (opcional)

```bash
npm install
npm run dev
```

## Notas de alcance (MVP)

- El registro de servicios/suscripciones y sus montos es manual — no hay
  lectura automática de facturas ni integración con pasarelas de pago.
- Las alertas de "próximo a vencer" / "vencido" se muestran dentro de la
  app y, si el navegador lo permite, como notificación local — solo
  mientras la app está abierta. Notificaciones push con la app cerrada
  requieren Firebase Cloud Messaging + Cloud Functions (plan Blaze), fuera
  del alcance de esta primera versión.
