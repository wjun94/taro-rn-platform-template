import { useCallback, useEffect, useRef, useState } from 'react'
import Taro from '@tarojs/taro'

type SectionId = 'home-group' | 'home-categories'
type LayoutId = SectionId | 'content'
type NativeScrollHandle = { scrollToOffset: (x: number, y: number) => void }
type LayoutEvent = { nativeEvent: { layout: { y: number } } }

/** 首页滚动按平台定位，RN 不传受控 scrollTop，避免倒计时更新时被拉回旧位置。 */
export function useHomeScroll() {
  const nativeScroll = useRef<NativeScrollHandle | null>(null)
  const positions = useRef<Partial<Record<LayoutId, number>>>({})
  const pendingSection = useRef<SectionId | null>(null)
  const [request, setRequest] = useState<{ id: SectionId } | null>(null)
  const [scrollTarget, setScrollTarget] = useState('')

  /** 等到内容容器与目标区块均完成布局再定位，坐标为零也是有效位置。 */
  const flushNativeScroll = useCallback(() => {
    const id = pendingSection.current
    if (!id || !nativeScroll.current) return
    const contentY = positions.current.content
    const sectionY = positions.current[id]
    if (contentY === undefined || sectionY === undefined) return
    nativeScroll.current.scrollToOffset(0, Math.max(0, contentY + sectionY))
    pendingSection.current = null
  }, [])

  /** Taro 4.2.1 RN ScrollView 暴露 scrollToOffset；绑定前检查实例能力，不访问内部原生 ref。 */
  const bindNativeScroll = useCallback((instance: unknown) => {
    nativeScroll.current = instance && typeof instance === 'object' &&
      'scrollToOffset' in instance && typeof instance.scrollToOffset === 'function'
      ? instance as NativeScrollHandle : null
  }, [])

  useEffect(() => {
    if (!request) return
    if (process.env.TARO_ENV === 'rn') {
      // React 提交筛选结果后在下一帧定位；RN 不调用未实现的 Taro.nextTick。
      pendingSection.current = request.id
      const frame = requestAnimationFrame(flushNativeScroll)
      return () => {
        cancelAnimationFrame(frame)
        pendingSection.current = null
      }
    }

    // 小程序与 H5 等待节点更新；取消过期回调，避免快速切换或卸载后再次滚动。
    let cancelled = false
    Taro.nextTick(() => {
      if (!cancelled) setScrollTarget(request.id)
    })
    return () => { cancelled = true }
  }, [request, flushNativeScroll])

  /** 重复点击同一入口也提交新请求，后一次点击替换前一次未完成的定位。 */
  function scrollTo(id: SectionId) {
    setScrollTarget('')
    setRequest({ id })
  }

  /** RN 区块坐标相对于内容容器，布局回调补齐首次点击时尚未就绪的位置。 */
  function trackPosition(id: LayoutId) {
    return process.env.TARO_ENV === 'rn' ? {
      onLayout: (event: LayoutEvent) => {
        positions.current[id] = event.nativeEvent.layout.y
        flushNativeScroll()
      }
    } : {}
  }

  return {
    scrollTo,
    trackPosition,
    scrollProps: process.env.TARO_ENV === 'rn'
      ? { ref: bindNativeScroll }
      : { scrollIntoView: scrollTarget }
  }
}
