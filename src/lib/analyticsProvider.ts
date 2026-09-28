export type ToolId = 'practice' | 'word' | 'compress' | 'rename' | 'convert' | 'pdf-merge' | 'pdf-split' | 'gif-edit' | 'video-gif'

export const toolNames: Record<ToolId, string> = {
  practice: '社会实践材料整理',
  word: 'Word 规范模板',
  compress: '图片压缩',
  rename: '批量重命名',
  convert: '图片格式转换',
  'pdf-merge': 'PDF 合并',
  'pdf-split': 'PDF 拆分',
  'gif-edit': 'GIF 编辑',
  'video-gif': '视频转 GIF',
}

export type AnalyticsData = {
  today: number
  total: number
  toolVisitors: number
  browseOnly: number
  uses: number
  dailyVisits: { day: string; count: number }[]
  toolUsage: { tool: ToolId; count: number }[]
}

const endpoint = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const analyticsConfigured = Boolean(endpoint && publishableKey)

const VISITOR_KEY = 'campuskit:visitor:v1'
const SESSION_KEY = 'campuskit:session:v1'
let visitRequest: Promise<void> | undefined
const fallbackIds = new Map<string, string>()

function getId(storage: Storage, key: string): string {
  let id: string | null = null
  try { id = storage.getItem(key) } catch { id = fallbackIds.get(key) ?? null }
  if (!id) {
    id = crypto.randomUUID()
    try { storage.setItem(key, id) } catch { fallbackIds.set(key, id) }
  }
  return id
}

async function rpc<T>(name: string, body: object): Promise<T> {
  if (!analyticsConfigured) throw new Error('统计后台尚未连接。')
  const response = await fetch(`${endpoint}/rest/v1/rpc/${name}`, {
    method: 'POST',
    keepalive: name === 'campuskit_record_event',
    headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`统计服务暂时不可用（${response.status}）。`)
  return response.json() as Promise<T>
}

export function recordVisit(): Promise<void> {
  if (!analyticsConfigured) return Promise.resolve()
  if (!visitRequest) {
    const sessionId = getId(sessionStorage, SESSION_KEY)
    const visitorId = getId(localStorage, VISITOR_KEY)
    visitRequest = rpc('campuskit_record_event', {
      p_event_id: sessionId,
      p_session_id: sessionId,
      p_visitor_id: visitorId,
      p_event_type: 'visit',
      p_tool: null,
    }).then(() => undefined).catch(error => { visitRequest = undefined; throw error })
  }
  return visitRequest
}

export async function recordToolComplete(tool: ToolId): Promise<void> {
  if (!analyticsConfigured) return
  try {
    await recordVisit()
    await rpc('campuskit_record_event', {
      p_event_id: crypto.randomUUID(),
      p_session_id: getId(sessionStorage, SESSION_KEY),
      p_visitor_id: getId(localStorage, VISITOR_KEY),
      p_event_type: 'tool_complete',
      p_tool: tool,
    })
  } catch (error) {
    console.warn('CampusKit 统计事件未送达', error)
  }
}

export async function getAnalytics(days: 7 | 14 | 30): Promise<AnalyticsData> {
  const data = await rpc<AnalyticsData>('campuskit_stats', { p_days: days })
  if (!data || !Array.isArray(data.dailyVisits) || !Array.isArray(data.toolUsage)) throw new Error('统计服务返回的数据格式不正确。')
  return data
}
