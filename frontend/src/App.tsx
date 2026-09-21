import { useEffect } from "react"
import { Route, Routes } from "react-router-dom"
import { AppShell } from "./components/layout/AppShell"
import { ProtectedRoute } from "./components/layout/ProtectedRoute"
import { api } from "./lib/api"
import { AnalyticsPage } from "./pages/AnalyticsPage"
import { AuditLogPage } from "./pages/AuditLogPage"
import { DashboardRouter } from "./pages/dashboards/DashboardRouter"
import { DisputeDetailPage } from "./pages/DisputeDetailPage"
import { DisputesPage } from "./pages/DisputesPage"
import { FarmersPage } from "./pages/FarmersPage"
import { LandingPage } from "./pages/LandingPage"
import { LotDetailPage } from "./pages/LotDetailPage"
import { LotsPage } from "./pages/LotsPage"
import { LoginPage } from "./pages/LoginPage"
import { MarketplacePage } from "./pages/MarketplacePage"
import { NotFoundPage } from "./pages/NotFoundPage"
import { PaymentsPage } from "./pages/PaymentsPage"
import { PurchaseOrderDetailPage } from "./pages/PurchaseOrderDetailPage"
import { PurchaseOrdersPage } from "./pages/PurchaseOrdersPage"
import { SettlementsPage } from "./pages/SettlementsPage"
import { ShipmentsPage } from "./pages/ShipmentsPage"
import { StoragePage } from "./pages/StoragePage"
import { UsersPage } from "./pages/UsersPage"

function App() {
  useEffect(() => {
    // Best-effort warm-up: free-tier hosts (e.g. Render) spin down when
    // idle, so ping the backend as early as page load rather than waiting
    // for the user's first real request (typically login) to trigger it.
    api.get("/health").catch(() => {})
  }, [])

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/app" element={<DashboardRouter />} />
          <Route path="/app/farmers" element={<ProtectedRoute allowedRoles={["FPO_AGENT", "ADMIN"]} />}>
            <Route index element={<FarmersPage />} />
          </Route>
          <Route path="/app/lots" element={<LotsPage />} />
          <Route path="/app/lots/:lotId" element={<LotDetailPage />} />
          <Route path="/app/marketplace" element={<ProtectedRoute allowedRoles={["BUYER"]} />}>
            <Route index element={<MarketplacePage />} />
          </Route>
          <Route path="/app/purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="/app/purchase-orders/:poId" element={<PurchaseOrderDetailPage />} />
          <Route path="/app/shipments" element={<ShipmentsPage />} />
          <Route path="/app/storage" element={<StoragePage />} />
          <Route path="/app/payments" element={<PaymentsPage />} />
          <Route path="/app/settlements" element={<SettlementsPage />} />
          <Route path="/app/disputes" element={<DisputesPage />} />
          <Route path="/app/disputes/:disputeId" element={<DisputeDetailPage />} />
          <Route path="/app/analytics" element={<ProtectedRoute allowedRoles={["FPO_AGENT", "ADMIN"]} />}>
            <Route index element={<AnalyticsPage />} />
          </Route>
          <Route path="/app/audit-log" element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
            <Route index element={<AuditLogPage />} />
          </Route>
          <Route path="/app/users" element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
            <Route index element={<UsersPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
