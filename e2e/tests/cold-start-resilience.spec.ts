import { expect, test } from "@playwright/test"
import { DEMO_PASSWORD } from "./helpers"

/**
 * Simulates the exact failure pattern a Render free-tier cold start
 * produces (a connection-level failure with no HTTP response at all) by
 * aborting the first few real requests before letting them through. This
 * exercises the actual bundled retry logic in lib/api.ts in a real
 * browser, deterministically, instead of waiting on a real cold start.
 */
test("login recovers automatically from a simulated cold start instead of showing a dead end", async ({ page }) => {
  let loginAttempts = 0
  await page.route("**/api/auth/login", async (route) => {
    loginAttempts++
    if (loginAttempts <= 2) {
      await route.abort("connectionfailed")
      return
    }
    await route.continue()
  })

  await page.goto("/login")
  await page.getByLabel("Email").fill("admin@annadata.demo")
  await page.getByLabel("Password").fill(DEMO_PASSWORD)
  await page.getByRole("button", { name: "Log in", exact: true }).click()

  // The global "waking up" toast should appear while the interceptor
  // retries silently in the background - the user is never left staring
  // at a bare, unexplained failure.
  await expect(page.getByText(/waking up from idle/i)).toBeVisible({ timeout: 8000 })

  // It should land on the dashboard once the (3rd, simulated-successful)
  // attempt goes through, with no manual retry needed from the user.
  await page.waitForURL("**/app", { timeout: 30_000 })
  await expect(page.getByRole("heading", { name: /Welcome, AnnData Platform Admin/i })).toBeVisible()
  expect(loginAttempts).toBeGreaterThanOrEqual(3)
})

test("a page reload during a cold start does not log the user out", async ({ page }) => {
  // Log in normally first so we have a real, valid session.
  await page.goto("/login")
  await page.getByLabel("Email").fill("farmer@annadata.demo")
  await page.getByLabel("Password").fill(DEMO_PASSWORD)
  await page.getByRole("button", { name: "Log in", exact: true }).click()
  await page.waitForURL("**/app")

  const accessToken = await page.evaluate(() => localStorage.getItem("annadata_access_token"))
  expect(accessToken).toBeTruthy()

  // Now simulate /auth/me failing with a connection-level error on the
  // very first attempt after a reload - exactly what a cold-starting
  // backend looks like to the browser - before letting it through.
  let meAttempts = 0
  await page.route("**/api/auth/me", async (route) => {
    meAttempts++
    if (meAttempts === 1) {
      await route.abort("connectionfailed")
      return
    }
    await route.continue()
  })

  await page.reload()

  // The session must survive: the user lands back on their dashboard,
  // not bounced to /login, and the stored tokens were never wiped.
  await page.waitForURL("**/app", { timeout: 30_000 })
  const tokenAfter = await page.evaluate(() => localStorage.getItem("annadata_access_token"))
  expect(tokenAfter).toBe(accessToken)
})
