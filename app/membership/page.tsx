import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
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
<SiteHeader />

  <section className="bg-gradient-to-br from-white via-slate-50 to-blue-50 py-24">
  <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 lg:grid-cols-2">
    <div>
      <p className="font-black uppercase tracking-widest text-[#009B5A]">
        Membership
      </p>

      <h1 className="mt-4 text-5xl font-black leading-tight text-[#0D2D6E] md:text-7xl">
        Become part of a cooperative built for shared growth.
      </h1>

      <p className="mt-7 max-w-3xl text-xl leading-8 text-slate-600">
        CAPDCOOP membership gives individuals a structured way to
        participate in cooperative ownership, track share records,
        and support real business growth in the community.
      </p>

      <div className="mt-9 flex flex-wrap gap-4">
        <a
          href="/contact"
          className="inline-flex items-center rounded-2xl bg-[#0D2D6E] px-7 py-4 font-bold text-white"
        >
          Start Membership Enquiry
          <ArrowRight className="ml-2" size={18} />
        </a>

        <a
          href="/login"
          className="rounded-2xl border border-slate-300 bg-white px-7 py-4 font-bold text-slate-700"
        >
          Member Login
        </a>
      </div>
    </div>

    <div className="relative">
      <div className="overflow-hidden rounded-[2rem] shadow-2xl">
        <Image
          src="/images/membership-members.jpg"
          alt="CAPDCOOP members"
          width={1200}
          height={900}
          className="h-full w-full object-cover"/>
      </div>

      <div className="absolute -bottom-6 -left-6 rounded-3xl bg-white p-6 shadow-xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#009B5A]">
          Shared Ownership
        </p>

        <p className="mt-2 text-2xl font-black text-[#0D2D6E]">
          Building wealth together
        </p>
      </div>
    </div>
  </div>
</section>
      <section className="bg-[#F8FAFC] py-24">
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

      <section className="bg-[#0D2D6E] py-20 text-white">
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