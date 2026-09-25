import { useState } from 'react'
import { Dropzone, EmptyResult, Field, FileList, Panel, Status, ToolHeader } from '../components'
import { compressImage, convertImage, downloadZip, formatBytes, imageTypes, splitName, uniqueNames } from '../lib/files'

type PhotoResult = { file: File; name: string; blob: Blob; reached: boolean }

function accepted(files: File[]) { return files.filter(file => imageTypes.includes(file.type)) }

export function PracticePage({ compact = false }: { compact?: boolean }) {
  const [files, setFiles] = useState<File[]>([])
  const [template, setTemplate] = useState('社会实践-{序号}')
  const [target, setTarget] = useState(2)
  const [results, setResults] = useState<PhotoResult[]>([])
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const names = uniqueNames(files, template)
  const add = (incoming: File[]) => { const valid = accepted(incoming); setFiles(current => [...current, ...valid]); setResults([]); setState(valid.length ? 'idle' : 'error'); setMessage(valid.length ? '' : '请选择 JPG、PNG 或 WebP 图片。') }
  async function process() {
    if (!files.length) { setState('error'); setMessage('请先选择图片。'); return }
    if (!(target > 0)) { setState('error'); setMessage('请输入大于 0 的目标大小。'); return }
    setState('busy'); setResults([]); setMessage('正在逐张压缩并检查实际大小…')
    try {
      const next: PhotoResult[] = []
      for (let i = 0; i < files.length; i++) {
        const { blob, reached } = await compressImage(files[i], target * 1024 * 1024)
        next.push({ file: files[i], name: names[i], blob, reached })
        setMessage(`正在处理 ${i + 1} / ${files.length} 张图片…`)
      }
      setResults(next); setState('done'); setMessage(next.some(item => !item.reached) ? '已完成。有图片未达到目标大小，请查看结果。' : '全部完成，可以下载。')
    } catch (error) { setState('error'); setMessage(error instanceof Error ? error.message : '图片处理失败，请重试。') }
  }
  async function save() {
    try {
      const entries = results.flatMap(item => compact ? [{ name: item.name, data: item.blob }] : [{ name: `原图/${item.name}`, data: item.file }, { name: `压缩图/${item.name}`, data: item.blob }])
      await downloadZip(entries, compact ? '压缩图片.zip' : '社会实践材料.zip')
    } catch { setState('error'); setMessage('打包失败，请减少文件数量后重试。') }
  }
  const original = results.reduce((sum, item) => sum + item.file.size, 0)
  const compressed = results.reduce((sum, item) => sum + item.blob.size, 0)
  return <><ToolHeader title={compact ? '图片压缩' : '社会实践材料整理'} description={compact ? '一次压缩多张图片，按目标大小检查结果并打包下载。' : '批量压缩、统一命名、原图与压缩图自动整理，一次完成。'} badge={compact ? undefined : 'CAMPUSKIT / 社会实践推荐'} />
    <div className="workspace-grid"><div className="workspace-main"><Panel title="1. 添加图片" hint="支持 JPG、PNG、WebP"><Dropzone accept="image/jpeg,image/png,image/webp" onFiles={add} subtitle="可以一次选择多张图片；文件只在浏览器本地处理。" /><FileList files={files} names={compact ? undefined : names} onRemove={index => { setFiles(files.filter((_, i) => i !== index)); setResults([]); setState('idle') }} /></Panel>
      <Panel title="2. 设置规则"><div className="form-grid"><Field label="每张图片目标大小（MB）" note="原图已经小于目标时会保留原文件。"><input type="number" min="0.05" step="0.1" value={target} onChange={e => { setTarget(Number(e.target.value)); setResults([]) }} /></Field>{!compact && <Field label="命名模板" note="可使用 {序号} 和 {原文件名}。"><input value={template} onChange={e => { setTemplate(e.target.value); setResults([]) }} /></Field>}</div><button className="primary-button" onClick={process} disabled={state === 'busy'}>{state === 'busy' ? '处理中…' : compact ? '开始压缩' : '开始整理'} <span>→</span></button></Panel></div>
      <div className="workspace-side"><Panel title="处理结果" hint={results.length ? `${results.length} 个文件` : undefined}>{state !== 'idle' && <Status kind={state}>{message}</Status>}{results.length ? <><div className="stats-grid"><div><span>文件数量</span><strong>{results.length}</strong></div><div><span>原始总大小</span><strong>{formatBytes(original)}</strong></div><div><span>压缩后总大小</span><strong>{formatBytes(compressed)}</strong></div><div><span>节省空间</span><strong>{Math.max(0, (1 - compressed / original) * 100).toFixed(1)}%</strong></div></div><div className="result-list">{results.map((item, index) => <div className="result-item" key={index}><strong>{item.name}</strong><span>{formatBytes(item.file.size)} → {formatBytes(item.blob.size)}</span><em className={item.reached ? 'success' : 'warning'}>{item.reached ? '达到目标' : '未达到目标'}</em></div>)}</div><button className="download-button" onClick={save}>↓ 下载{compact ? '压缩图片' : '整理包'}</button></> : <EmptyResult text="完成处理后，可在这里核对每张图片并下载 ZIP。" />}</Panel><div className="tip-card"><span>✦</span><p>{compact ? '实际导出大小会逐张检查；超出目标的图片会明确标记。' : '整理包会分别建立「原图」和「压缩图」文件夹，方便交材料时直接使用。'}</p></div></div></div></>
}

export function RenamePage() {
  const [files, setFiles] = useState<File[]>([])
  const [template, setTemplate] = useState('实践材料-{序号}')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const names = uniqueNames(files, template)
  async function save() { setBusy(true); setError(''); try { await downloadZip(files.map((file, i) => ({ name: names[i], data: file })), '批量重命名.zip') } catch { setError('打包失败，请重试。') } finally { setBusy(false) } }
  return <><ToolHeader title="批量文件重命名" description="给一批文件统一命名，先预览，再打包下载。" /><div className="workspace-grid"><div className="workspace-main"><Panel title="1. 添加文件"><Dropzone onFiles={incoming => setFiles(current => [...current, ...incoming])} /><FileList files={files} names={names} onRemove={i => setFiles(files.filter((_, index) => index !== i))} /></Panel><Panel title="2. 命名规则"><Field label="命名模板" note="可使用 {序号} 和 {原文件名}；重复名称会自动加编号。"><input value={template} onChange={e => setTemplate(e.target.value)} /></Field><button className="primary-button" disabled={!files.length || busy} onClick={save}>{busy ? '打包中…' : '下载重命名 ZIP'} <span>→</span></button>{error && <Status kind="error">{error}</Status>}</Panel></div><div className="workspace-side"><Panel title="命名预览" hint={`${files.length} 个文件`}>{files.length ? <div className="preview-list">{files.map((file, i) => <div key={i}><span>{file.name}</span><b>↓</b><strong>{names[i]}</strong></div>)}</div> : <EmptyResult text="添加文件后，这里会显示新旧文件名。" />}</Panel></div></div></>
}

export function ConvertPage() {
  const [files, setFiles] = useState<File[]>([])
  const [type, setType] = useState('image/png')
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  async function run() { setState('busy'); setMessage('正在转换图片…'); try { const ext = type === 'image/jpeg' ? '.jpg' : type === 'image/webp' ? '.webp' : '.png'; const entries = []; const used = new Set<string>(); for (const file of files) { const stem = splitName(file.name).stem; let name = `${stem}${ext}`; let suffix = 2; while (used.has(name.toLowerCase())) name = `${stem}-${suffix++}${ext}`; used.add(name.toLowerCase()); entries.push({ name, data: await convertImage(file, type) }) } await downloadZip(entries, '转换后的图片.zip'); setState('done'); setMessage('转换完成，下载已开始。') } catch { setState('error'); setMessage('转换失败，请检查图片格式。') } }
  return <><ToolHeader title="图片格式转换" description="JPG、PNG 和 WebP 批量互转，下载仍按原文件名整理。" /><div className="workspace-grid"><div className="workspace-main"><Panel title="1. 添加图片"><Dropzone accept="image/jpeg,image/png,image/webp" onFiles={incoming => { const valid = accepted(incoming); setFiles(current => [...current, ...valid]); if (!valid.length) { setState('error'); setMessage('请选择 JPG、PNG 或 WebP 图片。') } }} /><FileList files={files} onRemove={i => setFiles(files.filter((_, index) => index !== i))} /></Panel><Panel title="2. 目标格式"><Field label="转换为"><select value={type} onChange={e => setType(e.target.value)}><option value="image/png">PNG</option><option value="image/jpeg">JPG</option><option value="image/webp">WebP</option></select></Field><button className="primary-button" disabled={!files.length || state === 'busy'} onClick={run}>{state === 'busy' ? '转换中…' : '转换并下载'} <span>→</span></button></Panel></div><div className="workspace-side"><Panel title="处理状态">{state === 'idle' ? <EmptyResult /> : <Status kind={state}>{message}</Status>}</Panel><div className="tip-card"><span>✦</span><p>转换为 JPG 时，透明背景会填充为白色。</p></div></div></div></>
}
