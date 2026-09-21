import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

interface Point {
  time: string
  value: number
}

const CHART_COLORS = {
  surface: "#fcfcfb",
  muted: "#898781",
  grid: "#e1e0d9",
  primaryInk: "#0b0b0b",
}

export function MiniLineChart({
  data,
  color,
  unit,
  label,
}: {
  data: Point[]
  color: string
  unit: string
  label: string
}) {
  return (
    <div className="rounded-lg border border-ink-100 p-3" style={{ background: CHART_COLORS.surface }}>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-medium text-ink-600">{label}</span>
        <span className="text-xs text-ink-400">{unit}</span>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: CHART_COLORS.muted }} tickLine={false} axisLine={{ stroke: CHART_COLORS.grid }} />
          <YAxis tick={{ fontSize: 10, fill: CHART_COLORS.muted }} tickLine={false} axisLine={false} width={36} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: CHART_COLORS.grid }}
            labelStyle={{ color: CHART_COLORS.primaryInk }}
            formatter={(value) => [`${value} ${unit}`, label]}
          />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
