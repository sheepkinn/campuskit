import { useState } from 'react'
import { Dropzone, EmptyResult, FileList, Panel, Status, ToolHeader } from '../components'
import { download } from '../lib/files'

export function PdfMergePage() {
  const [files, setFiles] = useState<File[]>([])
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  function move(index: number, offset: number) { const next = [...files]; const to = index + offset; if (to < 0 || to >= next.length) return; [next[index], next[to]] = [next[to], next[index]]; setFiles(next) }
  async function run() { setState('busy'); setMessage('正在合并 PDF…'); try { const { PDFDocument } = await import('pdf-lib'); const merged = await PDFDocument.create(); for (const file of files) { const source = await PDFDocument.load(await file.arrayBuffer()); const pages = await merged.copyPages(source, source.getPageIndices()); pages.forEach(page => merged.addPage(page)) } download(new Blob([new Uint8Array(await merged.save())], { type: 'application/pdf' }), '合并后的文件.pdf'); setState('done'); setMessage('合并完成，下载已开始。') } catch { setState('error'); setMessage('合并失败。请检查 PDF 是否已损坏或设置了密码。') } }
  return <><ToolHeader title="PDF 合并" description="调整顺序后，将多个 PDF 合成一份。" /><div className="workspace-grid"><div className="workspace-main"><Panel title="1. 添加 PDF"><Dropzone accept=".pdf,application/pdf" onFiles={incoming => setFiles(current => [...current, ...incoming.filter(file => file.name.toLowerCase().endsWith('.pdf'))])} /><div className="file-list">{files.map((file, i) => <div className="file-row" key={i}><span className="file-mark">PDF</span><div className="file-detail"><strong>{file.name}</strong></div><button className="mini-button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="上移">↑</button><button className="mini-button" onClick={() => move(i, 1)} disabled={i === files.length - 1} aria-label="下移">↓</button><button className="icon-button" onClick={() => setFiles(files.filter((_, index) => index !== i))} aria-label="移除">×</button></div>)}</div></Panel><Panel title="2. 合并文件"><p className="muted">文件将按照上方顺序排列。</p><button className="primary-button" disabled={files.length < 2 || state === 'busy'} onClick={run}>{state === 'busy' ? '合并中…' : '合并并下载'} <span>→</span></button></Panel></div><div className="workspace-side"><Panel title="处理状态">{state === 'idle' ? <EmptyResult text="至少添加两份 PDF 后即可合并。" /> : <Status kind={state}>{message}</Status>}</Panel></div></div></>
}

function parsePages(value: string, total: number) {
  const result: number[] = []
  for (const part of value.split(',')) {
    const match = /^\s*(\d+)(?:\s*-\s*(\d+))?\s*$/.exec(part)
    if (!match) throw new Error('页码格式不正确，请参考 1-3,5,8-10。')
    const a = Number(match[1]), b = Number(match[2] || match[1])
    if (a < 1 || b > total || a > b) throw new Error(`页码超出范围，请输入 1 到 ${total} 之间的页码。`)
    for (let page = a; page <= b; page++) if (!result.includes(page - 1)) result.push(page - 1)
  }
  return result
}

export function PdfSplitPage() {
  const [file, setFile] = useState<File | null>(null)
  const [total, setTotal] = useState(0)
  const [range, setRange] = useState('1-3')
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  async function select(incoming: File[]) { const chosen = incoming[0]; if (!chosen?.name.toLowerCase().endsWith('.pdf')) { setState('error'); setMessage('请选择 PDF 文件。'); return } setFile(chosen); try { const { PDFDocument } = await import('pdf-lib'); const doc = await PDFDocument.load(await chosen.arrayBuffer()); setTotal(doc.getPageCount()); setRange(`1-${Math.min(3, doc.getPageCount())}`); setState('idle') } catch { setFile(null); setState('error'); setMessage('无法读取 PDF，请检查文件是否已损坏或设置了密码。') } }
  async function run() { if (!file) return; setState('busy'); setMessage('正在提取页面…'); try { const { PDFDocument } = await import('pdf-lib'); const source = await PDFDocument.load(await file.arrayBuffer()); const output = await PDFDocument.create(); const pages = await output.copyPages(source, parsePages(range, total)); pages.forEach(page => output.addPage(page)); download(new Blob([new Uint8Array(await output.save())], { type: 'application/pdf' }), `${file.name.replace(/\.pdf$/i, '')}-选取页面.pdf`); setState('done'); setMessage('页面已提取，下载已开始。') } catch (error) { setState('error'); setMessage(error instanceof Error ? error.message : '拆分失败，请重试。') } }
  return <><ToolHeader title="PDF 拆分" description="按页码范围提取需要的页面，保存为一份新 PDF。" /><div className="workspace-grid"><div className="workspace-main"><Panel title="1. 添加 PDF"><Dropzone accept=".pdf,application/pdf" multiple={false} onFiles={select} />{file && <FileList files={[file]} onRemove={() => { setFile(null); setTotal(0) }} />}</Panel><Panel title="2. 选择页码"><label className="field"><span>页码范围 {total > 0 && `· 共 ${total} 页`}</span><input value={range} onChange={e => setRange(e.target.value)} placeholder="例如 1-3,5,8-10" /><small>用逗号分隔页码或范围，例如 1-3,5,8-10。</small></label><button className="primary-button" disabled={!file || state === 'busy'} onClick={run}>{state === 'busy' ? '提取中…' : '提取并下载'} <span>→</span></button></Panel></div><div className="workspace-side"><Panel title="处理状态">{state === 'idle' ? <EmptyResult text="添加 PDF 并填写页码后开始提取。" /> : <Status kind={state}>{message}</Status>}</Panel></div></div></>
}
