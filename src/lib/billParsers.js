// Parsers de correos de facturas por proveedor.
//
// Cada parser recibe un mensaje de Gmail ya leído (sender + plaintextBody,
// tal como los devuelve la Gmail API — ver getGmailAccessToken() en
// firebase.js) y, si reconoce el formato, devuelve un objeto con los datos
// detectados. Si no lo reconoce, devuelve null: nunca lanza excepción para
// no tumbar el escaneo de todo el buzón por un solo correo raro.
//
// Nada de esto guarda nada en Firestore por sí solo — eso lo hace la
// pantalla de "facturas detectadas" después de que el usuario confirme.

const MESES_ES = {
  ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
  jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
}

// Convierte montos en formato colombiano ("113.149", "$ 113.149", "1.234.567")
// a número entero de pesos. El punto es separador de miles, no decimal.
function parseCOPAmount(raw) {
  if (!raw) return null
  const digits = raw.replace(/[^\d]/g, '')
  if (!digits) return null
  return parseInt(digits, 10)
}

// "Sep 21/26" -> Date(2026, 8, 21). Asume año en formato corto (20YY).
function parseShortDate(mesAbrev, dia, anioCorto) {
  const mesIdx = MESES_ES[mesAbrev.toLowerCase().slice(0, 3)]
  if (mesIdx === undefined) return null
  const anio = 2000 + parseInt(anioCorto, 10)
  return new Date(anio, mesIdx, parseInt(dia, 10))
}

// --- Claro (facturasclarocol@claro.com.co) -------------------------------
//
// Formato confirmado (revisado sep-2026): el cuerpo en texto plano trae el
// monto y la fecha de pago directo, sin necesidad de abrir el zip adjunto
// ni los links de pago. Ejemplo real:
//   NO. DE CUENTA: 24107236
//   MES Sep.
//   VALOR A PAGAR $ 113.149
//   FECHA DE PAGO Sep 21/26
function parseClaro(message) {
  const sender = (message?.sender || '').toLowerCase()
  if (!sender.includes('facturasclarocol@claro.com.co')) return null

  const body = message?.plaintextBody || ''

  const cuentaMatch = body.match(/NO\.?\s*DE\s*CUENTA:?\s*(\d+)/i)
  const valorMatch = body.match(/VALOR A PAGAR\s*\$?\s*([\d.,]+)/i)
  const fechaMatch = body.match(/FECHA DE PAGO\s+([A-Za-zÁÉÍÓÚáéíóú]+)\.?\s+(\d{1,2})\/(\d{2})/i)
  const mesMatch = body.match(/\bMES\s+([A-Za-zÁÉÍÓÚáéíóú]+)\.?/i)

  const valor = parseCOPAmount(valorMatch?.[1])
  if (!valor) return null // sin monto no sirve de nada — probablemente no es la factura

  const fechaPago = fechaMatch
    ? parseShortDate(fechaMatch[1], fechaMatch[2], fechaMatch[3])
    : null

  return {
    proveedor: 'Claro',
    categoriaSugerida: 'servicio',
    nombreSugerido: 'Claro Hogar',
    cuenta: cuentaMatch?.[1] || null,
    mesFactura: mesMatch?.[1] || null,
    valor,
    fechaPago,
    messageId: message?.id || null,
    fuente: 'texto-plano', // no requiere abrir adjuntos
  }
}

// --- Vanti (facturas@grupovanti.com) --------------------------------------
//
// Formato confirmado (revisado sep-2026): el cuerpo es puro texto genérico
// sin monto/fecha — esos datos están DENTRO del PDF adjunto ("Factura.pdf").
// Este parser solo detecta que es un correo de Vanti y deja marcado que
// necesita extracción de PDF; la extracción real del PDF se conecta después
// (reusa el pipeline de OCR/texto de PDF que ya se había planeado para las
// fotos de factura).
function parseVanti(message) {
  const sender = (message?.sender || '').toLowerCase()
  if (!sender.includes('facturas@grupovanti.com')) return null

  const pdfAttachment = (message?.attachments || []).find(
    (a) => a.mimeType === 'application/pdf'
  )

  return {
    proveedor: 'Vanti',
    categoriaSugerida: 'servicio',
    nombreSugerido: 'Gas Vanti',
    valor: null, // requiere abrir el PDF adjunto
    fechaPago: null, // requiere abrir el PDF adjunto
    messageId: message?.id || null,
    attachmentId: pdfAttachment?.id || null,
    fuente: 'pdf-adjunto', // pendiente: extraer texto del PDF
  }
}

// Lista de parsers activos. Se agregan más a medida que se confirma el
// formato real de cada proveedor (ETB, agua, etc.) con un correo de muestra.
const PARSERS = [parseClaro, parseVanti]

// Intenta cada parser conocido sobre un mensaje de Gmail. Devuelve el
// primer resultado no-nulo, o null si ningún proveedor conocido lo emitió.
export function detectBillFromMessage(message) {
  for (const parser of PARSERS) {
    const result = parser(message)
    if (result) return result
  }
  return null
}

export { parseClaro, parseVanti, parseCOPAmount }
