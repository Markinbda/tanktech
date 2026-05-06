type DashboardCardProps = {
  label: string;
  value: string | number;
  hint?: string;
};

export function DashboardCard({ label, value, hint }: DashboardCardProps) {
  return (
    <article className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-sky-700">{label}</p>
      <p className="mt-2 text-3xl font-bold text-sky-950">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </article>
  );
}
