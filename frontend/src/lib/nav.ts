import type { UserRole } from "../types"

export interface NavItem {
  label: string
  path: string
  roles: UserRole[]
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/app", roles: ["FARMER", "FPO_AGENT", "BUYER", "ASSAYER", "TRANSPORTER", "ADMIN"] },
  { label: "Farmers", path: "/app/farmers", roles: ["FPO_AGENT", "ADMIN"] },
  { label: "Lots", path: "/app/lots", roles: ["FPO_AGENT", "ASSAYER", "ADMIN", "FARMER"] },
  { label: "Marketplace", path: "/app/marketplace", roles: ["BUYER"] },
  { label: "Purchase Orders", path: "/app/purchase-orders", roles: ["FPO_AGENT", "BUYER", "ADMIN"] },
  { label: "Shipments", path: "/app/shipments", roles: ["TRANSPORTER", "FPO_AGENT", "ADMIN"] },
  { label: "Storage & IoT", path: "/app/storage", roles: ["FPO_AGENT", "BUYER", "ADMIN"] },
  { label: "Payments", path: "/app/payments", roles: ["BUYER", "FPO_AGENT", "ADMIN"] },
  { label: "Settlements", path: "/app/settlements", roles: ["FARMER", "FPO_AGENT", "ADMIN"] },
  { label: "Disputes", path: "/app/disputes", roles: ["FPO_AGENT", "BUYER", "ADMIN"] },
  { label: "Analytics", path: "/app/analytics", roles: ["FPO_AGENT", "ADMIN"] },
  { label: "Audit Log", path: "/app/audit-log", roles: ["ADMIN"] },
  { label: "Users", path: "/app/users", roles: ["ADMIN"] },
]

export const ROLE_LABEL: Record<UserRole, string> = {
  FARMER: "Farmer",
  FPO_AGENT: "FPO Agent",
  BUYER: "Buyer",
  ASSAYER: "Assayer",
  TRANSPORTER: "Transporter",
  ADMIN: "Administrator",
}
