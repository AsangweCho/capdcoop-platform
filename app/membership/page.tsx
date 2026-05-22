import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Users,
} from "lucide-react";

export default function MembershipPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
<section className="mx-auto grid max-w-7xl items-center gap-8 px-6 py-14 lg:grid-cols-2">
  <div>
    <p className="text-sm font-black uppercase tracking-widest text-[var(--capd-green)]">
      Membership
    </p>

    <h1 className="mt-5 text-5xl font-black leading-tight text-[var(--capd-navy)] md:text-6xl">
      Become part of a cooperative built for shared growth.
    </h1>

    <p className="mt-7 max-w-2xl text-xl leading-8 text-slate-600">
      CAPDCOOP membership gives individuals a structured way to participate in
      cooperative ownership, track share records, and support real business
      growth in the community.
    </p>

    <div className="mt-9 flex flex-wrap gap-4">
      <a
        href="/membership/register"
        className="inline-flex items-center rounded-2xl bg-[#0D2D6E] px-7 py-4 font-bold text-white"
      >
        Become a Member →
      </a>

      <a
        href="/login"
        className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-7 py-4 font-bold text-[#0D2D6E]"
      >
        Member Login
      </a>
    </div>
  </div>

  <div className="relative">
    <div className="overflow-hidden rounded-[2rem] shadow-xl">
      <img
        src="/images/membership-members.jpg"
        alt="CAPDCOOP Membership"
        className="h-full w-full object-cover"
      />
    </div>

    <div className="absolute -bottom-8 left-8 rounded-3xl bg-white p-6 shadow-xl">
      <p className="text-xs font-black uppercase tracking-widest text-[var(--capd-green)]">
        Shared Ownership
      </p>

      <p className="mt-2 text-2xl font-black text-[var(--capd-navy)]">
        Building wealth together
      </p>
    </div>
  </div>
</section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-7 md:grid-cols-3">
            {[
              {
                title: "Share Participation",
                text: "Members can purchase shares and track approved allocations through their dashboard.",
                icon: Users,
              },
              {
                title: "Declared Dividends",
                text: "Members can view declared dividends when officially approved by the cooperative.",
                icon: BadgeDollarSign,
              },
              {
                title: "Digital Records",
                text: "Payments, share values, documents, and account activity are managed transparently.",
                icon: FileText,
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

      <section className="bg-[#F8FAFC] py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-2">
          <div>
            <p className="font-black uppercase tracking-widest text-[#009B5A]">
              How membership works
            </p>

            <h2 className="mt-3 text-4xl font-black text-[#0D2D6E]">
              A simple, structured membership journey.
            </h2>

            <div className="mt-8 grid gap-5">
              {[
                "Submit membership interest to CAPDCOOP.",
                "Administration verifies and creates your member profile.",
                "You receive secure login credentials.",
                "You change your password on first login.",
                "You can submit payments and track approved shares.",
              ].map((item, index) => (
                <div
                  key={item}
                  className="flex gap-4 rounded-3xl bg-white p-5 shadow-sm"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0D2D6E] font-black text-white">
                    {index + 1}
                  </div>
                  <p className="font-semibold leading-7 text-slate-700">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-[#0D2D6E] p-8 text-white">
            <ShieldCheck className="text-[#D4A017]" size={38} />
            <h3 className="mt-5 text-3xl font-black">
              Transparent member records.
            </h3>

            <p className="mt-5 leading-8 text-white/75">
              The member portal helps members follow their participation without
              confusion. Approved payments update shares and portfolio values,
              while pending payments remain visible until validated.
            </p>

            <div className="mt-8 grid gap-4">
              {[
                "Share balance",
                "Portfolio value",
                "Declared dividends",
                "Payment history",
                "Membership status",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="text-[#D4A017]" size={20} />
                  <span className="font-semibold text-white/85">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#0D2D6E] py-14 text-white">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-4xl font-black">
            Membership is participation, responsibility, and shared growth.
          </h2>
          <p className="mx-auto mt-5 max-w-3xl leading-8 text-white/75">
            Join a cooperative built to support members while financing real
            economic activity.
          </p>
          <a
            href="/contact"
            className="mt-8 inline-flex rounded-2xl bg-white px-7 py-4 font-bold text-[#0D2D6E]"
          >
            Contact CAPDCOOP
          </a>
        </div>
      </section>
    </main>
  );
}