// Cliente mínimo de la Gmail API, llamado directo desde el navegador/app con
// el access token que guardamos en el login (ver getGmailAccessToken en
// firebase.js). No usa ninguna librería de Google, solo fetch — así nos
// evitamos meter un backend/Cloud Function solo para esto.
//
// Alcance: SOLO lectura (scope gmail.readonly). Nada de lo que hay acá
// modifica, borra ni envía correos.

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'
const LABEL_NAME = 'Facturas'

class GmailAuthError extends Error {
  constructor(message) {
    super(message)
    this.name = 'GmailAuthError'
  }
}

async function gmailFetch(accessToken, path) {
  const res = await fetch(`${GMAIL_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (res.status === 401) {
    throw new GmailAuthError('El token de Gmail venció. Hay que volver a iniciar sesión.')
  }
  if (res.status === 403) {
    throw new GmailAuthError(
      'Kyuby no tiene permiso para leer tu Gmail todavía. Vuelve a iniciar sesión y acepta el permiso de lectura de correo.'
    )
  }
  if (!res.ok) {
    throw new Error(`Gmail API respondió ${res.status}: ${await res.text()}`)
  }
  return res.json()
}

// Decodifica el body de Gmail (base64url, sin padding) a texto plano UTF-8.
function decodeBase64Url(data) {
  if (!data) return ''
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/')
  try {
    const binary = atob(base64)
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    return new TextDecoder('utf-8').decode(bytes)
  } catch (e) {
    console.warn('No se pudo decodificar un body de Gmail:', e)
    return ''
  }
}

// Recorre recursivamente las partes MIME buscando el text/plain. Si no hay,
// cae a text/html (sin limpiar tags — mejor que nada para el parser).
function findBodyPart(payload, mimeType) {
  if (!payload) return null
  if (payload.mimeType === mimeType && payload.body?.data) return payload.body.data
  for (const part of payload.parts || []) {
    const found = findBodyPart(part, mimeType)
    if (found) return found
  }
  return null
}

// Junta los adjuntos con nombre de archivo (ignora las partes "inline" del
// cuerpo del correo, que no tienen filename).
function collectAttachments(payload, out = []) {
  if (!payload) return out
  if (payload.filename && payload.body?.attachmentId) {
    out.push({
      filename: payload.filename,
      mimeType: payload.mimeType,
      id: payload.body.attachmentId,
    })
  }
  for (const part of payload.parts || []) collectAttachments(part, out)
  return out
}

function headerValue(headers, name) {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || ''
}

// Busca el ID del label "Facturas". Devuelve null si el usuario todavía no
// lo ha creado (ver instrucciones que le dimos para armarlo a mano).
async function findFacturasLabelId(accessToken) {
  const data = await gmailFetch(accessToken, '/labels')
  const label = (data.labels || []).find((l) => l.name === LABEL_NAME)
  return label?.id || null
}

// Lista los mensajes con el label "Facturas" (los más recientes primero).
async function listFacturaMessageIds(accessToken, labelId, maxResults = 30) {
  const data = await gmailFetch(
    accessToken,
    `/messages?labelIds=${labelId}&maxResults=${maxResults}`
  )
  return (data.messages || []).map((m) => m.id)
}

// Trae un mensaje completo y lo deja en el mismo formato que usan los
// parsers de billParsers.js: { id, sender, plaintextBody, attachments }.
async function getMessage(accessToken, messageId) {
  const data = await gmailFetch(accessToken, `/messages/${messageId}?format=full`)
  const payload = data.payload
  const sender = headerValue(payload?.headers, 'From')
  const plainData = findBodyPart(payload, 'text/plain') || findBodyPart(payload, 'text/html')
  return {
    id: data.id,
    threadId: data.threadId,
    sender,
    subject: headerValue(payload?.headers, 'Subject'),
    date: headerValue(payload?.headers, 'Date'),
    plaintextBody: decodeBase64Url(plainData),
    attachments: collectAttachments(payload),
  }
}

// Trae los mensajes etiquetados "Facturas" ya listos para pasar por
// detectBillFromMessage() (ver billParsers.js). No filtra nada por sí solo
// — el llamador decide qué hacer con los que ya se procesaron antes.
export async function fetchFacturaMessages(accessToken, maxResults = 30) {
  const labelId = await findFacturasLabelId(accessToken)
  if (!labelId) {
    throw new Error(
      `No encontré el label "${LABEL_NAME}" en tu Gmail. Revisa que lo hayas creado.`
    )
  }
  const ids = await listFacturaMessageIds(accessToken, labelId, maxResults)
  const messages = []
  for (const id of ids) {
    // Secuencial a propósito: son pocos correos y así no golpeamos el rate
    // limit de la Gmail API con ráfagas de requests en paralelo.
    messages.push(await getMessage(accessToken, id))
  }
  return messages
}

export { GmailAuthError }
