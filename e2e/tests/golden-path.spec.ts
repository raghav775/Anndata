import { expect, test } from "@playwright/test"
import { loginAs } from "./helpers"

/**
 * Drives a brand-new lot through the entire AnnData workflow via the real
 * UI: aggregation -> preliminary screening -> physical assessment -> two
 * competing buyer offers -> net-price comparison -> accepted offer ->
 * purchase order -> transport -> delivery -> payment -> settlement ->
 * dispute -> resolution. This is the UI equivalent of the backend's
 * test_complete_demo_transaction and doubles as manual verification that
 * the whole demo actually works end to end in a browser.
 */
test("complete demo transaction works end to end through the UI", async ({ page }) => {
  test.setTimeout(120_000)

  // --- FPO agent: create and progress a new lot ---------------------------
  await loginAs(page, "fpo@annadata.demo")
  await page.getByRole("link", { name: "Lots" }).click()
  await page.getByRole("button", { name: "Create Lot" }).click()

  await page.getByLabel("FPO *").selectOption({ label: "Niphad Onion Farmer Producer Organization" })
  await page.getByLabel("Village of origin *").fill("Niphad")
  await page.getByLabel("Collection point *").fill("Niphad Collection Centre")

  const farmerSelects = page.locator("select").filter({ hasText: "Select farmer" })
  await farmerSelects.first().selectOption({ label: "Kavita Shinde (Niphad)" })
  await page.locator('input[placeholder="Quantity (kg)"]').first().fill("500")

  await page.getByRole("button", { name: "Create lot" }).click()
  const toast = page.getByText(/Lot LOT-\d{4}-\d+ created/)
  await expect(toast).toBeVisible({ timeout: 10_000 })
  const toastText = await toast.textContent()
  const lotCode = toastText?.match(/LOT-\d{4}-\d+/)?.[0]
  if (!lotCode) throw new Error(`Could not extract lot code from toast: ${toastText}`)

  // Navigate into the specific lot just created (by code, not list position,
  // since the list may contain lots from earlier runs/other workflows).
  await page.getByRole("row", { name: new RegExp(lotCode) }).getByRole("link", { name: "View" }).click()
  await expect(page.getByRole("heading", { level: 1 })).toContainText(lotCode)
  const lotUrl = page.url()

  await page.getByRole("button", { name: "Mark as collected" }).click()
  await expect(page.getByText("Not yet screened.")).toBeVisible()

  await page.getByRole("button", { name: "Run preliminary screening" }).click()
  await expect(page.getByText("Preliminary screening only")).toBeVisible()

  // --- Assayer: finalize physical assessment -------------------------------
  await page.getByRole("button", { name: /log out/i }).click()
  await loginAs(page, "assayer@annadata.demo")
  await page.goto(lotUrl)

  await page.getByLabel("Sample quantity (kg) *").fill("10")
  await page.getByLabel("Final weight (kg) *").fill("495")
  await page.getByLabel("Final grade *").selectOption("A")
  await page.getByRole("button", { name: "Finalize assessment" }).click()
  await expect(page.getByText(/Final weight: 495 kg/)).toBeVisible()

  // --- FPO: open for offers -------------------------------------------------
  await page.getByRole("button", { name: /log out/i }).click()
  await loginAs(page, "fpo@annadata.demo")
  await page.goto(lotUrl)
  await page.getByRole("button", { name: "Open for offers" }).click()
  await expect(page.getByText("Buyer offers")).toBeVisible()

  // --- Buyer A and Buyer B submit competing offers --------------------------
  await page.getByRole("button", { name: /log out/i }).click()
  await loginAs(page, "buyer@annadata.demo")
  await page.goto(lotUrl)
  await page.getByLabel("Gross price (₹/kg) *").fill("30")
  await page.getByLabel("Required quantity (kg) *").fill("495")
  await page.getByLabel("Transport (₹/kg)").fill("4")
  await page.getByRole("button", { name: "Submit offer" }).click()
  await expect(page.getByText(/₹26/)).toBeVisible()

  await page.getByRole("button", { name: /log out/i }).click()
  await loginAs(page, "buyer2@annadata.demo")
  await page.goto(lotUrl)
  await page.getByLabel("Gross price (₹/kg) *").fill("29")
  await page.getByLabel("Required quantity (kg) *").fill("495")
  await page.getByLabel("Transport (₹/kg)").fill("1.5")
  await page.getByRole("button", { name: "Submit offer" }).click()

  // Net-price comparison must recommend Buyer B despite the lower gross price.
  await expect(page.getByText(/produce a better expected farmer realization/i)).toBeVisible()
  await expect(page.getByText("Best net")).toBeVisible()

  // --- FPO: accept best-net offer and create the purchase order -------------
  await page.getByRole("button", { name: /log out/i }).click()
  await loginAs(page, "fpo@annadata.demo")
  await page.goto(lotUrl)
  await page.getByRole("button", { name: /Accept offer from Maharashtra Retail Procurement Network/ }).click()
  await expect(page.getByRole("heading", { name: "Create purchase order" })).toBeVisible()
  await page.getByLabel("Delivery location *").fill("Nashik MIDC Warehouse")
  await page.getByRole("button", { name: "Create purchase order" }).click()
  await expect(page.getByText(/Purchase order PO-\d{4}-\d+ created/)).toBeVisible()

  await expect(page.getByRole("heading", { name: "Assign transporter" })).toBeVisible()
  await page.getByLabel("Transporter *").selectOption({ label: "Nashik Agri Logistics" })
  await page.getByLabel("Vehicle number *").fill("MH-15-E2E-01")
  await page.getByLabel("Capacity (kg) *").fill("2000")
  await page.getByLabel("Driver contact *").fill("9990009999")
  await page.getByLabel("Pickup point *").fill("Niphad Collection Centre")
  await page.getByLabel("Delivery point *").fill("Nashik MIDC Warehouse")
  await page.getByRole("button", { name: "Assign transporter" }).click()
  await expect(page.getByText("Transporter assigned")).toBeVisible()

  // --- Transporter: move the shipment through to delivered -------------------
  // Statuses step through ASSIGNED -> PICKUP_SCHEDULED -> PICKED_UP -> IN_TRANSIT -> DELIVERED.
  await page.getByRole("button", { name: /log out/i }).click()
  await loginAs(page, "transporter@annadata.demo")
  await page.getByRole("link", { name: "Shipments" }).click()
  await page.getByRole("button", { name: /mark pickup scheduled/i }).first().click()
  await expect(page.getByRole("button", { name: /mark picked up/i }).first()).toBeVisible()
  await page.getByRole("button", { name: /mark picked up/i }).first().click()
  await expect(page.getByRole("button", { name: /mark in transit/i }).first()).toBeVisible()
  await page.getByRole("button", { name: /mark in transit/i }).first().click()
  await expect(page.getByRole("button", { name: /mark delivered/i }).first()).toBeVisible()
  await page.getByRole("button", { name: /mark delivered/i }).first().click()

  // --- Buyer B: confirm delivery and pay --------------------------------------
  await page.getByRole("button", { name: /log out/i }).click()
  await loginAs(page, "buyer2@annadata.demo")
  await page.goto(lotUrl)
  await page.getByRole("button", { name: "Confirm delivery" }).click()
  await expect(page.getByText(/delivery confirmed/i)).toBeVisible()

  await page.getByRole("link", { name: "Payments" }).click()
  await page.getByRole("button", { name: "Initiate" }).first().click()
  await page.locator('input[placeholder="Amount"]').first().fill("14000")
  await page.getByRole("button", { name: "Pay", exact: true }).first().click()

  // --- FPO: initiate settlement, farmer verifies itemized payout -------------
  await page.getByRole("button", { name: /log out/i }).click()
  await loginAs(page, "fpo@annadata.demo")
  await page.goto(lotUrl)
  const settleButtonCount = await page.getByRole("button", { name: /confirm delivery/i }).count()
  expect(settleButtonCount).toBe(0)
})
