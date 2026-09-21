import { useAuth } from "../../context/AuthContext"
import { AdminDashboard } from "./AdminDashboard"
import { AssayerDashboard } from "./AssayerDashboard"
import { BuyerDashboard } from "./BuyerDashboard"
import { FarmerDashboard } from "./FarmerDashboard"
import { FPODashboard } from "./FPODashboard"
import { TransporterDashboard } from "./TransporterDashboard"

export function DashboardRouter() {
  const { user } = useAuth()
  switch (user?.role) {
    case "FARMER":
      return <FarmerDashboard />
    case "FPO_AGENT":
      return <FPODashboard />
    case "BUYER":
      return <BuyerDashboard />
    case "ASSAYER":
      return <AssayerDashboard />
    case "TRANSPORTER":
      return <TransporterDashboard />
    case "ADMIN":
      return <AdminDashboard />
    default:
      return null
  }
}
