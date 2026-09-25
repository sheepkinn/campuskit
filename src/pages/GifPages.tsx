import { useEffect, useRef, useState } from 'react'
import { Dropzone, EmptyResult, Field, Panel, Status, ToolHeader } from '../components'
import { download, formatBytes, splitName } from '../lib/files'

type GifMeta = { width: number; height: number; duration: number; frames: number }

async function encodeFrames(frames: { image: ImageData; delay: number }[], onProgress?: (done: number, total: number) => void) {
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc')
  const gif = GIFEncoder()
  for (let i = 0; i < frames.length; i++) {
    const { image, delay } = frames[i]
    const palette = quantize(image.data, 256)
    const pixels = applyPalette(image.data, palette)
    gif.writeFrame(pixels, image.width, image.height, { palette, delay: Math.max(20, Math.round(delay)), repeat: 0 })
    onProgress?.(i + 1, frames.length)
    if (i % 5 === 0) await new Promise(resolve => setTimeout(resolve, 0))
  }
  gif.finish()
  return new Blob([Uint8Array.from(gif.bytes())], { type: 'image/gif' })
}

export function GifEditPage() {
  const [file, setFile] = useState<File | null>(null)
  const [meta, setMeta] = useState<GifMeta | null>(null)
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(0)
  const [width, setWidth] = useState(480)
  const [height, setHeight] = useState(270)
  const [speed, setSpeed] = useState(1)
  const [keepRatio, setKeepRatio] = useState(true)
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [output, setOutput] = useState<Blob | null>(null)
  const [url, setUrl] = useState('')
  const invalidate = () => { setOutput(null); setState('idle') }
  useEffect(() => { if (!file) return; const next = URL.createObjectURL(file); setUrl(next); return () => URL.revokeObjectURL(next) }, [file])
  async function select(incoming: File[]) {
    const chosen = incoming[0]
    if (!chosen || !(chosen.type === 'image/gif' || chosen.name.toLowerCase().endsWith('.gif'))) { setState('error'); setMessage('请选择 GIF 图片。'); return }
    try {
      const { parseGIF, decompressFrames } = await import('gifuct-js')
      const parsed = parseGIF(await chosen.arrayBuffer())
      const frames = decompressFrames(parsed, false)
      const duration = frames.reduce((sum, frame) => sum + Math.max(20, frame.delay || 100), 0) / 1000
      setFile(chosen); setMeta({ width: parsed.lsd.width, height: parsed.lsd.height, duration, frames: frames.length }); setStart(0); setEnd(Number(duration.toFixed(2))); setWidth(Math.min(480, parsed.lsd.width)); setHeight(Math.round(Math.min(480, parsed.lsd.width) * parsed.lsd.height / parsed.lsd.width)); setSpeed(1); setOutput(null); setState('idle')
    } catch { setState('error'); setMessage('无法读取这张 GIF，请尝试其他文件。') }
  }
  async function run() {
    if (!file || !meta) return
    if (!(end > start && start >= 0 && end <= meta.duration + 0.02 && width > 0 && height > 0 && width <= 800 && height <= 800)) { setState('error'); setMessage('请检查时间范围和尺寸，输出尺寸最大为 800 × 800。'); return }
    setState('busy'); setOutput(null); setMessage('正在读取 GIF 帧…')
    try {
      const { parseGIF, decompressFrames } = await import('gifuct-js')
      const frames = decompressFrames(parseGIF(await file.arrayBuffer()), true)
      const source = document.createElement('canvas'); source.width = meta.width; source.height = meta.height
      const ctx = source.getContext('2d', { willReadFrequently: true })!
      const patchCanvas = document.createElement('canvas'); const patchCtx = patchCanvas.getContext('2d')!
      const target = document.createElement('canvas'); target.width = width; target.height = height
      const targetCtx = target.getContext('2d', { willReadFrequently: true })!
      const selected: { image: ImageData; delay: number }[] = []
      let elapsed = 0, previous: typeof frames[number] | null = null, restore: ImageData | null = null
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i]
        if (previous?.disposalType === 2) ctx.clearRect(previous.dims.left, previous.dims.top, previous.dims.width, previous.dims.height)
        if (previous?.disposalType === 3 && restore) ctx.putImageData(restore, 0, 0)
        restore = frame.disposalType === 3 ? ctx.getImageData(0, 0, source.width, source.height) : null
        patchCanvas.width = frame.dims.width; patchCanvas.height = frame.dims.height
        patchCtx.putImageData(new ImageData(new Uint8ClampedArray(frame.patch), frame.dims.width, frame.dims.height), 0, 0)
        ctx.drawImage(patchCanvas, frame.dims.left, frame.dims.top)
        const delay = Math.max(20, frame.delay || 100)
        const overlap = Math.max(0, Math.min(elapsed + delay, end * 1000) - Math.max(elapsed, start * 1000))
        if (overlap > 0) {
          targetCtx.clearRect(0, 0, width, height); targetCtx.drawImage(source, 0, 0, width, height)
          selected.push({ image: targetCtx.getImageData(0, 0, width, height), delay: overlap / speed })
        }
        elapsed += delay; previous = frame
        if (i % 10 === 0) { setMessage(`正在读取 GIF 帧 ${i + 1} / ${frames.length}…`); await new Promise(resolve => setTimeout(resolve, 0)) }
      }
      if (!selected.length) throw new Error('选择的时间段没有可用画面。')
      if (selected.length > 180) throw new Error('所选片段超过 180 帧，请缩短时间范围。')
      setMessage('正在生成 GIF…')
      const blob = await encodeFrames(selected, (done, total) => setMessage(`正在生成 GIF ${done} / ${total} 帧…`))
      setOutput(blob); setState('done'); setMessage('GIF 已生成，可以下载。')
    } catch (error) { setState('error'); setMessage(error instanceof Error ? error.message : 'GIF 处理失败，请重试。') }
  }
  return <><ToolHeader title="GIF 编辑" description="裁剪时间、调整尺寸，把动图改成刚好需要的样子。" /><div className="workspace-grid"><div className="workspace-main"><Panel title="1. 添加 GIF"><Dropzone accept="image/gif,.gif" multiple={false} onFiles={select} />{file && <><img className="media-preview" src={url} alt="原始 GIF 预览" /><div className="media-info"><div><span>原始时长</span><strong>{meta?.duration.toFixed(1)} 秒</strong></div><div><span>原始尺寸</span><strong>{meta?.width} × {meta?.height}</strong></div><div><span>原始大小</span><strong>{formatBytes(file.size)}</strong></div><div><span>帧数</span><strong>{meta?.frames}</strong></div></div></>}</Panel><Panel title="2. 裁剪与尺寸"><div className="form-grid"><Field label="开始时间（秒）"><input type="number" min="0" step="0.1" value={start} onChange={e => { setStart(Number(e.target.value)); invalidate() }} /></Field><Field label="结束时间（秒）"><input type="number" min="0" step="0.1" value={end} onChange={e => { setEnd(Number(e.target.value)); invalidate() }} /></Field><Field label="宽度（px）"><input type="number" min="1" max="800" value={width} onChange={e => { const next = Number(e.target.value); setWidth(next); if (keepRatio && meta) setHeight(Math.round(next * meta.height / meta.width)); invalidate() }} /></Field><Field label="高度（px）"><input type="number" min="1" max="800" value={height} onChange={e => { const next = Number(e.target.value); setHeight(next); if (keepRatio && meta) setWidth(Math.round(next * meta.width / meta.height)); invalidate() }} /></Field><Field label="播放速度"><select value={speed} onChange={e => { setSpeed(Number(e.target.value)); invalidate() }}><option value={0.5}>0.5× 慢速</option><option value={1}>1× 原速</option><option value={1.5}>1.5×</option><option value={2}>2× 快速</option></select></Field></div><label className="check-line"><input type="checkbox" checked={keepRatio} onChange={e => { setKeepRatio(e.target.checked); invalidate() }} /> 保持宽高比</label><button className="primary-button" disabled={!file || state === 'busy'} onClick={run}>{state === 'busy' ? '生成中…' : '生成 GIF'} <span>→</span></button></Panel></div><div className="workspace-side"><Panel title="输出结果">{state === 'idle' ? <EmptyResult text="选择片段与尺寸后，点击生成 GIF。" /> : <Status kind={state}>{message}</Status>}{output && <><div className="media-info" style={{ marginTop: 17 }}><div><span>输出时长</span><strong>{((end - start) / speed).toFixed(1)} 秒</strong></div><div><span>输出尺寸</span><strong>{width} × {height}</strong></div><div><span>输出大小</span><strong>{formatBytes(output.size)}</strong></div></div><button className="download-button" onClick={() => download(output, `${splitName(file!.name).stem}-编辑.gif`)}>↓ 下载 GIF</button></>}</Panel><div className="tip-card"><span>✦</span><p>GIF 处理在浏览器中进行。超长或高分辨率动图建议先选较短片段。</p></div></div></div></>
}

export function VideoGifPage() {
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [duration, setDuration] = useState(0)
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(3)
  const [width, setWidth] = useState(480)
  const [fps, setFps] = useState(10)
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [output, setOutput] = useState<Blob | null>(null)
  const video = useRef<HTMLVideoElement>(null)
  useEffect(() => { setOutput(null); setState('idle') }, [start, end, width, fps])
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  function select(incoming: File[]) { const chosen = incoming[0]; if (!chosen || !(/\.mp4$|\.webm$/i.test(chosen.name))) { setState('error'); setMessage('请选择 MP4 或 WebM 视频。'); return } setFile(chosen); setUrl(URL.createObjectURL(chosen)); setOutput(null); setDuration(0); setStart(0); setState('idle') }
  async function seek(time: number) { const element = video.current!; if (Math.abs(element.currentTime - time) < .002 && element.readyState >= 2) return; await new Promise<void>((resolve, reject) => { const timer = window.setTimeout(() => { cleanup(); reject(new Error('读取视频画面超时，请尝试较短的视频。')) }, 12000); const cleanup = () => { clearTimeout(timer); element.removeEventListener('seeked', done); element.removeEventListener('error', fail) }; const done = () => { cleanup(); resolve() }; const fail = () => { cleanup(); reject(new Error('无法读取视频画面。')) }; element.addEventListener('seeked', done, { once: true }); element.addEventListener('error', fail, { once: true }); element.currentTime = time }) }
  async function run() { if (!video.current || !file) return; if (!(end > start && start >= 0 && end <= duration && end - start <= 10 && width >= 80 && width <= 640 && fps >= 2 && fps <= 15)) { setState('error'); setMessage('请选择不超过 10 秒的片段，宽度 80–640 px，帧率 2–15 FPS。'); return } setState('busy'); setMessage('正在读取视频画面…'); setOutput(null); try { const element = video.current; const height = Math.round(width * element.videoHeight / element.videoWidth); const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d', { willReadFrequently: true })!; const count = Math.max(1, Math.ceil((end - start) * fps)); const frames: { image: ImageData; delay: number }[] = []; for (let i = 0; i < count; i++) { await seek(Math.min(start + i / fps, end - .001)); ctx.drawImage(element, 0, 0, width, height); frames.push({ image: ctx.getImageData(0, 0, width, height), delay: 1000 / fps }); setMessage(`正在读取视频画面 ${i + 1} / ${count}…`); if (i % 3 === 0) await new Promise(resolve => setTimeout(resolve, 0)) } setMessage('正在编码 GIF…'); const blob = await encodeFrames(frames, (done, total) => setMessage(`正在编码 GIF ${done} / ${total} 帧…`)); setOutput(blob); setState('done'); setMessage('GIF 已生成，可以下载。') } catch (error) { setState('error'); setMessage(error instanceof Error ? error.message : '转换失败，请换一个视频重试。') } }
  return <><ToolHeader title="视频转 GIF" description="从 MP4 或 WebM 中截取短片段，生成可分享的动图。" /><div className="workspace-grid"><div className="workspace-main"><Panel title="1. 添加视频"><Dropzone accept="video/mp4,video/webm,.mp4,.webm" multiple={false} onFiles={select} />{file && <video ref={video} className="media-preview" src={url} controls preload="metadata" onLoadedMetadata={e => { const d = e.currentTarget.duration; setDuration(d); setEnd(Math.min(3, d)) }} />}{file && <p className="muted">{file.name} · {formatBytes(file.size)} {duration ? `· ${duration.toFixed(1)} 秒` : ''}</p>}</Panel><Panel title="2. 选择片段"><div className="form-grid"><Field label="开始时间（秒）"><input type="number" min="0" step="0.1" value={start} onChange={e => setStart(Number(e.target.value))} /></Field><Field label="结束时间（秒）"><input type="number" min="0" step="0.1" value={end} onChange={e => setEnd(Number(e.target.value))} /></Field><Field label="GIF 宽度（px）"><input type="number" min="80" max="640" value={width} onChange={e => setWidth(Number(e.target.value))} /></Field><Field label="帧率（FPS）"><input type="number" min="2" max="15" value={fps} onChange={e => setFps(Number(e.target.value))} /></Field></div><p className="muted">为保证浏览器运行流畅，每次最多转换 10 秒。</p><button className="primary-button" disabled={!file || !duration || state === 'busy'} onClick={run}>{state === 'busy' ? '生成中…' : '生成 GIF'} <span>→</span></button></Panel></div><div className="workspace-side"><Panel title="输出结果">{state === 'idle' ? <EmptyResult text="选择不超过 10 秒的片段后，点击生成 GIF。" /> : <Status kind={state}>{message}</Status>}{output && <><div className="media-info" style={{ marginTop: 17 }}><div><span>输出时长</span><strong>{(end - start).toFixed(1)} 秒</strong></div><div><span>输出尺寸</span><strong>{width} × {Math.round(width * video.current!.videoHeight / video.current!.videoWidth)}</strong></div><div><span>输出大小</span><strong>{formatBytes(output.size)}</strong></div></div><button className="download-button" onClick={() => download(output, `${splitName(file!.name).stem}-片段.gif`)}>↓ 下载 GIF</button></>}</Panel><div className="tip-card"><span>✦</span><p>首次生成时才加载 GIF 编码模块。整个处理过程在浏览器中完成。</p></div></div></div></>
}
