import { useEffect, useState } from 'react'
import { PracticePage, RenamePage, ConvertPage } from './pages/ImageTools'
import { WordPage } from './pages/WordPage'
import { PdfMergePage, PdfSplitPage } from './pages/PdfPages'
import { Dashboard } from './pages/Dashboard'
import { GifEditPage, VideoGifPage } from './pages/GifPages'

const tools = [
  { path: 'practice', icon: '✦', className: 'violet', title: '社会实践材料整理', description: '批量压缩、统一命名，原图与压缩图自动整理。', category: '图片工具' },
  { path: 'word', icon: '▤', className: 'blue', title: 'Word 规范模板生成器', description: '上传学校模板，配置好标题与正文样式。', category: '文档工具' },
  { path: 'compress', icon: '◈', className: 'mint', title: '图片压缩', description: '批量压缩，按目标大小检查。', category: '图片工具' },
  { path: 'rename', icon: '⌘', className: 'peach', title: '批量重命名', description: '预览新文件名，打包下载。', category: '文件工具' },
  { path: 'convert', icon: '⇄', className: 'lavender', title: '图片格式转换', description: 'JPG、PNG、WebP 轻松互转。', category: '图片工具' },
  { path: 'pdf-merge', icon: '▣', className: 'blue', title: 'PDF 合并', description: '调整顺序，将多份文件合成一份。', category: 'PDF 工具' },
  { path: 'pdf-split', icon: '◫', className: 'mint', title: 'PDF 拆分', description: '选择页码，提取需要的页面。', category: 'PDF 工具' },
  { path: 'gif-edit', icon: '◧', className: 'peach', title: 'GIF 编辑', description: '裁剪时间、调整尺寸。', category: '媒体工具' },
  { path: 'video-gif', icon: '▷', className: 'lavender', title: '视频转 GIF', description: '截取视频片段，生成动图。', category: '媒体工具' },
]

function Home() { return <><section className="hero"><div className="hero-glow"/><div className="eyebrow"><span className="live-dot"/> 让琐事变简单</div><h1>Campus<span>Kit</span></h1><h2>大学生的随身工具箱</h2><p>那些不值得安装一个软件，却总在浪费我们时间的小事。</p><a className="hero-button" href="#tools">开始使用 <span>↗</span></a><div className="hero-note">轻量 · 即开即用 · 浏览器本地处理</div></section><section className="home-content" id="tools"><div className="section-heading"><div><span className="section-kicker">A LITTLE HELP, EVERY DAY</span><h2>今天要解决什么小事？</h2><p>从材料整理到文档排版，打开就能做。</p></div><span className="tool-count">{tools.length} 个实用工具</span></div><div className="featured-grid"><a href="#/practice" className="feature-card practice-card"><div><span className="pill">✦ 社会实践推荐</span><div className="feature-art practice-art"><span className="sheet sheet-back">JPG</span><span className="sheet sheet-front">ZIP</span><span className="sheet-star">✦</span></div></div><div><span className="feature-category">一站式整理</span><h3>社会实践材料整理</h3><p>批量压缩、统一命名，原图与压缩图自动整理，一次完成。</p><span className="card-link">立即使用 <b>↗</b></span></div></a><a href="#/word" className="feature-card word-card"><div><span className="pill subdued">文档排版</span><div className="feature-art word-art"><div className="paper"><i/><i/><i/><i/></div><span className="type-mark">Aa</span></div></div><div><span className="feature-category">告别重复排版</span><h3>Word 规范模板生成器</h3><p>保留学校模板，设置标题与正文样式，直接开始写作。</p><span className="card-link">立即使用 <b>↗</b></span></div></a></div><div className="section-heading secondary-heading"><div><span className="section-kicker">EVERYDAY TOOLS</span><h2>更多趁手的小工具</h2></div></div><div className="tools-grid">{tools.slice(2).map(tool => <a href={`#/${tool.path}`} className="tool-card" key={tool.path}><span className={`tool-icon ${tool.className}`}>{tool.icon}</span><span className="tool-category">{tool.category}</span><h3>{tool.title}</h3><p>{tool.description}</p><span className="tool-arrow">↗</span></a>)}</div><div className="privacy-banner"><span>◎</span><div><strong>你的文件，只在你的浏览器里处理。</strong><p>无需登录，无需上传。处理完成后，文件由你下载保存。</p></div></div></section></> }

function App() {
  const [route, setRoute] = useState(() => window.location.hash.replace(/^#\//, '').split('?')[0])
  useEffect(() => { const sync = () => { setRoute(window.location.hash.replace(/^#\//, '').split('?')[0]); if (window.location.hash !== '#tools') window.scrollTo(0, 0) }; window.addEventListener('hashchange', sync); return () => window.removeEventListener('hashchange', sync) }, [])
  const pages: Record<string, React.ReactNode> = { practice: <PracticePage />, word: <WordPage />, compress: <PracticePage compact />, rename: <RenamePage />, convert: <ConvertPage />, 'pdf-merge': <PdfMergePage />, 'pdf-split': <PdfSplitPage />, 'gif-edit': <GifEditPage />, 'video-gif': <VideoGifPage />, dashboard: <Dashboard /> }
  const isHome = !route || route === '#tools'
  return <><header className="site-header"><div className="header-inner"><a className="logo" href="#/"><span className="logo-symbol">✦</span> CampusKit<span className="logo-dot">.</span></a><nav><a href="#/">工具箱</a><a href="#/dashboard">数据看板 <span className="demo-nav">DEMO</span></a></nav></div></header><main>{isHome ? <Home /> : pages[route] ? <div className="tool-page">{pages[route]}</div> : <div className="not-found"><h1>页面走丢了</h1><p>这个工具暂时找不到。</p><a className="primary-button" href="#/">返回工具箱 →</a></div>}</main><footer className="site-footer"><div><a className="logo" href="#/"><span className="logo-symbol">✦</span> CampusKit<span className="logo-dot">.</span></a><p>大学生的随身工具箱</p></div><span>为学习与生活里的小事而做 · 文件仅在浏览器中处理</span></footer></>
}

export default App
