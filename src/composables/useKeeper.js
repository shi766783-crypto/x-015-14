import { computed, reactive } from 'vue'
import { createStorage } from '../services/storage'
import { config, emptyState, seed } from '../data'

const storage = createStorage(config.storageKey, seed)
export function useKeeper() {
  const state = reactive(storage.read())
  const persist = () => storage.write(state)
  const add = (collection, item) => { state[collection].unshift({ id: `${collection}-${Date.now()}`, createdAt: new Date().toISOString(), ...item }); persist() }
  const update = (collection, id, patch) => { const item = state[collection].find((entry) => entry.id === id); if (item) Object.assign(item, patch); persist() }
  const remove = (collection, id) => { state[collection] = state[collection].filter((entry) => entry.id !== id); persist() }
  const reset = () => { Object.assign(state, structuredClone(seed)); persist() }
  // 清空为真实的新用户状态；徽章是纯计算结果，数据清空后会自动回退为未解锁
  const clear = () => { Object.assign(state, structuredClone(emptyState)); persist() }
  const metrics = computed(() => config.metrics.map((metric) => ({ ...metric, value: metric.value ? metric.value(state) : state[metric.collection]?.length || 0 })))
  return { state, add, update, remove, reset, clear, persist, metrics }
}
