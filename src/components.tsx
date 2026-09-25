import { useRef, useState, type ReactNode } from 'react'
import { formatBytes } from './lib/files'

export function Dropzone({ onFiles, accept, multiple = true, title, subtitle }: { onFiles: (files: File[]) => void; accept?: string; multiple?: boolean; title?: string; subtitle?: string }) {
  const input = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const add = (files: FileList | null) => { if (files?.length) onFiles(Array.from(files)) }
  return <div className={`dropzone ${drag ? 'dragging' : ''}`} onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={e => { e.preventDefault(); setDrag(false) }} onDrop={e => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files) }} onClick={() => input.current?.click()} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') input.current?.click() }}>
    <input ref={input} type="file" accept={accept} multiple={multiple} onChange={e => { add(e.target.files); e.target.value = '' }} hidden />
    <span className="drop-icon">↑</span>
    <strong>{title || '拖拽文件到这里，或点击选择'}</strong>
    <span>{subtitle || '文件仅在你的浏览器中处理，不会上传服务器。'}</span>
  </div>
}

export function Panel({ title, hint, children, className = '' }: { title: string; hint?: string; children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}><div className="panel-head"><h2>{title}</h2>{hint && <span>{hint}</span>}</div>{children}</section>
}

export function Status({ kind, children }: { kind: 'idle' | 'busy' | 'done' | 'error'; children: ReactNode }) {
  return <div className={`status status-${kind}`} role="status"><span className="status-dot" />{children}</div>
}

export function FileList({ files, names, onRemove }: { files: File[]; names?: string[]; onRemove?: (index: number) => void }) {
  if (!files.length) return null
  return <div className="file-list">{files.map((file, index) => <div className="file-row" key={`${file.name}-${index}`}><div className="file-mark">{file.name.split('.').pop()?.slice(0, 4).toUpperCase()}</div><div className="file-detail"><strong title={file.name}>{file.name}</strong>{names && <span>→ {names[index]}</span>}</div><span className="file-size">{formatBytes(file.size)}</span>{onRemove && <button className="icon-button" aria-label={`移除 ${file.name}`} onClick={() => onRemove(index)}>×</button>}</div>)}</div>
}

export function EmptyResult({ text = '完成设置后，结果会显示在这里。' }: { text?: string }) { return <div className="empty-result"><span>✦</span><p>{text}</p></div> }

export function ToolHeader({ title, description, badge }: { title: string; description: string; badge?: string }) {
  return <div className="tool-heading"><a className="back-link" href="#/">← 返回工具箱</a><div className="heading-tag">{badge || 'CAMPUSKIT / 工具'}</div><h1>{title}</h1><p>{description}</p></div>
}

export function Field({ label, children, note }: { label: string; children: ReactNode; note?: string }) { return <label className="field"><span>{label}</span>{children}{note && <small>{note}</small>}</label> }
