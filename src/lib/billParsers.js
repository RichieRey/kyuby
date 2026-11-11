// Lectores de facturas por proveedor.
//
// Cada proveedor declara sus correos remitentes y cómo sacar el valor y la
// fecha límite. Para agregar uno nuevo basta con sumar una entrada a
// PROVEEDORES_GMAIL. Los formatos marcados con `probado: true` se revisaron
// con correos reales (nov-2026); los demás usan el lector genérico.
//
// Cada lector recibe el mensaje ya leído:
//   { id, sender, subject, date, text, hasPdf, getPdfText }
// y devuelve { valor, fechaPago, fuente } o null si no es una factura.
// Nunca lanzan excepción para no tumbar el escaneo por un correo raro.

import { findLabeledAmount, findDates, pickDueDate, parseGS1 } from './billText'

function fromText(message) {
  const valor = findLabeledAmount(message.text)
  if (!valor) return null
  return { valor, fechaPago: pickDueDate(findDates(message.text), message.date), fuente: 'correo' }
}

async function fromPdf(message) {
  if (!message.hasPdf) return null
  const pdf = await message.getPdfText()
  if (!pdf) return null
  const gs1 = parseGS1(pdf)
  const valor = gs1.valor || findLabeledAmount(pdf)
  if (!valor) return null
  return {
    valor,
    fechaPago: gs1.fecha || pickDueDate(findDates(pdf), message.date),
    fuente: 'pdf',
  }
}

// Genérico: primero el texto del correo y, si no trae el valor, el PDF adjunto.
async function generic(message) {
  return fromText(message) || (await fromPdf(message))
}

export const PROVEEDORES_GMAIL = [
  {
    id: 'claro',
    nombre: 'Claro',
    nombreSugerido: 'Claro Hogar',
    tipo: 'servicio',
    remitentes: ['facturasclarocol@claro.com.co'],
    probado: true,
    // "VALOR A PAGAR $ 113.149" y "FECHA DE PAGO Nov 23/26" en el cuerpo.
    leer: async (m) => fromText(m),
  },
  {
    id: 'vanti',
    nombre: 'Vanti',
    nombreSugerido: 'Gas Vanti',
    tipo: 'servicio',
    remitentes: ['facturacioncolombia@grupovanti.com', 'facturas@grupovanti.com'],
    probado: true,
    // El correo no trae datos; el PDF trae el código de barras con el valor
    // (3900) y la fecha de "Pago oportuno".
    leer: async (m) => fromPdf(m),
  },
  {
    id: 'tigo',
    nombre: 'Tigo',
    nombreSugerido: 'Tigo móvil',
    tipo: 'servicio',
    remitentes: ['facturas@facturas.tigo.com.co', 'facturas@factura.tigo.com.co'],
    probado: true,
    // "Valor a pagar a la fecha $54,207"; el correo no trae fecha límite.
    leer: async (m) => fromText(m),
  },
  {
    id: 'enel',
    nombre: 'Enel',
    nombreSugerido: 'Energía Enel',
    tipo: 'servicio',
    remitentes: ['enel.com'],
    probado: false,
    leer: generic,
  },
  {
    id: 'etb',
    nombre: 'ETB',
    nombreSugerido: 'Internet ETB',
    tipo: 'servicio',
    remitentes: ['etb.com.co'],
    probado: false,
    leer: generic,
  },
  {
    id: 'movistar',
    nombre: 'Movistar',
    nombreSugerido: 'Movistar',
    tipo: 'servicio',
    remitentes: ['movistar.com.co', 'telefonica.com'],
    probado: false,
    leer: generic,
  },
  {
    id: 'acueducto',
    nombre: 'Acueducto de Bogotá',
    nombreSugerido: 'Agua',
    tipo: 'servicio',
    remitentes: ['acueducto.com.co'],
    probado: false,
    leer: generic,
  },
]

// Consulta de Gmail: correos de los remitentes conocidos de los últimos días
// que hablen de factura o de pagar (descarta avisos de contraseña, citas, etc.).
export function gmailQuery(days = 60) {
  const from = PROVEEDORES_GMAIL.flatMap((p) => p.remitentes).join(' OR ')
  return `from:(${from}) newer_than:${days}d (factura OR pagar)`
}

export function providerForSender(sender) {
  const s = (sender || '').toLowerCase()
  return PROVEEDORES_GMAIL.find((p) => p.remitentes.some((r) => s.includes(r))) || null
}

// Devuelve el candidato listo para mostrar, o null si el correo no es una
// factura de un proveedor conocido o no se le pudo sacar el valor.
export async function detectBill(message) {
  const provider = providerForSender(message.sender)
  if (!provider) return null
  let result = null
  try {
    result = await provider.leer(message)
  } catch (e) {
    console.warn(`No se pudo leer la factura de ${provider.nombre}:`, e)
  }
  if (!result) return null
  return {
    messageId: message.id,
    proveedorId: provider.id,
    proveedor: provider.nombre,
    categoriaSugerida: provider.tipo,
    nombreSugerido: provider.nombreSugerido,
    probado: provider.probado,
    recibido: message.date,
    ...result,
  }
}
