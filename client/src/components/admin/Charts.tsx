import { useId, useState, type ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts'
import { BarChart3, Table2 } from 'lucide-react'
import { formatNumber } from '@/lib/format'
import { useT } from '@/i18n'
import { adminText } from '@/i18n/admin'

// Single-series charts in the brand hue (validated on both surfaces). Marks follow the house spec:
// bars <= 24px thick with a 4px rounded data end, 1px solid recessive grid, text in text tokens.

const AXIS_TICK = { fill: 'var(--muted-foreground)', fontSize: 12 }
const format = { format: formatNumber }

export interface Datum {
  label: string
  value: number
}

/** Card with a chart/table toggle, so every value is also readable without the chart. */
export function ChartCard({ title, subtitle, data, valueLabel, children }: { title: string; subtitle?: string; data: Datum[]; valueLabel: string; children: ReactNode }) {
  const [asTable, setAsTable] = useState(false)
  const headingId = useId()
  const t = useT(adminText).charts
  return (
    <section aria-labelledby={headingId} className="rounded-lg border border-foreground/12 bg-surface p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id={headingId} className="font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-foreground/55">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => setAsTable((t) => !t)}
          aria-pressed={asTable}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-foreground/60 hover:bg-muted hover:text-foreground"
        >
          {asTable ? <BarChart3 size={14} aria-hidden /> : <Table2 size={14} aria-hidden />} {asTable ? t.chart : t.table}
        </button>
      </div>
      {asTable ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-foreground/10 text-left text-xs text-foreground/55">
              <th scope="col" className="py-2 font-semibold">{t.item}</th>
              <th scope="col" className="py-2 text-right font-semibold">{valueLabel}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label} className="border-b border-foreground/5">
                <td className="py-1.5">{d.label}</td>
                <td className="py-1.5 text-right tabular-nums">{format.format(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        // Screen readers get the values as a text summary; the table toggle shows them visually.
        <div role="img" aria-label={`${title}. ${data.map((d) => `${d.label}: ${format.format(d.value)}`).join(', ')}`}>{children}</div>
      )}
    </section>
  )
}

function TooltipBox({ active, payload, label, valueLabel }: TooltipContentProps<number, string> & { valueLabel: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-foreground/12 bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-foreground/70">
        <span className="inline-block size-2 rounded-full bg-[var(--chart-series)]" />
        {valueLabel}: <span className="font-semibold tabular-nums text-foreground">{format.format(Number(payload[0].value))}</span>
      </p>
    </div>
  )
}

/** Vertical columns, e.g. a weekly trend. */
export function ColumnChart({ data, valueLabel, height = 220 }: { data: Datum[]; valueLabel: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeWidth={1} />
        <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} interval="preserveStartEnd" minTickGap={8} />
        <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} />
        <Tooltip cursor={{ fill: 'var(--chart-grid)' }} content={(props) => <TooltipBox {...(props as TooltipContentProps<number, string>)} valueLabel={valueLabel} />} />
        <Bar dataKey="value" fill="var(--chart-series)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Horizontal bars with the value at each bar's tip, for categories with readable names. */
export function HorizontalBars({ data, valueLabel, labelWidth = 130 }: { data: Datum[]; valueLabel: string; labelWidth?: number }) {
  const height = data.length * 30 + 16
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 36, bottom: 4, left: 0 }} barCategoryGap={6}>
        <CartesianGrid horizontal={false} stroke="var(--chart-grid)" strokeWidth={1} />
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis type="category" dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} width={labelWidth} />
        <Tooltip cursor={{ fill: 'var(--chart-grid)' }} content={(props) => <TooltipBox {...(props as TooltipContentProps<number, string>)} valueLabel={valueLabel} />} />
        <Bar dataKey="value" fill="var(--chart-series)" radius={[0, 4, 4, 0]} maxBarSize={18} minPointSize={2} isAnimationActive={false}>
          <LabelList dataKey="value" position="right" style={{ fill: 'var(--foreground)', fontSize: 12, fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
