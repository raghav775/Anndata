import type { Page } from "@playwright/test"

export const DEMO_PASSWORD = "Demo@123"

export async function loginAs(page: Page, email: string) {
  await page.goto("/login")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(DEMO_PASSWORD)
  await page.getByRole("button", { name: "Log in", exact: true }).click()
  await page.waitForURL("**/app")
}
