interface HeadlineTileProps {
  label: string
  value: string
  color?: string
  tooltip?: string
}

export function HeadlineTile({ label, value, color, tooltip }: HeadlineTileProps) {
  return (
    <div
      className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-1"
      title={tooltip}
    >
      <span className="text-xs text-slate-500 uppercase tracking-widest font-medium leading-none">
        {label}
      </span>
      <span
        className="font-display text-3xl font-bold tabular-nums leading-tight"
        style={{ color: color ?? '#002337' }}
      >
        {value}
      </span>
    </div>
  )
}
