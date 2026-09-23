import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "../lib/api"
import type {
  AssayerProfile,
  AuditLogEntry,
  BuyerProfile,
  Dispute,
  FarmerProfile,
  FPODashboard,
  FPOOrganization,
  Lot,
  OfferComparison,
  Payment,
  PurchaseOrder,
  QualityAssessment,
  Screening,
  Settlement,
  Shipment,
  StorageEvent,
  StorageFacility,
  TransporterProfile,
  Analytics,
  User,
} from "../types"

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => (await api.get<User[]>("/users")).data,
  })
}

export function useLots(statusFilter?: string) {
  return useQuery({
    queryKey: ["lots", statusFilter ?? "all"],
    queryFn: async () => (await api.get<Lot[]>("/lots", { params: statusFilter ? { status_filter: statusFilter } : {} })).data,
  })
}

export function useLot(lotId: number | undefined) {
  return useQuery({
    queryKey: ["lots", lotId],
    queryFn: async () => (await api.get<Lot>(`/lots/${lotId}`)).data,
    enabled: !!lotId,
  })
}

export function useScreening(lotId: number | undefined) {
  return useQuery({
    queryKey: ["lots", lotId, "screening"],
    queryFn: async () => (await api.get<Screening>(`/lots/${lotId}/screening`)).data,
    enabled: !!lotId,
    retry: false,
  })
}

export function useAssessment(lotId: number | undefined) {
  return useQuery({
    queryKey: ["lots", lotId, "assessment"],
    queryFn: async () => (await api.get<QualityAssessment>(`/lots/${lotId}/assessment`)).data,
    enabled: !!lotId,
    retry: false,
  })
}

export function useFarmers(fpoId?: number) {
  return useQuery({
    queryKey: ["farmers", fpoId],
    queryFn: async () => (await api.get<FarmerProfile[]>("/farmers", { params: fpoId ? { fpo_id: fpoId } : {} })).data,
  })
}

export function useMyFarmerProfile(enabled: boolean) {
  return useQuery({
    queryKey: ["farmers", "me"],
    queryFn: async () => (await api.get<FarmerProfile>("/farmers/me")).data,
    enabled,
  })
}

export function useFPOs() {
  return useQuery({
    queryKey: ["fpos"],
    queryFn: async () => (await api.get<FPOOrganization[]>("/fpos")).data,
  })
}

export function useFPODashboard(fpoId: number | undefined) {
  return useQuery({
    queryKey: ["fpo-dashboard", fpoId],
    queryFn: async () => (await api.get<FPODashboard>(`/fpos/${fpoId}/dashboard`)).data,
    enabled: !!fpoId,
    refetchInterval: 30000,
  })
}

export function useBuyers(verifiedOnly = false) {
  return useQuery({
    queryKey: ["buyers", verifiedOnly],
    queryFn: async () => (await api.get<BuyerProfile[]>("/buyers", { params: { verified_only: verifiedOnly } })).data,
  })
}

export function useAssayers() {
  return useQuery({
    queryKey: ["assayers"],
    queryFn: async () => (await api.get<AssayerProfile[]>("/assayers")).data,
  })
}

export function useTransporters() {
  return useQuery({
    queryKey: ["transporters"],
    queryFn: async () => (await api.get<TransporterProfile[]>("/transporters")).data,
  })
}

export function useOfferComparison(lotId: number | undefined) {
  return useQuery({
    queryKey: ["offers", "lot", lotId],
    queryFn: async () => (await api.get<OfferComparison>(`/offers/lot/${lotId}`)).data,
    enabled: !!lotId,
  })
}

export function usePurchaseOrders() {
  return useQuery({
    queryKey: ["purchase-orders"],
    queryFn: async () => (await api.get<PurchaseOrder[]>("/purchase-orders")).data,
  })
}

export function usePurchaseOrder(id: number | undefined) {
  return useQuery({
    queryKey: ["purchase-orders", id],
    queryFn: async () => (await api.get<PurchaseOrder>(`/purchase-orders/${id}`)).data,
    enabled: !!id,
  })
}

export function useShipments() {
  return useQuery({
    queryKey: ["shipments"],
    queryFn: async () => (await api.get<Shipment[]>("/shipments")).data,
  })
}

export function useStorageFacilities() {
  return useQuery({
    queryKey: ["storage-facilities"],
    queryFn: async () => (await api.get<StorageFacility[]>("/storage")).data,
  })
}

export function useStorageBookingsForLot(lotId: number | undefined) {
  return useQuery({
    queryKey: ["storage-bookings", lotId],
    queryFn: async () =>
      (await api.get<{ id: number; facility_id: number; booked_quantity_kg: number; status: string }[]>(
        "/storage/bookings/list",
        { params: { lot_id: lotId } },
      )).data,
    enabled: !!lotId,
  })
}

export function useStorageEvents(facilityId: number | undefined) {
  return useQuery({
    queryKey: ["storage-events", facilityId],
    queryFn: async () => (await api.get<StorageEvent[]>(`/storage/${facilityId}/events`)).data,
    enabled: !!facilityId,
  })
}

export function usePayments() {
  return useQuery({
    queryKey: ["payments"],
    queryFn: async () => (await api.get<Payment[]>("/payments")).data,
  })
}

export function useSettlements() {
  return useQuery({
    queryKey: ["settlements", "all"],
    queryFn: async () => (await api.get<Settlement[]>("/settlements")).data,
  })
}

export function useSettlementForLot(lotId: number | undefined) {
  return useQuery({
    queryKey: ["settlements", "lot", lotId],
    queryFn: async () => (await api.get<Settlement>(`/settlements/lot/${lotId}`)).data,
    enabled: !!lotId,
    retry: false,
  })
}

export function useSettlementsForFarmer(farmerId: number | undefined) {
  return useQuery({
    queryKey: ["settlements", "farmer", farmerId],
    queryFn: async () => (await api.get<Settlement[]>(`/settlements/farmer/${farmerId}`)).data,
    enabled: !!farmerId,
  })
}

export function useDisputes() {
  return useQuery({
    queryKey: ["disputes"],
    queryFn: async () => (await api.get<Dispute[]>("/disputes")).data,
  })
}

export function useDispute(id: number | undefined) {
  return useQuery({
    queryKey: ["disputes", id],
    queryFn: async () => (await api.get<Dispute>(`/disputes/${id}`)).data,
    enabled: !!id,
  })
}

export function useAnalytics() {
  return useQuery({
    queryKey: ["analytics"],
    queryFn: async () => (await api.get<Analytics>("/analytics")).data,
    refetchInterval: 30000,
  })
}

export function useAuditLogs(filters: { entity_type?: string; entity_id?: string; action?: string } = {}) {
  return useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: async () => (await api.get<AuditLogEntry[]>("/audit-logs", { params: filters })).data,
  })
}

export function useInvalidate() {
  const queryClient = useQueryClient()
  return (keys: (string | number | undefined)[][]) =>
    keys.forEach((key) => void queryClient.invalidateQueries({ queryKey: key }))
}

export { useMutation }
