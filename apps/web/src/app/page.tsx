import Link from "next/link";

const customerFeatures = [
  {
    title: "Book online",
    description: "Request cleanings quickly with preferred dates and property details.",
  },
  {
    title: "Track status",
    description: "See when jobs are scheduled, completed, and ready for follow-up.",
  },
  {
    title: "Stay compliant",
    description: "Get reminders before your next tank service is due.",
  },
];

type SectionIntroProps = {
  eyebrow: string;
  title: string;
  body: string;
  tone: "light" | "dark";
};

function SectionIntro({ eyebrow, title, body, tone }: SectionIntroProps) {
  const eyebrowClass = tone === "light" ? "text-[#9bd7e4]" : "text-[#9d7b43]";
  const titleClass = tone === "light" ? "text-white" : "text-[#08262f]";
  const bodyClass = tone === "light" ? "text-white/74" : "text-[#21404a]";

  return (
    <>
      <p className={`text-sm font-semibold uppercase tracking-[0.22em] ${eyebrowClass}`}>
        {eyebrow}
      </p>
      <h2 className={`mt-4 font-[var(--font-space-grotesk)] text-3xl sm:text-4xl ${titleClass}`}>
        {title}
      </h2>
      <p className={`mt-4 text-base leading-7 ${bodyClass}`}>{body}</p>
    </>
  );
}

function CustomerFeatureGrid() {
  return (
    <div className="mt-8 grid gap-4 md:grid-cols-3">
      {customerFeatures.map((feature) => (
        <article key={feature.title} className="rounded-3xl border border-white/10 bg-[#0d2f39]/80 p-5">
          <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
          <p className="mt-2 text-sm leading-6 text-white/68">{feature.description}</p>
        </article>
      ))}
    </div>
  );
}

function CustomerInfoSection() {
  return (
    <section
      id="customer-info"
      className="rounded-[2rem] border border-white/12 bg-white/8 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.25)] backdrop-blur-md"
    >
      <SectionIntro
        eyebrow="Customer Information"
        title="Simple booking and service visibility for homeowners."
        body="Customers can request a tank cleaning, review upcoming visits, and keep their property and tank records in one place without chasing paperwork."
        tone="light"
      />
      <CustomerFeatureGrid />
    </section>
  );
}

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden bg-[#071b22] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#3b82f6_0,#1d4ed8_42%,#0b2a8a_100%)]" />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-center bg-cover opacity-20"
        style={{ backgroundImage: "url('/Water.avif')" }}
      />
      <div className="absolute inset-x-0 top-0 h-48 bg-[linear-gradient(180deg,rgba(7,27,34,0.9),rgba(7,27,34,0))]" />

      <section className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 pb-20 pt-18 sm:pt-24">
        <div className="max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#dcb572]">
            The Future of Tank Cleaning
          </p>
          <h1 className="mt-6 max-w-3xl font-[var(--font-space-grotesk)] text-5xl leading-tight text-white sm:text-6xl lg:text-7xl">
            Fresh water protection for every home and property portfolio.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78 sm:text-xl">
            Tank Tech gives homeowners and property owners a clear way to schedule cleanings,
            track compliance, and keep Bermuda water systems safe year-round.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/login"
              className="rounded-full bg-[#dcb572] px-7 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#08262f] transition hover:bg-[#e6c793]"
            >
              Sign in
            </Link>
            <Link
              href="/bookings/new"
              className="rounded-full border border-white/20 bg-white/6 px-7 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white/12"
            >
              Request cleaning
            </Link>
          </div>
        </div>

        <div className="mt-16">
          <CustomerInfoSection />
        </div>
      </section>
    </main>
  );
}
