// Cliente mínimo de la Gmail API, llamado directo desde el navegador o la app
// con el access token del login (ver getGmailAccessToken en firebase.js).
// Solo usa fetch, sin librerías de Google ni backend.
//
// Alcance: SOLO lectura (scope gmail.readonly). Nada de lo que hay aquí
// modifica, borra ni envía correos.

import { htmlToText } from './billText'
import { extractPdfText } from './pdfText'

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'

export class GmailAuthError extends Error {
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
    throw new GmailAuthError('El permiso de Gmail venció. Toca "Revisar Gmail" para renovarlo.')
  }
  if (res.status === 403) {
    throw new GmailAuthError(
      'Kyuby no tiene permiso para leer tu Gmail. Toca "Revisar Gmail" y acepta el permiso de lectura.'
    )
  }
  if (!res.ok) {
    throw new Error(`Gmail API respondió ${res.status}: ${await res.text()}`)
  }
  return res.json()
}

// base64url (sin padding) a bytes.
function base64UrlToBytes(data) {
  const base64 = (data || '').replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

function decodeText(data) {
  if (!data) return ''
  try {
    return new TextDecoder('utf-8').decode(base64UrlToBytes(data))
  } catch (e) {
    console.warn('No se pudo decodificar un cuerpo de Gmail:', e)
    return ''
  }
}

function findBodyPart(payload, mimeType) {
  if (!payload) return null
  if (payload.mimeType === mimeType && payload.body?.data) return payload.body.data
  for (const part of payload.parts || []) {
    const found = findBodyPart(part, mimeType)
    if (found) return found
  }
  return null
}

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

// IDs de los mensajes que cumplen la consulta (los más recientes primero).
export async function searchMessageIds(accessToken, query, maxResults = 25) {
  const q = encodeURIComponent(query)
  const data = await gmailFetch(accessToken, `/messages?q=${q}&maxResults=${maxResults}`)
  return (data.messages || []).map((m) => m.id)
}

// Trae un mensaje y lo deja listo para los lectores de billParsers.js.
// El PDF adjunto solo se descarga si un lector lo pide (getPdfText).
export async function getMessage(accessToken, messageId) {
  const data = await gmailFetch(accessToken, `/messages/${messageId}?format=full`)
  const payload = data.payload
  const plain = findBodyPart(payload, 'text/plain')
  const text = plain
    ? decodeText(plain)
    : htmlToText(decodeText(findBodyPart(payload, 'text/html')))
  const attachments = collectAttachments(payload)
  const pdf = attachments.find(
    (a) => a.mimeType === 'application/pdf' || a.filename?.toLowerCase().endsWith('.pdf')
  )
  let pdfTextPromise = null
  return {
    id: data.id,
    sender: headerValue(payload?.headers, 'From'),
    subject: headerValue(payload?.headers, 'Subject'),
    date: new Date(Number(data.internalDate) || Date.now()),
    text,
    hasPdf: Boolean(pdf),
    getPdfText() {
      if (!pdf) return Promise.resolve(null)
      if (!pdfTextPromise) {
        pdfTextPromise = gmailFetch(accessToken, `/messages/${messageId}/attachments/${pdf.id}`)
          .then((att) => extractPdfText(base64UrlToBytes(att.data)))
          .catch((e) => {
            console.warn('No se pudo leer el PDF adjunto:', e)
            return null
          })
      }
      return pdfTextPromise
    },
  }
}
