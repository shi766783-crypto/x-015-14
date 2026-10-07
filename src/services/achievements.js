import { ChefHat, BookOpen, Flame, Target, Crown, CalendarCheck, Compass, CakeSlice, ShoppingBasket, NotebookPen, Users, Star } from 'lucide-vue-next'

// 徽章解锁只以真实烹饪行为为依据：
// documents = 收藏的菜谱，usages = 烹饪记录（status: 完成 / 翻车），policies = 每周菜单与采购
export const achievementDefs = [
  { id: 'first-cook', name: '初次下厨', icon: ChefHat, target: 1, desc: '完成第 1 条烹饪记录' },
  { id: 'collector', name: '菜谱收藏家', icon: BookOpen, target: 5, desc: '收藏 5 道菜谱' },
  { id: 'expert', name: '烹饪达人', icon: Flame, target: 10, desc: '累计完成 10 次烹饪' },
  { id: 'flawless', name: '零失败', icon: Target, target: 3, desc: '完成 3 餐且无翻车，评分均不低于 4 星' },
  { id: 'family-chef', name: '家庭大厨', icon: Crown, target: 20, desc: '累计完成 20 次烹饪' },
  { id: 'streak-7', name: '连续七天', icon: CalendarCheck, target: 7, desc: '最长连续烹饪天数达到 7 天' },
  { id: 'explorer', name: '新菜探索者', icon: Compass, target: 3, desc: '尝试过 3 种不同菜系' },
  { id: 'baker', name: '甜点大师', icon: CakeSlice, target: 3, desc: '完成 3 次烘焙类菜谱' },
  { id: 'shopper', name: '采购有序', icon: ShoppingBasket, target: 2, desc: '完成 2 次菜单采购' },
  { id: 'critic', name: '味觉记录者', icon: NotebookPen, target: 5, desc: '留下 5 条 5 星烹饪记录' },
  { id: 'sharer', name: '分享达人', icon: Users, target: 2, desc: '有 2 位不同的家人下厨' },
  { id: 'captain', name: '厨房领航员', icon: Star, target: 15, desc: '完成 15 次烹饪并尝过 5 种菜系' }
]

// 取去重后的最长连续日期天数（同一天多次烹饪只算 1 天）
export function longestStreak(dates) {
  const days = [...new Set(dates.filter(Boolean))]
    .map((d) => new Date(`${d}T00:00:00`).getTime())
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b)
  let best = 0
  let run = 0
  let prev = null
  for (const t of days) {
    run = prev !== null && t - prev === 86400000 ? run + 1 : 1
    best = Math.max(best, run)
    prev = t
  }
  return best
}

// 从应用状态计算徽章上下文；集合缺失时按空数据处理，保证新用户 / 被清空的数据不报错
export function buildContext(state) {
  const documents = state?.documents ?? []
  const records = state?.usages ?? []
  const menus = state?.policies ?? []
  const recipeOf = (id) => documents.find((d) => d.id === id)
  const done = records.filter((r) => r && r.status === '完成')
  const categories = new Set(done.map((r) => recipeOf(r.documentId)?.category).filter(Boolean))
  const bakes = done.filter((r) => recipeOf(r.documentId)?.category === '烘焙')
  const fiveStars = done.filter((r) => Number(r.score || 0) >= 5)
  const cooks = new Set(done.map((r) => r.borrower?.trim()).filter(Boolean))
  const hasFailure = records.some((r) => r && r.status && r.status !== '完成')
  return {
    total: records.length,
    doneCount: done.length,
    recipeCount: documents.length,
    categoryCount: categories.size,
    bakeCount: bakes.length,
    fiveStarCount: fiveStars.length,
    cookCount: cooks.size,
    purchasedCount: menus.filter((m) => m && m.done).length,
    streak: longestStreak(done.map((r) => r.date)),
    allRatedHigh: done.every((r) => Number(r.score || 0) >= 4),
    hasFailure
  }
}

// 每个徽章独立给出 unlocked 与当前进度，样式、文案均消费这同一个结果
export function evaluateAchievements(state) {
  const ctx = buildContext(state)
  const rules = {
    'first-cook': () => ({ unlocked: ctx.total >= 1, current: Math.min(ctx.total, 1) }),
    collector: () => ({ unlocked: ctx.recipeCount >= 5, current: Math.min(ctx.recipeCount, 5) }),
    expert: () => ({ unlocked: ctx.doneCount >= 10, current: Math.min(ctx.doneCount, 10) }),
    flawless: () => ({
      unlocked: ctx.doneCount >= 3 && !ctx.hasFailure && ctx.allRatedHigh,
      current: Math.min(ctx.doneCount, 3)
    }),
    'family-chef': () => ({ unlocked: ctx.doneCount >= 20, current: Math.min(ctx.doneCount, 20) }),
    'streak-7': () => ({ unlocked: ctx.streak >= 7, current: Math.min(ctx.streak, 7) }),
    explorer: () => ({ unlocked: ctx.categoryCount >= 3, current: Math.min(ctx.categoryCount, 3) }),
    baker: () => ({ unlocked: ctx.bakeCount >= 3, current: Math.min(ctx.bakeCount, 3) }),
    shopper: () => ({ unlocked: ctx.purchasedCount >= 2, current: Math.min(ctx.purchasedCount, 2) }),
    critic: () => ({ unlocked: ctx.fiveStarCount >= 5, current: Math.min(ctx.fiveStarCount, 5) }),
    sharer: () => ({ unlocked: ctx.cookCount >= 2, current: Math.min(ctx.cookCount, 2) }),
    captain: () => ({ unlocked: ctx.doneCount >= 15 && ctx.categoryCount >= 5, current: Math.min(ctx.doneCount, 15) })
  }
  return achievementDefs.map((def) => ({ ...def, ...rules[def.id]() }))
}

// 家庭榜单：按实际完成的烹饪记录聚合，积分 = 烹饪次数与平均评分的综合结果
export function buildRanking(state) {
  const records = state?.usages ?? []
  const map = new Map()
  for (const r of records) {
    if (!r || r.status !== '完成') continue
    const name = r.borrower?.trim() || '匿名家人'
    const row = map.get(name) || { name, count: 0, scoreTotal: 0 }
    row.count += 1
    row.scoreTotal += Number(r.score || 0)
    map.set(name, row)
  }
  return [...map.values()]
    .map((row) => {
      const avg = row.scoreTotal / row.count
      return { name: row.name, count: row.count, avg: avg.toFixed(1), points: Math.min(99, row.count * 8 + Math.round(avg * 10)) }
    })
    .sort((a, b) => b.points - a.points)
}
