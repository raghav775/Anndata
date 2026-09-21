import { expect, test } from "@playwright/test"
import { loginAs } from "./helpers"

const MOBILE_VIEWPORT = { width: 375, height: 812 }

test.describe("mobile viewport (375px)", () => {
  test.use({ viewport: MOBILE_VIEWPORT })

  test("landing page has no horizontal overflow", async ({ page }) => {
    await page.goto("/")
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    expect(hasOverflow).toBe(false)
  })

  test("login page has no horizontal overflow", async ({ page }) => {
    await page.goto("/login")
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    expect(hasOverflow).toBe(false)
  })

  test("farmer dashboard and nav menu work on mobile", async ({ page }) => {
    await loginAs(page, "farmer@annadata.demo")
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    expect(hasOverflow).toBe(false)

    // The sidebar nav should be reachable via the mobile menu toggle.
    await page.getByRole("button", { name: "Open navigation menu" }).click()
    await expect(page.getByRole("link", { name: "Settlements" })).toBeVisible()
  })

  test("FPO dashboard with data tables has no horizontal overflow", async ({ page }) => {
    await loginAs(page, "fpo@annadata.demo")
    await page.goto("/app/lots")
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    expect(hasOverflow).toBe(false)
  })
})
