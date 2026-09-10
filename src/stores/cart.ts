import { create } from 'zustand'

interface CartStore {
  /** 按商品 ID 保存数量，多个页面可订阅同一份购物车。 */
  quantities: Record<string, number>
  addItem: (productId: string) => void
  changeQuantity: (productId: string, amount: 1 | -1) => void
}

/** Zustand 简单示例：状态与操作集中管理；仅在内存中保存，重启应用后清空。 */
export const useCartStore = create<CartStore>()((set) => ({
  quantities: {},

  /** 加购时合并同一商品，通过函数式更新读取最新数量。 */
  addItem: (productId) => set((state) => ({
    quantities: {
      ...state.quantities,
      [productId]: (state.quantities[productId] || 0) + 1
    }
  })),

  /** 每次增减一件，减到零时移除商品，避免购物车保留零数量记录。 */
  changeQuantity: (productId, amount) => set((state) => {
    const current = state.quantities[productId] || 0
    const next = Math.max(0, current + amount)
    if (next === current) return state

    const quantities = { ...state.quantities }
    if (next === 0) {
      delete quantities[productId]
    } else {
      quantities[productId] = next
    }
    return { quantities }
  })
}))
