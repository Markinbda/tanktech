import Link from "next/link";

type DashboardCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
};

export function DashboardCard({ label, value, hint, href }: DashboardCardProps) {
  const content = (
    <>
      <p className="text-sm font-medium text-sky-700">{label}</p>
      <p className="mt-2 text-3xl font-bold text-sky-950">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-2xl border border-sky-100 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow"
      >
        {content}
      </Link>
    );
  }

  return (
    <article className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
      {content}
    </article>
  );
}
