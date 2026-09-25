export type AnalyticsData = {
  overview: { today: number; total: number; uses: number; duration: string }
  dailyVisits: number[]
  toolUsage: { name: string; count: number }[]
  regions: { name: string; percent: number }[]
  recentActivity: { time: string; tool: string }[]
}

export interface AnalyticsProvider { getData(days: 7 | 14 | 30): AnalyticsData }

export const MockAnalyticsProvider: AnalyticsProvider = {
  getData(days) {
    const visits = Array.from({ length: days }, (_, i) => Math.round(35 + i * 1.7 + Math.sin(i * 1.9) * 11 + Math.cos(i * 0.67) * 8))
    return {
      overview: { today: 86, total: 2847, uses: 1193, duration: '3分42秒' },
      dailyVisits: visits,
      toolUsage: [
        { name: '社会实践材料整理', count: 421 }, { name: 'Word 规范模板', count: 318 },
        { name: '图片压缩', count: 247 }, { name: 'PDF 合并', count: 192 },
        { name: '批量重命名', count: 137 }, { name: '视频转 GIF', count: 86 },
      ],
      regions: [
        { name: '中国大陆', percent: 76 }, { name: '中国香港', percent: 8 },
        { name: '中国台湾', percent: 6 }, { name: '日本', percent: 5 }, { name: '美国', percent: 5 },
      ],
      recentActivity: [
        { time: '14:32', tool: '图片压缩' }, { time: '14:30', tool: '社会实践材料整理' },
        { time: '14:24', tool: 'PDF 合并' }, { time: '14:18', tool: 'Word 规范模板生成' },
      ],
    }
  },
}
