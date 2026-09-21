import {
  BarChart3,
  ClipboardList,
  FileText,
  Gavel,
  LayoutGrid,
  ScrollText,
  ShieldCheck,
  Sprout,
  Store,
  Truck,
  Users,
  Wallet,
  Warehouse,
} from "lucide-react"
import type { UserRole } from "../types"

export interface NavItem {
  labelKey: string
  path: string
  roles: UserRole[]
  icon: React.ComponentType<{ className?: string }>
}

export const NAV_ITEMS: NavItem[] = [
  { labelKey: "nav.dashboard", path: "/app", roles: ["FARMER", "FPO_AGENT", "BUYER", "ASSAYER", "TRANSPORTER", "ADMIN"], icon: LayoutGrid },
  { labelKey: "nav.farmers", path: "/app/farmers", roles: ["FPO_AGENT", "ADMIN"], icon: Users },
  { labelKey: "nav.lots", path: "/app/lots", roles: ["FPO_AGENT", "ASSAYER", "ADMIN", "FARMER"], icon: Sprout },
  { labelKey: "nav.marketplace", path: "/app/marketplace", roles: ["BUYER"], icon: Store },
  { labelKey: "nav.purchaseOrders", path: "/app/purchase-orders", roles: ["FPO_AGENT", "BUYER", "ADMIN"], icon: FileText },
  { labelKey: "nav.shipments", path: "/app/shipments", roles: ["TRANSPORTER", "FPO_AGENT", "ADMIN"], icon: Truck },
  { labelKey: "nav.storage", path: "/app/storage", roles: ["FPO_AGENT", "BUYER", "ADMIN"], icon: Warehouse },
  { labelKey: "nav.payments", path: "/app/payments", roles: ["BUYER", "FPO_AGENT", "ADMIN"], icon: Wallet },
  { labelKey: "nav.settlements", path: "/app/settlements", roles: ["FARMER", "FPO_AGENT", "ADMIN"], icon: ClipboardList },
  { labelKey: "nav.disputes", path: "/app/disputes", roles: ["FPO_AGENT", "BUYER", "ADMIN"], icon: Gavel },
  { labelKey: "nav.analytics", path: "/app/analytics", roles: ["FPO_AGENT", "ADMIN"], icon: BarChart3 },
  { labelKey: "nav.auditLog", path: "/app/audit-log", roles: ["ADMIN"], icon: ScrollText },
  { labelKey: "nav.users", path: "/app/users", roles: ["ADMIN"], icon: ShieldCheck },
]

export const ROLE_LABEL_KEY: Record<UserRole, string> = {
  FARMER: "role.FARMER",
  FPO_AGENT: "role.FPO_AGENT",
  BUYER: "role.BUYER",
  ASSAYER: "role.ASSAYER",
  TRANSPORTER: "role.TRANSPORTER",
  ADMIN: "role.ADMIN",
}
