export type WheelGesture = 'pan' | 'zoom'

export function classifyWheelGesture(event: Pick<WheelEvent, 'ctrlKey' | 'metaKey'>): WheelGesture {
  return event.ctrlKey || event.metaKey ? 'zoom' : 'pan'
}

export function normalizeWheelDelta(delta: number, deltaMode: number): number {
  if (deltaMode === WheelEvent.DOM_DELTA_LINE) return delta * 16
  if (deltaMode === WheelEvent.DOM_DELTA_PAGE) return delta * 800
  return delta
}

export function nextTrackpadZoom(current: number, deltaY: number, min: number, max: number): number {
  const next = current * Math.exp(-deltaY * 0.0025)
  return Math.min(max, Math.max(min, next))
}
