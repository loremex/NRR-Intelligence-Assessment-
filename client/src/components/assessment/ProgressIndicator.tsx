interface ProgressIndicatorProps {
  currentSectionIndex: number
  totalSections: number
  currentSectionName: string
}

export function ProgressIndicator({
  currentSectionIndex,
  totalSections,
  currentSectionName,
}: ProgressIndicatorProps) {
  const pct = Math.round((currentSectionIndex / totalSections) * 100)

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-text-dark">
          Section{' '}
          <span className="text-navy font-bold">{currentSectionIndex + 1}</span> of{' '}
          <span className="font-bold">{totalSections}</span>:{' '}
          <span className="text-navy">{currentSectionName}</span>
        </p>
        <p className="text-xs text-slate-400">{pct}% complete</p>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-blue rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Assessment progress: ${pct}%`}
        />
      </div>
    </div>
  )
}
