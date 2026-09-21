import { expect, test } from "@playwright/test"
import { loginAs } from "./helpers"

test("landing page shows the core pitch without exaggerated claims", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "Transparent farm-to-buyer transactions." })).toBeVisible()
  await expect(page.getByText(/does not guarantee prices/i)).toBeVisible()
  await expect(page.getByText("Net realizable price, not gross price")).toBeVisible()
})

test("login page shows demo accounts and logs in successfully", async ({ page }) => {
  await page.goto("/login")
  await expect(page.getByText("Demo accounts")).toBeVisible()
  await loginAs(page, "admin@annadata.demo")
  await expect(page).toHaveURL(/\/app$/)
  await expect(page.getByRole("heading", { name: /Welcome, AnnData Platform Admin/i })).toBeVisible()
})

test("invalid password shows an error and does not navigate", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("Email").fill("admin@annadata.demo")
  await page.getByLabel("Password").fill("wrong-password")
  await page.getByRole("button", { name: "Log in", exact: true }).click()
  await expect(page.getByRole("alert")).toContainText(/invalid/i)
  await expect(page).toHaveURL(/\/login$/)
})

test("unauthenticated visit to a protected route redirects to login", async ({ page }) => {
  await page.goto("/app/lots")
  await expect(page).toHaveURL(/\/login$/)
})

test("each demo role lands on a working dashboard with no console errors", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (err) => errors.push(err.message))
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text())
  })

  const roles = [
    "farmer@annadata.demo",
    "fpo@annadata.demo",
    "buyer@annadata.demo",
    "assayer@annadata.demo",
    "transporter@annadata.demo",
    "admin@annadata.demo",
  ]

  for (const email of roles) {
    await loginAs(page, email)
    await expect(page.locator("main")).toBeVisible()
    await page.getByRole("button", { name: /log out/i }).click()
    await page.waitForURL("**/login")
  }

  expect(errors, `Console/page errors seen: ${errors.join(" | ")}`).toEqual([])
})
