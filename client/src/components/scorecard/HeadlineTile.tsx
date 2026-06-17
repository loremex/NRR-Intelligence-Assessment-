interface HeadlineTileProps {
  label: string
  value: string
  color?: string
  tooltip?: string
  footnote?: string
}

export function HeadlineTile({ label, value, color, tooltip, footnote }: HeadlineTileProps) {
  return (
    <div
      className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-1"
      aria-label={tooltip ? `${label}: ${value}. ${tooltip}` : `${label}: ${value}`}
    >
      <span className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wide font-medium leading-tight">
        {label}
      </span>
      <span
        className="font-display text-2xl sm:text-3xl font-bold tabular-nums leading-tight"
        style={{ color: color ?? '#002337' }}
        aria-hidden="true"
      >
        {value}
      </span>
      {footnote && (
        <span className="text-[9px] text-slate-400 leading-tight mt-0.5">{footnote}</span>
      )}
    </div>
  )
}
