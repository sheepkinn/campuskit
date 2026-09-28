import { useEffect, useState } from 'react'
import { analyticsConfigured, getAnalytics, toolNames, type AnalyticsData } from '../lib/analyticsProvider'
import { Panel, ToolHeader } from '../components'
import './Dashboard.css'

export function Dashboard() {
  const [days, setDays] = useState<7 | 14 | 30>(14)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(analyticsConfigured)
  const [updatedAt, setUpdatedAt] = useState('')

  useEffect(() => {
    if (!analyticsConfigured) return
    let active = true
    const refresh = () => {
      setLoading(true)
      getAnalytics(days).then(result => {
        if (!active) return
        setData(result)
        setError('')
        setUpdatedAt(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }))
      }).catch(reason => {
        if (active) setError(reason instanceof Error ? reason.message : '无法读取统计数据。')
      }).finally(() => { if (active) setLoading(false) })
    }
    refresh()
    const timer = window.setInterval(refresh, 60000)
    return () => { active = false; window.clearInterval(timer) }
  }, [days])

  const visits = data?.dailyVisits ?? []
  const max = Math.max(1, ...visits.map(item => item.count))
  const points = visits.map((item, i) => `${(i / Math.max(1, visits.length - 1)) * 580},${170 - (item.count / max) * 150}`).join(' ')
  const topTool = Math.max(1, ...(data?.toolUsage.map(item => item.count) ?? []))

  return <>
    <ToolHeader title="数据看板" description="基于匿名访问与成功完成的工具操作，查看网站的实际使用情况。" badge="CAMPUSKIT / 访问统计" />
    <Panel title="上线初期的阶段性观察" hint="人工汇总">
      <div className="phase-stats"><div><strong>70+</strong><span>阶段性访问</span></div><div><strong>约 20–30</strong><span>使用过工具的访客</span></div><div><strong>50+</strong><span>仅浏览的访问</span></div></div>
      <p className="analytics-note">以上为上线初期汇总；当时尚未接入事件记录，不能回溯核验，也不并入下方实时统计。</p>
    </Panel>
    <div className="analytics-section-heading"><h2>真实事件统计</h2><span>{updatedAt ? `更新于 ${updatedAt}` : '从统计服务启用后开始记录'}</span></div>
    {!analyticsConfigured && <div className="analytics-message">统计服务尚未连接，真实访问数据暂不可用。</div>}
    {error && <div className="analytics-message" role="alert">{error}</div>}
    {loading && !data && <div className="analytics-message">正在读取访问数据…</div>}
    {data && <>
      <div className="dashboard-stats">
        <div><span>今日访问</span><strong>{data.today.toLocaleString()}</strong><small>次访问会话</small></div>
        <div><span>累计访问</span><strong>{data.total.toLocaleString()}</strong><small>次访问会话</small></div>
        <div><span>工具使用访客</span><strong>{data.toolVisitors.toLocaleString()}</strong><small>至少成功完成一次操作的独立浏览器</small></div>
        <div><span>仅浏览访问</span><strong>{data.browseOnly.toLocaleString()}</strong><small>访问至少 5 分钟前开始，且未完成工具操作</small></div>
      </div>
      <div className="dashboard-grid">
        <Panel title="访问趋势" hint="实际记录"><div className="range-tabs">{([7, 14, 30] as const).map(value => <button key={value} className={days === value ? 'active' : ''} onClick={() => setDays(value)}>{value} 天</button>)}</div><div className="chart"><div className="chart-y"><span>{max}</span><span>{Math.round(max * .67)}</span><span>{Math.round(max * .33)}</span><span>0</span></div><svg viewBox="0 0 580 180" preserveAspectRatio="none" role="img" aria-label={`最近 ${days} 天访问趋势`}><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#6c5ce7" stopOpacity=".23"/><stop offset="1" stopColor="#6c5ce7" stopOpacity="0"/></linearGradient></defs><line x1="0" y1="45" x2="580" y2="45"/><line x1="0" y1="90" x2="580" y2="90"/><line x1="0" y1="135" x2="580" y2="135"/><polygon points={`0,180 ${points} 580,180`} fill="url(#area)"/><polyline points={points} fill="none" stroke="#6454df" strokeWidth="3" vectorEffect="non-scaling-stroke"/></svg></div><div className="chart-x"><span>{visits[0]?.day ?? ''}</span><span>{visits.at(-1)?.day ?? ''}</span></div></Panel>
        <Panel title="工具完成次数" hint={`累计 ${data.uses} 次`}>{data.toolUsage.length ? <div className="bar-list">{data.toolUsage.map((item, index) => <div key={item.tool}><span>{String(index + 1).padStart(2, '0')}</span><strong>{toolNames[item.tool] ?? item.tool}</strong><div className="bar-track"><i style={{ width: `${item.count / topTool * 100}%` }} /></div><em>{item.count}</em></div>)}</div> : <p className="analytics-note">暂无成功完成的工具操作。</p>}</Panel>
      </div>
      <p className="analytics-note analytics-footer-note">只记录匿名会话与工具完成事件；文件和文件名不会上传。浏览器拦截统计请求时，实际访问可能高于此处数字。</p>
    </>}
  </>
}
