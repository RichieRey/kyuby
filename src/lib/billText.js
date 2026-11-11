// Utilidades para sacar montos y fechas de facturas colombianas, a partir del
// texto de un correo o de un PDF. No dependen del navegador, así que se
// pueden probar con Node.

const MESES = {
  ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
  jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
}

// "113.149" | "$ 113.149" | "54,207" | "$28.840,00" | "28.840,0" -> pesos enteros.
// En Colombia el punto separa miles, pero algunos correos (Tigo) usan coma.
// Si al final hay una coma con 1 o 2 dígitos, son centavos y se descartan.
export function parseAmountCO(raw) {
  if (!raw) return null
  let s = String(raw).replace(/[^\d.,]/g, '')
  s = s.replace(/,\d{1,2}$/, '')
  const digits = s.replace(/[^\d]/g, '')
  if (!digits) return null
  const n = parseInt(digits, 10)
  return n > 0 ? n : null
}

// Monto después de "valor a pagar" / "total a pagar" (con o sin "a la fecha").
export function findLabeledAmount(text) {
  const m = (text || '').match(
    /(?:valor|total)\s+(?:total\s+)?a\s+pagar(?:\s+a\s+la\s+fecha)?[^\d$]{0,40}\$?\s*([\d][\d.,]*)/i
  )
  return m ? parseAmountCO(m[1]) : null
}

// Código de barras GS1-128 que imprimen las empresas de servicios públicos:
// (415) convenio, (8020) referencia, (3900) valor, (96) fecha límite AAAAMMDD.
export function parseGS1(text) {
  // Los dígitos de cada campo van pegados al paréntesis; no se juntan
  // espacios porque justo después del código suele venir otro número.
  // El valor (3900) en estas facturas tiene 14 dígitos.
  const t = text || ''
  const valor = t.match(/\(3900\)\s?(\d{1,14})/)
  const fecha = t.match(/\(96\)\s?(\d{4})(\d{2})(\d{2})/)
  return {
    valor: valor ? parseInt(valor[1], 10) || null : null,
    fecha: fecha ? new Date(Number(fecha[1]), Number(fecha[2]) - 1, Number(fecha[3])) : null,
    referencia: t.match(/\(8020\)\s?(\d+)/)?.[1] || null,
  }
}

function monthIndex(word) {
  return MESES[(word || '').toLowerCase().normalize('NFD').replace(/[^a-z]/g, '').slice(0, 3)]
}

// Todas las fechas en formatos que usan las facturas:
// "13 Nov. 2026", "13 de noviembre de 2026", "Nov 23/26", "23/11/2026".
export function findDates(text) {
  const t = text || ''
  const out = []
  for (const m of t.matchAll(/\b(\d{1,2})\s+(?:de\s+)?([A-Za-zÁÉÍÓÚáéíóú]{3,10})\.?\s+(?:de\s+)?(\d{4})\b/g)) {
    const mi = monthIndex(m[2])
    if (mi !== undefined) out.push(new Date(Number(m[3]), mi, Number(m[1])))
  }
  for (const m of t.matchAll(/\b([A-Za-z]{3})\.?\s+(\d{1,2})\/(\d{2})\b/g)) {
    const mi = monthIndex(m[1])
    if (mi !== undefined) out.push(new Date(2000 + Number(m[3]), mi, Number(m[2])))
  }
  for (const m of t.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g)) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
    if (d.getMonth() === Number(m[2]) - 1) out.push(d)
  }
  return out
}

// Fecha límite probable: la más cercana después de que llegó el correo,
// dentro de los 45 días siguientes. Así se descartan la fecha de emisión,
// las de lectura del medidor y fechas lejanas como revisiones técnicas.
export function pickDueDate(dates, received) {
  const start = new Date(received.getFullYear(), received.getMonth(), received.getDate())
  const end = new Date(start.getTime() + 45 * 86400000)
  const candidates = dates.filter((d) => d > start && d <= end).sort((a, b) => a - b)
  return candidates[0] || null
}

// HTML de un correo a texto plano legible para los lectores.
export function htmlToText(html) {
  if (!html) return ''
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h\d|table)>/gi, '\n')
    .replace(/<\/t[dh]>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim()
}
