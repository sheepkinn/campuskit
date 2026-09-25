import JSZip from 'jszip'

export const imageTypes = ['image/jpeg', 'image/png', 'image/webp']

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function splitName(name: string) {
  const index = name.lastIndexOf('.')
  return index > 0 ? { stem: name.slice(0, index), ext: name.slice(index) } : { stem: name, ext: '' }
}

export function renamed(file: File, index: number, count: number, template: string) {
  const { stem, ext } = splitName(file.name)
  const number = String(index + 1).padStart(Math.max(2, String(count).length), '0')
  const base = template.replaceAll('{序号}', number).replaceAll('{原文件名}', stem).trim()
  const safe = base.replace(/[\\/:*?"<>|\x00-\x1f]/g, '-').replace(/[. ]+$/g, '') || number
  return `${safe}${ext}`
}

export function uniqueNames(files: File[], template: string) {
  const used = new Set<string>()
  return files.map((file, index) => {
    const proposed = renamed(file, index, files.length, template)
    const { stem, ext } = splitName(proposed)
    let name = proposed
    let suffix = 2
    while (used.has(name.toLowerCase())) name = `${stem}-${suffix++}${ext}`
    used.add(name.toLowerCase())
    return name
  })
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export async function downloadZip(entries: { name: string; data: Blob | ArrayBuffer | Uint8Array }[], name: string) {
  const zip = new JSZip()
  for (const entry of entries) zip.file(entry.name, entry.data)
  download(await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } }), name)
}

export async function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('浏览器无法导出这张图片。')), type, quality))
}

export async function compressImage(file: File, targetBytes: number) {
  if (file.size <= targetBytes) return { blob: file as Blob, reached: true }
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) { bitmap.close(); throw new Error('浏览器无法处理图片。') }
  let scale = 1
  let best: Blob = file
  try {
    for (let round = 0; round < 10; round++) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      const qualities = file.type === 'image/png' ? [undefined] : [0.9, 0.78, 0.64, 0.5]
      for (const quality of qualities) {
        const blob = await canvasBlob(canvas, file.type, quality)
        if (blob.size < best.size) best = blob
        if (blob.size <= targetBytes) return { blob, reached: true }
      }
      scale *= 0.8
      if (canvas.width <= 160 || canvas.height <= 160) break
    }
    return { blob: best, reached: best.size <= targetBytes }
  } finally {
    bitmap.close()
  }
}

export async function convertImage(file: File, type: string) {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')!
  if (type === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height) }
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  return canvasBlob(canvas, type, 0.9)
}
