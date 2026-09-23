import { expect, test } from "@playwright/test"
import { loginAs } from "./helpers"

test("a farmer can add their own produce as a new lot", async ({ page }) => {
  await loginAs(page, "farmer@annadata.demo")

  await page.getByRole("link", { name: "Lots" }).click()
  await page.getByRole("button", { name: "Add My Produce" }).click()

  await expect(page.getByRole("heading", { name: "Add your produce" })).toBeVisible()
  await page.getByLabel("Quantity (kg) *").fill("180")
  await page.getByRole("button", { name: "Submit produce" }).click()

  const toast = page.getByText(/Lot LOT-\d{4}-\d+ created \(180 kg\)/)
  await expect(toast).toBeVisible()
  const toastText = await toast.textContent()
  const lotCode = toastText?.match(/LOT-\d{4}-\d+/)?.[0]
  if (!lotCode) throw new Error(`Could not extract lot code from toast: ${toastText}`)

  // The new lot should now appear in the farmer's own list, DRAFT status.
  const row = page.getByRole("row", { name: new RegExp(lotCode) })
  await expect(row).toBeVisible()
  await expect(row.getByText("Draft", { exact: false })).toBeVisible()
})

test("a farmer cannot see a Create Lot form for other farmers", async ({ page }) => {
  await loginAs(page, "farmer@annadata.demo")
  await page.getByRole("link", { name: "Lots" }).click()
  await page.getByRole("button", { name: "Add My Produce" }).click()

  // The FPO-agent-only multi-contributor picker must not be present.
  await expect(page.getByText("Farmer contributors")).not.toBeVisible()
})
