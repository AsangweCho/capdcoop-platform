import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Image from "next/image";
import BrandLogo from "@/components/BrandLogo";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Landmark,
  ShieldCheck,
  Sprout,
  Users,
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
<Link href="/" className="flex items-center">
  <BrandLogo compact />
</Link>

          <nav className="hidden items-center gap-3 lg:flex">
  <Link
    href="/about"
    className="rounded-2xl bg-[var(--capd-navy)] px-5 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-[var(--capd-green)]"
  >
    About
  </Link>

  <Link
    href="/membership"
    className="rounded-2xl bg-[var(--capd-navy)] px-5 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-[var(--capd-green)]"
  >
    Membership
  </Link>

  <Link
    href="/investors"
    className="rounded-2xl bg-[var(--capd-navy)] px-5 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-[var(--capd-green)]"
  >
    Investors
  </Link>

  <Link
    href="/business-support"
    className="rounded-2xl bg-[var(--capd-navy)] px-5 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-[var(--capd-green)]"
  >
    Business Support
  </Link>

  <Link
    href="/faq"
    className="rounded-2xl bg-[var(--capd-navy)] px-5 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-[var(--capd-green)]"
  >
    FAQ
  </Link>

  <Link
    href="/contact"
    className="rounded-2xl bg-[var(--capd-navy)] px-5 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-[var(--capd-green)]"
  >
    Contact
  </Link>
</nav>

  <div className="hidden items-center gap-3 md:flex">
  <Link
    href="/login"
    className="rounded-2xl bg-[var(--capd-navy)] px-5 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-[var(--capd-green)]"
  >
    Login
  </Link>

  <Link
    href="/apply"
    className="rounded-2xl bg-[var(--capd-navy)] px-5 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-[var(--capd-green)]"
  >
    Apply
  </Link>
</div>
        </div>
      </header>

      <section className="bg-gradient-to-br from-white via-slate-50 to-blue-50">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-6 py-14 lg:grid-cols-2">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#009B5A]/10 px-4 py-2 text-sm font-black text-[#007A46]">
              <ShieldCheck size={16} />
              Cooperative finance for real businesses
            </div>

            <h1 className="text-[2.65rem] font-black leading-[1.08] text-[#0D2D6E] sm:text-5xl md:text-6xl lg:text-7xl">
              Financing Businesses. Strengthening Communities.
            </h1>

            <p className="mt-6 max-w-2xl text-[1.05rem] leading-8 text-slate-600 sm:text-xl">
              CAPDCOOP is a modern cooperative helping members participate in
              shared economic growth while supporting productive small
              businesses with structured financing and practical supervision.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <a
                href="/apply"
                className="inline-flex items-center rounded-2xl bg-[#009B5A] px-7 py-4 font-bold text-white hover:opacity-90"
              >
                Apply for Business Support
              </a>

              <a
                href="/about"
                className="rounded-2xl border border-slate-300 bg-white px-7 py-4 font-bold text-slate-700 hover:bg-slate-50"
              >
                Learn More
              </a>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                "Member-owned cooperative model",
                "Structured share participation",
                "Business financing and supervision",
                "Transparent governance and records",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 rounded-2xl border bg-white p-4 text-sm font-bold shadow-sm"
                >
                  <CheckCircle2 size={17} className="text-[#009B5A]" />
                  {item}
                </div>
              ))}
            </div>
          </div>

        <div className="relative">
  <div className="overflow-hidden rounded-[2rem] shadow-2xl">
    <Image
      src="/images/home-hero.jpg"
      alt="CAPDCOOP cooperative market trader"
      width={1200}
      height={900}
      priority
      className="h-full w-full object-cover"
    />
  </div>

  <div className="absolute -bottom-6 -left-6 rounded-3xl bg-white p-6 shadow-xl">
    <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#009B5A]">
      Cooperative Impact
    </p>

    <p className="mt-2 text-2xl font-black text-[#0D2D6E]">
      Empowering businesses daily
    </p>
  </div>
</div>
        </div>
      </section>

      <section className="border-y bg-white py-10">
        <div className="mx-auto grid max-w-7xl gap-5 px-6 md:grid-cols-4">
          {[
            ["Members", "Digital records"],
            ["Shares", "Tracked securely"],
            ["Payments", "Admin validated"],
            ["Applications", "Workflow managed"],
          ].map(([title, text]) => (
            <div key={title} className="rounded-3xl bg-slate-50 p-6">
              <p className="text-3xl font-black text-[#0D2D6E]">{title}</p>
              <p className="mt-2 font-semibold text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#F8FAFC] py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-black uppercase tracking-widest text-[#009B5A]">
              What we do
            </p>
            <h2 className="mt-3 text-5xl font-black text-[#0D2D6E]">
              A cooperative built around people, businesses, and discipline.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              CAPDCOOP combines membership participation with practical business
              support, transparent records, and structured financing workflows.
            </p>
          </div>

          <div className="mt-14 grid gap-7 md:grid-cols-3">
            {[
              {
                title: "Member Participation",
                text: "Members can participate through shares, track their portfolio, and access cooperative records through a secure portal.",
                icon: Users,
              },
              {
                title: "Business Financing",
                text: "Eligible businesses can apply for support, submit documents, and move through a structured review process.",
                icon: Building2,
              },
              {
                title: "Governance & Records",
                text: "CAPDCOOP is designed for transparent approvals, member records, payment validation, and document-backed decisions.",
                icon: Landmark,
              },
            ].map(({ title, text, icon: Icon }) => (
              <div
                key={title}
                className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm"
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0D2D6E]/10 text-[#0D2D6E]">
                  <Icon size={26} />
                </div>
                <h3 className="text-2xl font-black text-[#0D2D6E]">{title}</h3>
                <p className="mt-4 leading-7 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-2">
          <div className="rounded-[2rem] bg-[#0D2D6E] p-8 text-white">
            <Sprout className="text-[#D4A017]" size={36} />
            <h2 className="mt-5 text-4xl font-black">
              For entrepreneurs and small businesses
            </h2>
            <p className="mt-5 leading-8 text-white/75">
              CAPDCOOP supports businesses that need financing to grow stock,
              improve operations, and strengthen daily cash-flow discipline.
            </p>
            <a
              href="/business-support"
              className="mt-8 inline-flex rounded-2xl bg-white px-6 py-4 font-bold text-[#0D2D6E]"
            >
              Explore Business Support
            </a>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-8">
            <Users className="text-[#009B5A]" size={36} />
            <h2 className="mt-5 text-4xl font-black text-[#0D2D6E]">
              For members and shareholders
            </h2>
            <p className="mt-5 leading-8 text-slate-600">
              Members can participate in cooperative growth, submit payments,
              track shares, view approved records, and remain connected to
              cooperative governance.
            </p>
            <a
              href="/membership"
              className="mt-8 inline-flex rounded-2xl bg-[#0D2D6E] px-6 py-4 font-bold text-white"
            >
              Learn About Membership
            </a>
          </div>
        </div>
      </section>

      <section className="bg-[#0D2D6E] py-16 text-white">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <p className="font-black uppercase tracking-widest text-[#D4A017]">
            Stronger Together
          </p>
          <h2 className="mt-3 text-5xl font-black">
            Build with a cooperative that understands local business realities.
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white/75">
            Whether you want to become a member, apply for business support, or
            partner with CAPDCOOP, the platform gives you a structured way to
            begin.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <a
              href="/apply"
              className="rounded-2xl bg-[#009B5A] px-7 py-4 font-bold text-white"
            >
              Apply for Support
            </a>
            <a
              href="/login"
              className="rounded-2xl bg-white px-7 py-4 font-bold text-[#0D2D6E]"
            >
              Member Login
            </a>
          </div>
        </div>
      </section>

<SiteFooter />
    </main>
  );
}