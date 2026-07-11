import { describe, expect, it } from 'vitest'
import { classifyWheelGesture, nextTrackpadZoom, normalizeWheelDelta } from './graphGestures'

describe('Mac 触控板图谱手势', () => {
  it('普通双指滚动映射为平移', () => {
    expect(classifyWheelGesture({ ctrlKey: false, metaKey: false })).toBe('pan')
  })

  it('捏合或按住 Command/Control 时映射为缩放', () => {
    expect(classifyWheelGesture({ ctrlKey: true, metaKey: false })).toBe('zoom')
    expect(classifyWheelGesture({ ctrlKey: false, metaKey: true })).toBe('zoom')
    expect(classifyWheelGesture({ ctrlKey: true, metaKey: true })).toBe('zoom')
  })

  it('保留像素位移方向，并按行和页面模式规范化位移', () => {
    expect(normalizeWheelDelta(-24, WheelEvent.DOM_DELTA_PIXEL)).toBe(-24)
    expect(normalizeWheelDelta(2, 1)).toBe(32)
    expect(normalizeWheelDelta(2, 2)).toBe(1600)
  })

  it('向上手势放大、向下手势缩小，并限制缩放范围', () => {
    expect(nextTrackpadZoom(1, -100, 0.4, 2.2)).toBeGreaterThan(1)
    expect(nextTrackpadZoom(1, 100, 0.4, 2.2)).toBeLessThan(1)
    expect(nextTrackpadZoom(1, 0, 0.4, 2.2)).toBe(1)
    expect(nextTrackpadZoom(2.2, -1000, 0.4, 2.2)).toBe(2.2)
    expect(nextTrackpadZoom(0.4, 1000, 0.4, 2.2)).toBe(0.4)
  })
})
