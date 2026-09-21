export type UserRole = "FARMER" | "FPO_AGENT" | "BUYER" | "ASSAYER" | "TRANSPORTER" | "ADMIN"

export interface User {
  id: number
  email: string
  full_name: string
  role: UserRole
  phone: string | null
  preferred_language: string
  is_active: boolean
}

export type LotStatus =
  | "DRAFT"
  | "COLLECTED"
  | "UNDER_ASSESSMENT"
  | "ASSESSED"
  | "OPEN_FOR_OFFERS"
  | "OFFER_ACCEPTED"
  | "PURCHASE_ORDER_CREATED"
  | "DISPATCHED"
  | "DELIVERED"
  | "SETTLED"
  | "DISPUTED"
  | "CLOSED"

export type Grade = "A" | "B" | "C" | "REJECTED"

export interface LotContributor {
  id: number
  farmer_id: number
  quantity_kg: number
  farmer_name: string | null
}

export interface Lot {
  id: number
  lot_code: string
  commodity_id: number
  variety: string | null
  fpo_id: number
  village_origin: string
  collection_point: string
  expected_harvest_date: string | null
  total_quantity_kg: number
  preliminary_grade: string | null
  final_grade: Grade | null
  status: LotStatus
  is_synthetic_demo: boolean
  contributors: LotContributor[]
}

export interface Screening {
  id: number
  lot_id: number
  predicted_grade: string
  confidence_score: number
  defect_flags: string[]
  model_version: string
  disclaimer: string
}

export interface QualityAssessment {
  id: number
  lot_id: number
  assayer_id: number
  sample_quantity_kg: number
  final_weight_kg: number
  final_grade: Grade
  visible_defects: string[]
  quality_notes: string | null
  is_finalized: boolean
}

export type OfferType = "INDICATIVE" | "NEGOTIABLE" | "PURCHASE_ORDER" | "COMPLETED"
export type OfferStatus = "ACTIVE" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "WITHDRAWN"

export interface DeductionItem {
  label: string
  amount_per_kg: number
}

export interface Offer {
  id: number
  lot_id: number
  buyer_id: number
  buyer_name: string | null
  offer_type: OfferType
  status: OfferStatus
  gross_price_per_kg: number
  required_quantity_kg: number
  required_grade: string
  transport_cost_per_kg: number
  loading_unloading_per_kg: number
  grading_fee_per_kg: number
  storage_cost_per_kg: number
  platform_fee_per_kg: number
  other_deductions: DeductionItem[]
  delivery_terms: string | null
  payment_timeline_days: number
  expires_at: string | null
  total_deductions_per_kg: number
  net_price_per_kg: number
  expected_net_realization: number
}

export interface OfferComparison {
  offers: Offer[]
  best_offer_id: number | null
  explanation: string
}

export interface ToleranceRule {
  grade: string
  price_multiplier: number
  note?: string | null
}

export type POStatus = "ISSUED" | "ACKNOWLEDGED" | "FULFILLED" | "CANCELLED"

export interface PurchaseOrder {
  id: number
  po_number: string
  lot_id: number
  offer_id: number
  buyer_id: number
  fpo_id: number
  quantity_kg: number
  contracted_grade: string
  gross_price_per_kg: number
  deductions: Record<string, unknown>
  net_price_per_kg: number
  tolerance_rules: ToleranceRule[]
  reject_below_grade: string
  contamination_auto_reject: boolean
  delivery_location: string
  payment_deadline_days: number
  inspection_deadline_days: number
  transport_responsibility: string
  storage_responsibility: string
  dispute_procedure: string
  status: POStatus
}

export type ShipmentStatus =
  | "ASSIGNED"
  | "PICKUP_SCHEDULED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "DELAYED"
  | "INCIDENT"

export interface Shipment {
  id: number
  lot_id: number
  purchase_order_id: number
  transporter_id: number
  vehicle_number: string
  vehicle_type: string
  capacity_kg: number
  driver_contact: string
  pickup_point: string
  delivery_point: string
  estimated_cost: number
  pickup_scheduled_at: string | null
  picked_up_at: string | null
  delivered_at: string | null
  status: ShipmentStatus
}

export interface StorageFacility {
  id: number
  name: string
  operator_name: string
  village: string
  district: string
  state: string
  latitude: number | null
  longitude: number | null
  total_capacity_kg: number
  available_capacity_kg: number
  ventilation_type: string
  tariff_per_kg_per_day: number
  commodity_compatibility: string[]
  insurance_provider: string | null
  liability_notes: string | null
  last_inspection_date: string | null
  incident_status: string
  is_synthetic_demo: boolean
}

export type SensorStatus = "NORMAL" | "WARNING" | "ALERT"

export interface StorageEvent {
  id: number
  facility_id: number
  booking_id: number | null
  temperature_celsius: number
  humidity_percent: number
  occupancy_percent: number
  status: SensorStatus
  recorded_at: string
}

export type PaymentStatus =
  | "PAYMENT_PENDING"
  | "ADVANCE_RECEIVED"
  | "DISPATCHED"
  | "DELIVERED"
  | "PAYMENT_INITIATED"
  | "PAYMENT_COMPLETED"
  | "PARTIALLY_PAID"
  | "OVERDUE"
  | "DISPUTED"

export interface Payment {
  id: number
  purchase_order_id: number
  lot_id: number
  buyer_id: number
  amount_due: number
  amount_received: number
  status: PaymentStatus
  transaction_reference: string | null
  initiated_at: string | null
  completed_at: string | null
}

export interface SettlementItem {
  id: number
  farmer_id: number
  farmer_name: string | null
  contributed_quantity_kg: number
  share_percentage: number
  gross_share_amount: number
  deduction_amount: number
  net_amount: number
  payment_status: string
  paid_at: string | null
  transaction_reference: string | null
}

export type SettlementStatus = "PENDING" | "PARTIAL" | "COMPLETED" | "DISPUTED"

export interface Settlement {
  id: number
  lot_id: number
  payment_id: number
  total_amount: number
  platform_fee_amount: number
  other_deductions: { label: string; amount: number }[]
  status: SettlementStatus
  items: SettlementItem[]
}

export type DisputeStatus =
  | "OPEN"
  | "UNDER_REVIEW"
  | "EVIDENCE_REQUESTED"
  | "RESOLVED"
  | "REJECTED"
  | "ESCALATED"

export interface DisputeEvidence {
  id: number
  evidence_type: string
  file_path: string | null
  sensor_event_id: number | null
  description: string
  uploaded_by_user_id: number
  created_at: string
}

export interface Dispute {
  id: number
  dispute_code: string
  lot_id: number
  purchase_order_id: number | null
  raised_by_user_id: number
  reason: string
  status: DisputeStatus
  proposed_resolution: string | null
  final_decision: string | null
  financial_adjustment: number | null
  resolved_by_user_id: number | null
  resolved_at: string | null
  evidence: DisputeEvidence[]
}

export interface AuditLogEntry {
  id: number
  actor_user_id: number | null
  actor_role: string | null
  action: string
  entity_type: string
  entity_id: string
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  created_at: string
}

export interface NotificationItem {
  id: number
  type: string
  title: string
  message: string
  entity_type: string | null
  entity_id: string | null
  is_read: boolean
  created_at: string
}

export interface FPOOrganization {
  id: number
  name: string
  registration_number: string | null
  village: string
  district: string
  state: string
  is_synthetic_demo: boolean
}

export interface FarmerProfile {
  id: number
  village: string
  taluka: string
  district: string
  state: string
  land_area_acres: number | null
  fpo_id: number | null
  user_id: number
  full_name: string | null
  phone: string | null
}

export interface BuyerProfile {
  id: number
  organization_name: string
  buyer_type: string
  gstin: string | null
  address: string
  verification_status: "UNVERIFIED" | "PENDING" | "VERIFIED" | "SUSPENDED"
  user_id: number
}

export interface AssayerProfile {
  id: number
  certification_id: string | null
  affiliated_fpo_id: number | null
  user_id: number
}

export interface TransporterProfile {
  id: number
  company_name: string
  contact_phone: string
  user_id: number
}

export interface FPODashboard {
  total_farmers: number
  total_produce_kg: number
  active_lots: number
  pending_assessment: number
  active_offers: number
  accepted_orders: number
  active_shipments: number
  pending_payments: number
  open_disputes: number
}

export interface Analytics {
  total_farmers: number
  total_lots: number
  total_quantity_kg: number
  average_net_realization_per_kg: number
  total_transaction_value: number
  pending_settlements: number
  completed_settlements: number
  total_disputes: number
  open_disputes: number
  average_dispute_resolution_hours: number | null
  buyer_fulfillment_rate: number
  active_shipments: number
}

export interface ApiError {
  error: {
    code: string
    message: string
  }
}
