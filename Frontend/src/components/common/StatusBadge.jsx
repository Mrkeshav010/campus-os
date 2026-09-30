const styles = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  open: 'bg-amber-100 text-amber-700',
  'in-progress': 'bg-sky-100 text-sky-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  urgent: 'bg-red-100 text-red-700',
  normal: 'bg-slate-100 text-slate-600',
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
}

export default function StatusBadge({ value }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
        styles[value] || 'bg-slate-100 text-slate-600'
      }`}
    >
      {value}
    </span>
  )
}