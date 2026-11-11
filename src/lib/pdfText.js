// Extrae el texto de un PDF con pdf.js (pdfjs-dist). Se carga solo cuando
// hay un PDF que leer, para no sumar ~1,7 MB a la carga inicial de la app.

let pdfjsPromise = null

async function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]).then(([pdfjs, worker]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default
      return pdfjs
    })
  }
  return pdfjsPromise
}

export async function extractPdfText(bytes) {
  const pdfjs = await loadPdfjs()
  const task = pdfjs.getDocument({ data: bytes })
  const doc = await task.promise
  let text = ''
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map((it) => it.str + (it.hasEOL ? '\n' : ' ')).join('') + '\n'
  }
  await task.destroy()
  return text
}
