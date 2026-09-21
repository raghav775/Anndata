import { useMutation } from "@tanstack/react-query"
import {
  CheckCircle2,
  ClipboardCheck,
  Gavel,
  PackageCheck,
  ScanSearch,
  Sparkles,
  Truck,
  Warehouse,
} from "lucide-react"
import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { Badge, StatusBadge } from "../components/ui/Badge"
import { Button } from "../components/ui/Button"
import { Card, CardHeader } from "../components/ui/Card"
import { ErrorState, SkeletonCard } from "../components/ui/States"
import { useAuth } from "../context/AuthContext"
import { useI18n } from "../context/I18nContext"
import { useToast } from "../context/ToastContext"
import {
  useAssessment,
  useDisputes,
  useInvalidate,
  useLot,
  useOfferComparison,
  usePurchaseOrders,
  useScreening,
  useSettlementForLot,
  useStorageBookingsForLot,
  useStorageFacilities,
  useTransporters,
} from "../hooks/api"
import { api, getApiErrorMessage } from "../lib/api"
import type { Grade } from "../types"

export function LotDetailPage() {
  const { lotId } = useParams()
  const id = Number(lotId)
  const { user } = useAuth()
  const { t, tStatus } = useI18n()
  const { showToast } = useToast()
  const invalidate = useInvalidate()
  const navigate = useNavigate()

  const { data: lot, isLoading, isError } = useLot(id)
  const { data: screening } = useScreening(id)
  const { data: assessment } = useAssessment(id)
  const offerComparison = useOfferComparison(id)
  const { data: pos } = usePurchaseOrders()
  const { data: disputes } = useDisputes()
  const { data: settlement } = useSettlementForLot(id)
  const { data: bookings } = useStorageBookingsForLot(id)

  const po = (pos ?? []).find((p) => p.lot_id === id)
  const lotDisputes = (disputes ?? []).filter((d) => d.lot_id === id)

  function invalidateLot() {
    invalidate([["lots", id], ["lots"], ["offers", "lot", id], ["purchase-orders"], ["disputes"], ["settlements", "lot", id]])
  }

  function onActionSuccess() {
    invalidateLot()
    showToast(t("lotDetail.updatedToast"), "success")
  }
  function onActionError(err: unknown) {
    showToast(getApiErrorMessage(err), "error")
  }

  const collectMutation = useMutation({
    mutationFn: async () => (await api.post(`/lots/${id}/collect`)).data,
    onSuccess: onActionSuccess,
    onError: onActionError,
  })
  const screenMutation = useMutation({
    mutationFn: async () => (await api.post(`/lots/${id}/screen`)).data,
    onSuccess: onActionSuccess,
    onError: onActionError,
  })
  const openForOffersMutation = useMutation({
    mutationFn: async () => (await api.post(`/lots/${id}/open-for-offers`)).data,
    onSuccess: onActionSuccess,
    onError: onActionError,
  })
  const closeMutation = useMutation({
    mutationFn: async () => (await api.post(`/lots/${id}/close`)).data,
    onSuccess: () => {
      invalidateLot()
      showToast(t("lotDetail.closedToast"), "success")
    },
    onError: onActionError,
  })

  if (isLoading) return <SkeletonCard />
  if (isError || !lot) return <ErrorState message={t("lotDetail.couldNotLoad")} />

  const isFpoAgent = user?.role === "FPO_AGENT" || user?.role === "ADMIN"
  const isAssayer = user?.role === "ASSAYER" || user?.role === "ADMIN"
  const isBuyer = user?.role === "BUYER"

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-bold text-ink-900">{lot.lot_code}</h1>
            <StatusBadge status={lot.status} />
            {lot.is_synthetic_demo && <Badge tone="neutral">{t("common.synthDemo")}</Badge>}
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {lot.variety} · {lot.village_origin} · {lot.collection_point}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-bold text-ink-900">{lot.total_quantity_kg} {t("common.kg")}</p>
          <p className="text-xs text-ink-400">{lot.contributors.length} contributor(s)</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={t("lotDetail.contributors")} />
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
                  <th className="pb-2 pr-4">{t("lotDetail.colFarmer")}</th>
                  <th className="pb-2 pr-4">{t("lotDetail.colQuantity")}</th>
                  <th className="pb-2">{t("lotDetail.colShare")}</th>
                </tr>
              </thead>
              <tbody>
                {lot.contributors.map((c) => (
                  <tr key={c.id} className="border-b border-ink-50 last:border-0">
                    <td className="py-2.5 pr-4">{c.farmer_name ?? `Farmer #${c.farmer_id}`}</td>
                    <td className="py-2.5 pr-4">{c.quantity_kg} {t("common.kg")}</td>
                    <td className="py-2.5">{((c.quantity_kg / lot.total_quantity_kg) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Workflow actions */}
          {isFpoAgent && lot.status === "DRAFT" && (
            <Card>
              <CardHeader title={t("lotDetail.collectionTitle")} subtitle={t("lotDetail.collectionSubtitle")} />
              <Button isLoading={collectMutation.isPending} onClick={() => collectMutation.mutate()}>
                <PackageCheck className="h-4 w-4" />
                {t("lotDetail.markCollected")}
              </Button>
            </Card>
          )}

          <Card>
            <CardHeader title={t("lotDetail.screeningTitle")} subtitle={t("lotDetail.screeningSubtitle")} />
            {screening ? (
              <div className="space-y-2 text-sm">
                <p>
                  {t("lotDetail.predictedGrade")}: <Badge tone="info">{screening.predicted_grade}</Badge>{" "}
                  <span className="text-ink-500">({screening.confidence_score}% {t("lotDetail.confidence")})</span>
                </p>
                {screening.defect_flags.length > 0 && (
                  <p className="text-ink-600">{t("lotDetail.flags")}: {screening.defect_flags.join(", ")}</p>
                )}
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-inset ring-amber-100">{screening.disclaimer}</p>
              </div>
            ) : isFpoAgent && lot.status === "COLLECTED" ? (
              <Button isLoading={screenMutation.isPending} onClick={() => screenMutation.mutate()}>
                <ScanSearch className="h-4 w-4" />
                {t("lotDetail.runScreening")}
              </Button>
            ) : (
              <p className="text-sm text-ink-400">{t("lotDetail.notScreened")}</p>
            )}
          </Card>

          <Card>
            <CardHeader title={t("lotDetail.assessmentTitle")} subtitle={t("lotDetail.assessmentSubtitle")} />
            {assessment ? (
              <div className="space-y-1 text-sm">
                <p>
                  {t("lotDetail.finalGrade")}: <Badge tone="success">{assessment.final_grade}</Badge>
                </p>
                <p>{t("lotDetail.finalWeight", { weight: assessment.final_weight_kg, sample: assessment.sample_quantity_kg })}</p>
                {assessment.visible_defects.length > 0 && <p>{t("lotDetail.defects")}: {assessment.visible_defects.join(", ")}</p>}
                {assessment.quality_notes && <p className="text-ink-500">{assessment.quality_notes}</p>}
              </div>
            ) : isAssayer && lot.status === "UNDER_ASSESSMENT" ? (
              <AssessmentForm lotId={id} onDone={invalidateLot} />
            ) : (
              <p className="text-sm text-ink-400">{t("lotDetail.notAssessed")}</p>
            )}
          </Card>

          {isFpoAgent && lot.status === "ASSESSED" && (
            <Card>
              <CardHeader title={t("lotDetail.openForOffersTitle")} subtitle={t("lotDetail.openForOffersSubtitle")} />
              <Button isLoading={openForOffersMutation.isPending} onClick={() => openForOffersMutation.mutate()}>
                <Sparkles className="h-4 w-4" />
                {t("lotDetail.openForOffersButton")}
              </Button>
            </Card>
          )}

          {(lot.status === "OPEN_FOR_OFFERS" || lot.status === "OFFER_ACCEPTED" || offerComparison.data) && (
            <OffersSection lotId={id} lotStatus={lot.status} onChanged={invalidateLot} />
          )}

          {lot.status === "OFFER_ACCEPTED" && isFpoAgent && (
            <CreatePurchaseOrderCard offerId={offerComparison.data?.best_offer_id ?? offerComparison.data?.offers.find((o) => o.status === "ACCEPTED")?.id} onDone={invalidateLot} />
          )}

          {po && (
            <Card>
              <CardHeader title={t("lotDetail.purchaseOrder")} action={<Link to={`/app/purchase-orders/${po.id}`} className="text-sm font-medium text-primary-700 hover:underline">{t("lotDetail.viewPrint")}</Link>} />
              <p className="text-sm text-ink-700">
                {po.po_number} · ₹{po.net_price_per_kg}/kg net · {po.quantity_kg} {t("common.kg")} · <StatusBadge status={po.status} />
              </p>
            </Card>
          )}

          {po && isFpoAgent && lot.status === "PURCHASE_ORDER_CREATED" && (
            <AssignShipmentCard lotId={id} poId={po.id} onDone={invalidateLot} />
          )}

          {isBuyer && po && (lot.status === "DISPATCHED" || lot.status === "PURCHASE_ORDER_CREATED") && (
            <ConfirmDeliveryCard poId={po.id} contractedGrade={po.contracted_grade} onDone={invalidateLot} />
          )}

          {settlement && (
            <Card>
              <CardHeader title={t("lotDetail.settlementTitle")} action={<Link to="/app/settlements" className="text-sm font-medium text-primary-700 hover:underline">{t("lotDetail.settlementAllLink")}</Link>} />
              <p className="text-sm text-ink-700">
                {t("lotDetail.settlementTotal", { amount: settlement.total_amount.toLocaleString("en-IN") })} · <StatusBadge status={settlement.status} />
              </p>
              <ul className="mt-2 space-y-1 text-sm text-ink-600">
                {settlement.items.map((item) => (
                  <li key={item.id}>
                    {item.farmer_name ?? `Farmer #${item.farmer_id}`}: ₹{item.net_amount.toLocaleString("en-IN")} ({item.share_percentage}%)
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {isFpoAgent && lot.status === "SETTLED" && (
            <Card>
              <CardHeader title={t("lotDetail.closeTitle")} subtitle={t("lotDetail.closeSubtitle")} />
              <Button variant="secondary" isLoading={closeMutation.isPending} onClick={() => closeMutation.mutate()}>
                {t("lotDetail.closeButton")}
              </Button>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {bookings && bookings.length > 0 && (
            <Card>
              <CardHeader title={t("lotDetail.storageBookings")} />
              <ul className="space-y-1.5 text-sm text-ink-600">
                {bookings.map((b) => (
                  <li key={b.id} className="flex items-center gap-2">
                    <Warehouse className="h-3.5 w-3.5 text-ink-300" />
                    {b.booked_quantity_kg} {t("common.kg")} · <Badge tone="neutral">{tStatus(b.status)}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {isFpoAgent && ["PURCHASE_ORDER_CREATED", "DISPATCHED"].includes(lot.status) && (
            <BookStorageCard lotId={id} onDone={invalidateLot} />
          )}

          <Card>
            <CardHeader
              title={t("lotDetail.disputesTitle")}
              action={
                (isFpoAgent || isBuyer) &&
                po && (
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/app/disputes?raise_for_lot=${id}&po=${po.id}`)}>
                    <Gavel className="h-3.5 w-3.5" />
                    {t("lotDetail.raiseDispute")}
                  </Button>
                )
              }
            />
            {lotDisputes.length === 0 ? (
              <p className="text-sm text-ink-400">{t("lotDetail.noDisputes")}</p>
            ) : (
              <ul className="space-y-2">
                {lotDisputes.map((d) => (
                  <li key={d.id}>
                    <Link to={`/app/disputes/${d.id}`} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2.5 text-sm transition-colors hover:bg-ink-50">
                      <span>{d.dispute_code}</span>
                      <StatusBadge status={d.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

function AssessmentForm({ lotId, onDone }: { lotId: number; onDone: () => void }) {
  const { t } = useI18n()
  const { showToast } = useToast()
  const [sampleQty, setSampleQty] = useState("")
  const [finalWeight, setFinalWeight] = useState("")
  const [grade, setGrade] = useState<Grade>("B")
  const [notes, setNotes] = useState("")

  const submit = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/lots/${lotId}/assessment`, {
          sample_quantity_kg: Number(sampleQty),
          final_weight_kg: Number(finalWeight),
          final_grade: grade,
          visible_defects: [],
          quality_notes: notes || null,
        })
      ).data,
    onSuccess: () => {
      onDone()
      showToast(t("lotDetail.assessmentFinalizedToast"), "success")
    },
    onError: (err) => showToast(getApiErrorMessage(err), "error"),
  })

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault()
        submit.mutate()
      }}
    >
      <label className="text-sm">
        <span className="font-medium text-ink-700">{t("lotDetail.sampleQty")} *</span>
        <input required type="number" min="0.1" step="0.1" value={sampleQty} onChange={(e) => setSampleQty(e.target.value)} className="input mt-1.5" />
      </label>
      <label className="text-sm">
        <span className="font-medium text-ink-700">{t("lotDetail.finalWeightLabel")} *</span>
        <input required type="number" min="0.1" step="0.1" value={finalWeight} onChange={(e) => setFinalWeight(e.target.value)} className="input mt-1.5" />
      </label>
      <label className="text-sm">
        <span className="font-medium text-ink-700">{t("lotDetail.finalGradeLabel")} *</span>
        <select value={grade} onChange={(e) => setGrade(e.target.value as Grade)} className="input mt-1.5">
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="REJECTED">{t("grade.REJECTED")}</option>
        </select>
      </label>
      <label className="text-sm sm:col-span-2">
        <span className="font-medium text-ink-700">{t("lotDetail.qualityNotes")}</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input mt-1.5" rows={2} />
      </label>
      <div className="sm:col-span-2">
        <Button type="submit" isLoading={submit.isPending}>
          <ClipboardCheck className="h-4 w-4" />
          {t("lotDetail.finalizeButton")}
        </Button>
      </div>
    </form>
  )
}

function OffersSection({ lotId, lotStatus, onChanged }: { lotId: number; lotStatus: string; onChanged: () => void }) {
  const { user } = useAuth()
  const { t } = useI18n()
  const { showToast } = useToast()
  const { data: comparison, isLoading } = useOfferComparison(lotId)

  const accept = useMutation({
    mutationFn: async (offerId: number) => (await api.post(`/offers/${offerId}/accept`)).data,
    onSuccess: () => {
      onChanged()
      showToast(t("lotDetail.offerAcceptedToast"), "success")
    },
    onError: (err) => showToast(getApiErrorMessage(err), "error"),
  })

  return (
    <Card>
      <CardHeader title={t("lotDetail.offersTitle")} subtitle={t("lotDetail.offersSubtitle")} />
      {isLoading && <p className="text-sm text-ink-400">{t("common.loading")}</p>}
      {comparison && comparison.offers.length === 0 && <p className="text-sm text-ink-400">{t("lotDetail.noOffers")}</p>}
      {comparison && comparison.offers.length > 0 && (
        <>
          <p className="mb-3 rounded-lg bg-primary-50 px-3 py-2.5 text-sm text-primary-800 ring-1 ring-inset ring-primary-100">{comparison.explanation}</p>
          <div className="space-y-3">
            {comparison.offers.map((offer) => (
              <div
                key={offer.id}
                className={`rounded-xl border p-3.5 ${offer.id === comparison.best_offer_id ? "border-primary-300 bg-primary-50/40 ring-1 ring-primary-100" : "border-ink-100"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink-800">
                      {offer.buyer_name} {offer.id === comparison.best_offer_id && <Badge tone="primary">{t("lotDetail.bestNet")}</Badge>}
                    </p>
                    <p className="text-xs text-ink-500">
                      {t("lotDetail.grossMinus", { gross: offer.gross_price_per_kg, deductions: offer.total_deductions_per_kg })}
                    </p>
                  </div>
                  <StatusBadge status={offer.status} />
                </div>
                <div className="mt-2 flex items-end justify-between">
                  <p className="font-display text-lg font-bold text-ink-900">
                    ₹{offer.net_price_per_kg}<span className="text-xs font-normal text-ink-400">{t("lotDetail.netPerKg")}</span>
                  </p>
                  {user?.role === "FPO_AGENT" && lotStatus === "OPEN_FOR_OFFERS" && offer.status === "ACTIVE" && (
                    <Button
                      size="sm"
                      isLoading={accept.isPending}
                      onClick={() => accept.mutate(offer.id)}
                      aria-label={`Accept offer from ${offer.buyer_name}`}
                    >
                      {t("lotDetail.acceptOffer")}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {user?.role === "BUYER" && lotStatus === "OPEN_FOR_OFFERS" && <SubmitOfferForm lotId={lotId} onDone={onChanged} />}
    </Card>
  )
}

function SubmitOfferForm({ lotId, onDone }: { lotId: number; onDone: () => void }) {
  const { t } = useI18n()
  const { showToast } = useToast()
  const [gross, setGross] = useState("")
  const [transport, setTransport] = useState("0")
  const [loading, setLoading] = useState("0")
  const [grading, setGrading] = useState("0")
  const [storage, setStorage] = useState("0")
  const [platform, setPlatform] = useState("0")
  const [quantity, setQuantity] = useState("")
  const [grade, setGrade] = useState("B")

  const submit = useMutation({
    mutationFn: async () =>
      (
        await api.post("/offers", {
          lot_id: lotId,
          offer_type: "NEGOTIABLE",
          gross_price_per_kg: Number(gross),
          required_quantity_kg: Number(quantity),
          required_grade: grade,
          transport_cost_per_kg: Number(transport),
          loading_unloading_per_kg: Number(loading),
          grading_fee_per_kg: Number(grading),
          storage_cost_per_kg: Number(storage),
          platform_fee_per_kg: Number(platform),
        })
      ).data,
    onSuccess: () => {
      onDone()
      showToast(t("lotDetail.offerSubmittedToast"), "success")
    },
    onError: (err) => showToast(getApiErrorMessage(err), "error"),
  })

  return (
    <form
      className="mt-4 grid gap-3 border-t border-ink-100 pt-4 sm:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault()
        submit.mutate()
      }}
    >
      <p className="text-sm font-medium text-ink-700 sm:col-span-3">{t("lotDetail.submitOfferTitle")}</p>
      <NumField label={`${t("lotDetail.grossPrice")} *`} value={gross} onChange={setGross} required />
      <NumField label={`${t("lotDetail.requiredQty")} *`} value={quantity} onChange={setQuantity} required />
      <label className="text-sm">
        <span className="font-medium text-ink-700">{t("lotDetail.requiredGrade")}</span>
        <select value={grade} onChange={(e) => setGrade(e.target.value)} className="input mt-1.5">
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
        </select>
      </label>
      <NumField label={t("lotDetail.transportCost")} value={transport} onChange={setTransport} />
      <NumField label={t("lotDetail.loadingCost")} value={loading} onChange={setLoading} />
      <NumField label={t("lotDetail.gradingFee")} value={grading} onChange={setGrading} />
      <NumField label={t("lotDetail.storageFee")} value={storage} onChange={setStorage} />
      <NumField label={t("lotDetail.platformFee")} value={platform} onChange={setPlatform} />
      <div className="flex items-end sm:col-span-1">
        <Button type="submit" isLoading={submit.isPending}>
          {t("lotDetail.submitOfferButton")}
        </Button>
      </div>
    </form>
  )
}

function NumField({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <label className="text-sm">
      <span className="font-medium text-ink-700">{label}</span>
      <input required={required} type="number" min="0" step="0.01" value={value} onChange={(e) => onChange(e.target.value)} className="input mt-1.5" />
    </label>
  )
}

function CreatePurchaseOrderCard({ offerId, onDone }: { offerId: number | undefined; onDone: () => void }) {
  const { t } = useI18n()
  const { showToast } = useToast()
  const [deliveryLocation, setDeliveryLocation] = useState("")

  const submit = useMutation({
    mutationFn: async () =>
      (
        await api.post("/purchase-orders", {
          offer_id: offerId,
          delivery_location: deliveryLocation,
        })
      ).data,
    onSuccess: (po) => {
      onDone()
      showToast(t("lotDetail.poCreatedToast", { code: po.po_number }), "success")
    },
    onError: (err) => showToast(getApiErrorMessage(err), "error"),
  })

  if (!offerId) return null

  return (
    <Card>
      <CardHeader title={t("lotDetail.createPoTitle")} subtitle={t("lotDetail.createPoSubtitle")} />
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          submit.mutate()
        }}
      >
        <label className="flex-1 text-sm">
          <span className="font-medium text-ink-700">{t("lotDetail.deliveryLocation")} *</span>
          <input required value={deliveryLocation} onChange={(e) => setDeliveryLocation(e.target.value)} className="input mt-1.5" />
        </label>
        <Button type="submit" isLoading={submit.isPending}>
          {t("lotDetail.createPoButton")}
        </Button>
      </form>
    </Card>
  )
}

function AssignShipmentCard({ lotId, poId, onDone }: { lotId: number; poId: number; onDone: () => void }) {
  const { t } = useI18n()
  const { showToast } = useToast()
  const { data: transporters } = useTransporters()
  const [transporterId, setTransporterId] = useState("")
  const [vehicleNumber, setVehicleNumber] = useState("")
  const [vehicleType, setVehicleType] = useState("Open truck")
  const [capacity, setCapacity] = useState("")
  const [driverContact, setDriverContact] = useState("")
  const [pickupPoint, setPickupPoint] = useState("")
  const [deliveryPoint, setDeliveryPoint] = useState("")

  const submit = useMutation({
    mutationFn: async () =>
      (
        await api.post("/shipments", {
          lot_id: lotId,
          purchase_order_id: poId,
          transporter_id: Number(transporterId),
          vehicle_number: vehicleNumber,
          vehicle_type: vehicleType,
          capacity_kg: Number(capacity),
          driver_contact: driverContact,
          pickup_point: pickupPoint,
          delivery_point: deliveryPoint,
        })
      ).data,
    onSuccess: () => {
      onDone()
      showToast(t("lotDetail.transporterAssignedToast"), "success")
    },
    onError: (err) => showToast(getApiErrorMessage(err), "error"),
  })

  return (
    <Card>
      <CardHeader title={t("lotDetail.assignTransportTitle")} />
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          submit.mutate()
        }}
      >
        <label className="text-sm">
          <span className="font-medium text-ink-700">{t("lotDetail.transporter")} *</span>
          <select required value={transporterId} onChange={(e) => setTransporterId(e.target.value)} className="input mt-1.5">
            <option value="">{t("lotDetail.selectTransporter")}</option>
            {(transporters ?? []).map((tr) => (
              <option key={tr.id} value={tr.id}>
                {tr.company_name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="font-medium text-ink-700">{t("lotDetail.vehicleNumber")} *</span>
          <input required value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} className="input mt-1.5" />
        </label>
        <label className="text-sm">
          <span className="font-medium text-ink-700">{t("lotDetail.vehicleType")}</span>
          <input value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} className="input mt-1.5" />
        </label>
        <label className="text-sm">
          <span className="font-medium text-ink-700">{t("lotDetail.capacityKg")} *</span>
          <input required type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} className="input mt-1.5" />
        </label>
        <label className="text-sm">
          <span className="font-medium text-ink-700">{t("lotDetail.driverContact")} *</span>
          <input required value={driverContact} onChange={(e) => setDriverContact(e.target.value)} className="input mt-1.5" />
        </label>
        <label className="text-sm">
          <span className="font-medium text-ink-700">{t("lotDetail.pickupPoint")} *</span>
          <input required value={pickupPoint} onChange={(e) => setPickupPoint(e.target.value)} className="input mt-1.5" />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="font-medium text-ink-700">{t("lotDetail.deliveryPoint")} *</span>
          <input required value={deliveryPoint} onChange={(e) => setDeliveryPoint(e.target.value)} className="input mt-1.5" />
        </label>
        <div className="sm:col-span-2">
          <Button type="submit" isLoading={submit.isPending}>
            <Truck className="h-4 w-4" />
            {t("lotDetail.assignButton")}
          </Button>
        </div>
      </form>
    </Card>
  )
}

function BookStorageCard({ lotId, onDone }: { lotId: number; onDone: () => void }) {
  const { t } = useI18n()
  const { showToast } = useToast()
  const { data: facilities } = useStorageFacilities()
  const [facilityId, setFacilityId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))

  const submit = useMutation({
    mutationFn: async () =>
      (
        await api.post("/storage/bookings", {
          lot_id: lotId,
          facility_id: Number(facilityId),
          booked_quantity_kg: Number(quantity),
          start_date: startDate,
        })
      ).data,
    onSuccess: () => {
      onDone()
      showToast(t("lotDetail.storageBookedToast"), "success")
    },
    onError: (err) => showToast(getApiErrorMessage(err), "error"),
  })

  return (
    <Card>
      <CardHeader title={t("lotDetail.bookStorageTitle")} />
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          submit.mutate()
        }}
      >
        <label className="block text-sm">
          <span className="font-medium text-ink-700">{t("lotDetail.facility")} *</span>
          <select required value={facilityId} onChange={(e) => setFacilityId(e.target.value)} className="input mt-1.5">
            <option value="">{t("lotDetail.selectFacility")}</option>
            {(facilities ?? []).map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.available_capacity_kg} {t("lotDetail.available")})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ink-700">{t("lotDetail.quantityKg")} *</span>
          <input required type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="input mt-1.5" />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ink-700">{t("lotDetail.startDate")}</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input mt-1.5" />
        </label>
        <Button type="submit" isLoading={submit.isPending}>
          <Warehouse className="h-4 w-4" />
          {t("lotDetail.bookButton")}
        </Button>
      </form>
    </Card>
  )
}

function ConfirmDeliveryCard({ poId, contractedGrade, onDone }: { poId: number; contractedGrade: string; onDone: () => void }) {
  const { t, tStatus } = useI18n()
  const { showToast } = useToast()
  const [deliveredGrade, setDeliveredGrade] = useState(contractedGrade)
  const [contamination, setContamination] = useState(false)

  const submit = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/purchase-orders/${poId}/confirm-delivery`, {
          delivered_grade: deliveredGrade,
          contamination_flagged: contamination,
        })
      ).data,
    onSuccess: (result) => {
      onDone()
      showToast(t("lotDetail.deliveryConfirmedToast", { outcome: tStatus(result.outcome) }), "success")
    },
    onError: (err) => showToast(getApiErrorMessage(err), "error"),
  })

  return (
    <Card>
      <CardHeader title={t("lotDetail.confirmDeliveryTitle")} subtitle={t("lotDetail.confirmDeliverySubtitle")} />
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          submit.mutate()
        }}
      >
        <label className="block text-sm">
          <span className="font-medium text-ink-700">{t("lotDetail.gradeObserved")}</span>
          <select value={deliveredGrade} onChange={(e) => setDeliveredGrade(e.target.value)} className="input mt-1.5">
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="REJECTED">{t("grade.REJECTED")}</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" checked={contamination} onChange={(e) => setContamination(e.target.checked)} />
          {t("lotDetail.contaminationFlag")}
        </label>
        <Button type="submit" isLoading={submit.isPending}>
          <CheckCircle2 className="h-4 w-4" />
          {t("lotDetail.confirmDeliveryButton")}
        </Button>
      </form>
    </Card>
  )
}
