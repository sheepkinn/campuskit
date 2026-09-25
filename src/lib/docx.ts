import JSZip from 'jszip'
import { download, splitName } from './files'

const NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const w = (name: string) => `w:${name}`

export type StyleConfig = {
  cn: string; en: string; size: number; bold: boolean; align: 'left' | 'center' | 'right' | 'both';
  before: number; after: number; line: number; indent: number
}

export const defaultStyles: Record<string, StyleConfig> = {
  '标题 1': { cn: '黑体', en: 'Arial', size: 18, bold: true, align: 'center', before: 12, after: 12, line: 1.5, indent: 0 },
  '标题 2': { cn: '黑体', en: 'Arial', size: 16, bold: true, align: 'left', before: 10, after: 8, line: 1.5, indent: 0 },
  '标题 3': { cn: '黑体', en: 'Arial', size: 15, bold: true, align: 'left', before: 8, after: 6, line: 1.5, indent: 0 },
  '正文': { cn: '宋体', en: 'Times New Roman', size: 12, bold: false, align: 'both', before: 0, after: 0, line: 1.5, indent: 2 },
}

function child(parent: Element, name: string, doc: XMLDocument) {
  let element = Array.from(parent.children).find(node => node.localName === name && node.namespaceURI === NS)
  if (!element) { element = doc.createElementNS(NS, w(name)); parent.appendChild(element) }
  return element
}

function set(element: Element, name: string, value: string | number) { element.setAttributeNS(NS, w(name), String(value)) }
function get(element: Element, name: string) { return element.getAttributeNS(NS, name) || '' }

function updateStyle(style: Element, config: StyleConfig, doc: XMLDocument, label: string) {
  const name = child(style, 'name', doc)
  if (!get(name, 'val')) set(name, 'val', label === '正文' ? 'Normal' : `heading ${label.slice(-1)}`)
  set(child(style, 'uiPriority', doc), 'val', label === '正文' ? 1 : 9)
  child(style, 'qFormat', doc)
  const pPr = child(style, 'pPr', doc)
  set(child(pPr, 'jc', doc), 'val', config.align)
  const spacing = child(pPr, 'spacing', doc)
  set(spacing, 'before', Math.round(config.before * 20))
  set(spacing, 'after', Math.round(config.after * 20))
  set(spacing, 'line', Math.round(config.line * 240))
  set(spacing, 'lineRule', 'auto')
  const indent = child(pPr, 'ind', doc)
  set(indent, 'firstLineChars', Math.round(config.indent * 100))
  if (config.indent === 0) { set(indent, 'firstLine', 0) }
  const rPr = child(style, 'rPr', doc)
  const fonts = child(rPr, 'rFonts', doc)
  set(fonts, 'ascii', config.en)
  set(fonts, 'hAnsi', config.en)
  set(fonts, 'eastAsia', config.cn)
  for (const attr of ['asciiTheme', 'hAnsiTheme', 'eastAsiaTheme']) fonts.removeAttributeNS(NS, attr)
  set(child(rPr, 'sz', doc), 'val', Math.round(config.size * 2))
  set(child(rPr, 'szCs', doc), 'val', Math.round(config.size * 2))
  set(child(rPr, 'b', doc), 'val', config.bold ? 1 : 0)
  set(child(rPr, 'bCs', doc), 'val', config.bold ? 1 : 0)
}

export async function generateDocx(file: File, configs: Record<string, StyleConfig>) {
  for (const config of Object.values(configs)) {
    if (!Number.isFinite(config.size) || config.size < 6 || config.size > 72 || !Number.isFinite(config.line) || config.line < 1 || config.line > 3 || config.before < 0 || config.after < 0 || config.indent < 0) {
      throw new Error('请检查字号、行距和段落数值是否在允许范围内。')
    }
  }
  let zip: JSZip
  try { zip = await JSZip.loadAsync(file) } catch { throw new Error('无法读取 DOCX，请确认文件没有损坏。') }
  const stylesFile = zip.file('word/styles.xml')
  if (!stylesFile || !zip.file('word/document.xml')) throw new Error('这不是有效的 DOCX 模板，缺少 Word 样式或正文。')
  const xml = await stylesFile.async('string')
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.querySelector('parsererror')) throw new Error('模板样式无法读取，请换一个 DOCX 文件。')
  const root = doc.documentElement
  const all = Array.from(root.getElementsByTagNameNS(NS, 'style'))
  for (const [label, config] of Object.entries(configs)) {
    const number = label === '正文' ? '' : label.slice(-1)
    const aliases = label === '正文' ? ['normal', '正文'] : [`heading${number}`, `heading ${number}`, `标题${number}`, `标题 ${number}`]
    const matches = all.filter(style => {
      const id = get(style, 'styleId').toLowerCase().replaceAll(' ', '')
      const name = Array.from(style.children).find(node => node.localName === 'name')
      const display = name ? get(name, 'val').toLowerCase() : ''
      return aliases.some(alias => alias.replaceAll(' ', '') === id || alias === display)
    })
    if (!matches.length) {
      const style = doc.createElementNS(NS, w('style'))
      set(style, 'type', 'paragraph')
      set(style, 'styleId', label === '正文' ? 'Normal' : `Heading${number}`)
      if (label !== '正文') set(child(style, 'basedOn', doc), 'val', 'Normal')
      root.appendChild(style)
      matches.push(style)
    }
    for (const style of matches) updateStyle(style, config, doc, label)
  }
  zip.file('word/styles.xml', new XMLSerializer().serializeToString(doc))
  const { stem } = splitName(file.name)
  download(await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }), `${stem}-排版模板.docx`)
}
