import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function InvestorsPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <SiteHeader />

      <section className="mx-auto grid max-w-7xl items-center gap-8 px-6 py-14 lg:grid-cols-2">
        <div>
          <p className="text-sm font-black uppercase tracking-widest text-[var(--capd-green)]">
            Investors
          </p>

          <h1 className="mt-5 text-5xl font-black leading-tight text-[var(--capd-navy)] md:text-6xl">
            Invest in a cooperative model built around real businesses.
          </h1>

          <p className="mt-7 max-w-2xl text-xl leading-8 text-slate-600">
            CAPDCOOP gives investors and strategic partners a structured way to
            participate in cooperative finance, small business growth, and
            community-based economic development.
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <Link
              href="/contact"
              className="rounded-2xl bg-[var(--capd-navy)] px-7 py-4 font-bold text-white transition-all duration-300 hover:bg-[var(--capd-green)]"
            >
              Contact Investment Team
            </Link>

            <Link
              href="/membership"
              className="rounded-2xl border border-slate-300 bg-white px-7 py-4 font-bold text-[var(--capd-navy)] transition-all duration-300 hover:border-[var(--capd-green)] hover:text-[var(--capd-green)]"
            >
              Become a Member
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] bg-gradient-to-br from-[var(--capd-navy)] to-[#0B4A3A] p-8 text-white shadow-xl">
          <p className="text-sm font-black uppercase tracking-widest text-[var(--capd-gold)]">
            Structured Participation
          </p>

          <h2 className="mt-4 text-4xl font-black leading-tight">
            Finance that follows real market activity.
          </h2>

          <p className="mt-5 text-white/75">
            Our work focuses on members, small businesses, payment discipline,
            business support, and transparent cooperative records.
          </p>

          <div className="mt-8 grid gap-4">
            {[
              "Cooperative share participation",
              "Small business finance exposure",
              "Structured membership records",
              "Community economic impact",
            ].map((item) => (
              <div key={item} className="rounded-2xl bg-white/10 p-5">
                <p className="font-bold">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-black text-[var(--capd-navy)]">
            Why CAPDCOOP?
          </h2>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Real Economy Focus",
                body: "We work around traders, entrepreneurs, and daily cash-flow businesses that drive local economic activity.",
              },
              {
                title: "Operational Visibility",
                body: "Our platform tracks members, payments, applications, documents, and portfolio activity in one system.",
              },
              {
                title: "Shared Growth",
                body: "The cooperative model aligns participation, support, and long-term value creation for members and partners.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm"
              >
                <h3 className="text-xl font-black text-[var(--capd-navy)]">
                  {item.title}
                </h3>

                <p className="mt-3 leading-7 text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}