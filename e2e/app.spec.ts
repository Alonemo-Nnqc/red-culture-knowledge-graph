import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('可检索、查看史实来源并切换路线', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '上海红色文化知识图谱' })).toBeVisible()
  await expect(page.getByTestId('graph-canvas').locator('canvas').first()).toBeAttached()
  await page.getByRole('searchbox', { name: '搜索节点' }).fill('周恩来')
  await page.getByRole('region', { name: '搜索结果' }).getByRole('button', { name: '查看周恩来', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '周恩来详情' })).toContainText('来源与证据')
  await page.keyboard.press('Escape')
  await page.getByRole('tab', { name: '研学路线' }).click()
  await expect(page.getByTestId('route-stop')).toHaveCount(3)
})

test('数据可下载且页面无严重无障碍问题', async ({ page }) => {
  await page.goto('/?view=data')
  await expect(page.getByRole('link', { name: /下载 graph.json/ })).toBeVisible()
  const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze()
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([])
})

test('手机视口没有横向溢出', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), '仅在手机项目运行')
  await page.goto('/')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(overflow).toBe(false)
})

test('Mac 触控板双指横纵平移，Control 与 Command 手势缩放', async ({ page }) => {
  await page.goto('/')
  const canvas = page.getByTestId('graph-canvas')
  await expect(canvas.locator('canvas').first()).toBeAttached()
  await expect(canvas).toHaveAttribute('data-pan-x', /-?\d/)
  await expect(canvas).toHaveAttribute('data-pan-y', /-?\d/)
  await expect(canvas).toHaveAttribute('data-zoom', /\d/)
  await expect(page.getByText(/双指平移.+⌘\/Ctrl.+双指缩放.+点击查看史实/)).toBeVisible()
  await expect(page.getByRole('button', { name: '放大图谱' })).toBeVisible()
  await expect(page.getByRole('button', { name: '缩小图谱' })).toBeVisible()
  await expect(page.getByRole('button', { name: '适配完整图谱' })).toBeVisible()

  const initialPanX = Number(await canvas.getAttribute('data-pan-x'))
  const initialPanY = Number(await canvas.getAttribute('data-pan-y'))
  const initialZoom = Number(await canvas.getAttribute('data-zoom'))
  const horizontalPrevented = await canvas.evaluate((element) => {
    const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaX: 72, deltaY: 0, deltaMode: WheelEvent.DOM_DELTA_PIXEL })
    element.dispatchEvent(event)
    return event.defaultPrevented
  })
  expect(horizontalPrevented).toBe(true)
  await expect.poll(async () => Number(await canvas.getAttribute('data-pan-x'))).not.toBe(initialPanX)
  expect(Number(await canvas.getAttribute('data-pan-y'))).toBeCloseTo(initialPanY, 4)
  expect(Number(await canvas.getAttribute('data-zoom'))).toBeCloseTo(initialZoom, 4)

  const afterHorizontalPanY = Number(await canvas.getAttribute('data-pan-y'))
  await canvas.dispatchEvent('wheel', { deltaX: 0, deltaY: 36, deltaMode: 0, ctrlKey: false, metaKey: false, clientX: 420, clientY: 400 })
  await expect.poll(async () => Number(await canvas.getAttribute('data-pan-y'))).not.toBe(afterHorizontalPanY)
  expect(Number(await canvas.getAttribute('data-zoom'))).toBeCloseTo(initialZoom, 4)

  await canvas.dispatchEvent('wheel', { deltaX: 0, deltaY: -80, deltaMode: 0, ctrlKey: true, metaKey: false, clientX: 420, clientY: 400 })
  await expect.poll(async () => Number(await canvas.getAttribute('data-zoom'))).toBeGreaterThan(initialZoom)
  const afterControlZoom = Number(await canvas.getAttribute('data-zoom'))
  await canvas.dispatchEvent('wheel', { deltaX: 0, deltaY: 80, deltaMode: 0, ctrlKey: false, metaKey: true, clientX: 420, clientY: 400 })
  await expect.poll(async () => Number(await canvas.getAttribute('data-zoom'))).toBeLessThan(afterControlZoom)
})

test('研学路线逐站跳转后目标地点居中放大、提示并保留深链', async ({ page }) => {
  await page.goto('/')
  const fittedCanvas = page.getByTestId('graph-canvas')
  await expect(fittedCanvas.locator('canvas').first()).toBeAttached()
  await expect.poll(async () => [
    await fittedCanvas.getAttribute('data-pan-x'),
    await fittedCanvas.getAttribute('data-pan-y'),
    await fittedCanvas.getAttribute('data-zoom'),
  ].join('|')).not.toBe('0|0|1')
  const fittedPan = {
    x: Number(await fittedCanvas.getAttribute('data-pan-x')),
    y: Number(await fittedCanvas.getAttribute('data-pan-y')),
  }
  await page.getByRole('tab', { name: '研学路线' }).click()
  const destinations = [
    { id: 'PLC-001', routeName: '中共一大纪念馆', canonicalName: '中共一大纪念馆' },
    { id: 'PLC-003', routeName: '周公馆', canonicalName: '中国共产党代表团驻沪办事处旧址' },
    { id: 'PLC-004', routeName: '龙华烈士陵园', canonicalName: '上海市龙华烈士陵园' },
  ]

  for (const destination of destinations) {
    const routeCard = page.getByTestId('route-stop').filter({ has: page.getByRole('heading', { name: destination.routeName, exact: true }) })
    const openButton = routeCard.getByRole('button', { name: '在图谱中查看' })
    if (destination === destinations[0]) {
      await openButton.focus()
      await expect(openButton).toBeFocused()
      await page.keyboard.press('Enter')
    } else {
      await openButton.click()
    }

    const canvas = page.getByTestId('graph-canvas')
    await expect(page.getByRole('tab', { name: '知识图谱' })).toHaveAttribute('aria-selected', 'true')
    await expect(canvas).toHaveAttribute('data-focused-node', destination.id)
    await expect.poll(async () => Number(await canvas.getAttribute('data-zoom'))).toBeGreaterThanOrEqual(1.44)
    await expect.poll(async () => {
      const panX = Number(await canvas.getAttribute('data-pan-x'))
      const panY = Number(await canvas.getAttribute('data-pan-y'))
      return Math.hypot(panX - fittedPan.x, panY - fittedPan.y)
    }).toBeGreaterThan(1)
    await expect(page.getByRole('status', { name: `已定位${destination.canonicalName}` })).toContainText(`已定位 · ${destination.canonicalName}`)
    await expect(page.getByRole('dialog', { name: `${destination.canonicalName}详情` })).toBeVisible()
    await expect(page.getByRole('region', { name: '知识图谱探索器' })).toBeFocused()
    await expect(page).toHaveURL(new RegExp(`[?&]node=${destination.id}(?:&|$)`))
    expect(new URL(page.url()).searchParams.has('view')).toBe(false)

    await page.reload()
    await expect(page.getByTestId('graph-canvas')).toHaveAttribute('data-focused-node', destination.id)
    await expect(page.getByRole('status', { name: `已定位${destination.canonicalName}` })).toBeVisible()

    if (destination !== destinations.at(-1)) {
      await page.getByRole('tab', { name: '研学路线' }).click()
    }
  }
})
