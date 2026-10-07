// 成就徽章规则：全部基于真实烹饪行为数据（烹饪记录、菜系、连续天数、评分等）计算。
// 解锁状态不持久化，每次从当前数据实时推导 —— 数据被清空或回退时徽章会自动回到未解锁。
export function buildStats(state) {
  const documents = Array.isArray(state.documents) ? state.documents : []
  const usages = Array.isArray(state.usages) ? state.usages : []
  const policies = Array.isArray(state.policies) ? state.policies : []
  const byId = new Map(documents.map((doc) => [doc.id, doc]))
  const cookedRecipes = usages.map((entry) => byId.get(entry.documentId)).filter(Boolean)
  const scores = usages.map((entry) => Number(entry.score)).filter((n) => Number.isFinite(n) && n > 0)
  const cookDays = [...new Set(usages.map((entry) => entry.date).filter(Boolean))].sort()
  let maxStreak = 0
  let current = 0
  let previous = null
  for (const day of cookDays) {
    const time = new Date(`${day}T00:00:00`).getTime()
    if (Number.isNaN(time)) continue
    current = previous !== null && time - previous === 86400000 ? current + 1 : 1
    maxStreak = Math.max(maxStreak, current)
    previous = time
  }
  return {
    recipes: documents.length,
    cooks: usages.length,
    scored: scores.length,
    distinctRecipes: new Set(usages.map((entry) => entry.documentId)).size,
    cuisines: new Set(cookedRecipes.map((doc) => doc.category).filter(Boolean)).size,
    dessertCooks: cookedRecipes.filter((doc) => doc.category === '烘焙').length,
    maxStreak,
    avgScore: scores.length ? scores.reduce((sum, n) => sum + n, 0) / scores.length : 0,
    minScore: scores.length ? Math.min(...scores) : 0,
    noted: usages.filter((entry) => entry.note && entry.note.trim()).length,
    members: new Set(usages.map((entry) => entry.borrower).filter(Boolean)).size,
    shoppingDone: policies.filter((item) => item.done).length,
    shoppingTotal: policies.length,
  }
}

export const achievementDefs = [
  { id: 'first-cook', name: '初次下厨', desc: '完成 1 次烹饪记录', test: (s) => s.cooks >= 1 },
  { id: 'collector', name: '菜谱收藏家', desc: '收藏 5 份菜谱', test: (s) => s.recipes >= 5 },
  { id: 'cook-10', name: '烹饪达人', desc: '累计烹饪 10 次', test: (s) => s.cooks >= 10 },
  { id: 'no-fail', name: '零失败', desc: '3 次以上烹饪且评分全部 4 星及以上', test: (s) => s.cooks >= 3 && s.scored === s.cooks && s.minScore >= 4 },
  { id: 'family-chef', name: '家庭大厨', desc: '烹饪过 5 道不同菜谱', test: (s) => s.distinctRecipes >= 5 },
  { id: 'streak-7', name: '连续七天', desc: '连续 7 天都有烹饪记录', test: (s) => s.maxStreak >= 7 },
  { id: 'explorer', name: '新菜探索者', desc: '尝试过 3 个不同菜系', test: (s) => s.cuisines >= 3 },
  { id: 'dessert', name: '甜点大师', desc: '完成 2 次烘焙类烹饪', test: (s) => s.dessertCooks >= 2 },
  { id: 'shopping', name: '采购有序', desc: '本周采购清单全部完成', test: (s) => s.shoppingTotal > 0 && s.shoppingDone === s.shoppingTotal },
  { id: 'taste-notes', name: '味觉记录者', desc: '写下 5 条烹饪心得', test: (s) => s.noted >= 5 },
  { id: 'sharing', name: '分享达人', desc: '3 位家庭成员参与烹饪', test: (s) => s.members >= 3 },
  { id: 'navigator', name: '厨房领航员', desc: '5 次以上烹饪且平均评分 4.5+', test: (s) => s.cooks >= 5 && s.avgScore >= 4.5 },
]
