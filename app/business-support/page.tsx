import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { ArrowRight, CheckCircle2, FileText, SearchCheck, ShieldCheck, WalletCards } from "lucide-react";
import Image from "next/image";

export default function BusinessSupportPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
<SiteHeader />

<section className="bg-gradient-to-br from-white via-slate-50 to-blue-50 py-16">
  <div className="mx-auto grid max-w-7xl items-center gap-8 px-6 lg:grid-cols-2">
    <div>
      <p className="font-black uppercase tracking-widest text-[#009B5A]">
        Business Support
      </p>

      <h1 className="mt-4 text-5xl font-black leading-tight text-[#0D2D6E] md:text-7xl">
        Structured financing for real businesses with daily cash flow.
      </h1>

      <p className="mt-7 max-w-3xl text-xl leading-8 text-slate-600">
        CAPDCOOP supports productive small businesses that need capital
        to grow stock, improve operations, and build stronger financial
        discipline.
      </p>

      <a
        href="/apply"
        className="mt-9 inline-flex items-center rounded-2xl bg-[#009B5A] px-7 py-4 font-bold text-white"
      >
        Apply for Business Support
        <ArrowRight className="ml-2" size={18} />
      </a>
    </div>

    <div className="relative">
      <div className="overflow-hidden rounded-[2rem] shadow-2xl">
        <Image
          src="/images/business-support.jpg"
          alt="CAPDCOOP business support"
          width={1200}
          height={900}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="absolute -bottom-6 -left-6 rounded-3xl bg-white p-6 shadow-xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#009B5A]">
          Practical Finance
        </p>

        <p className="mt-2 text-2xl font-black text-[#0D2D6E]">
          Capital with supervision
        </p>
      </div>
    </div>
  </div>
</section>

      <section className="bg-[#F8FAFC] py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-2">
          <div>
            <p className="font-black uppercase tracking-widest text-[#009B5A]">Who qualifies?</p>
            <h2 className="mt-3 text-4xl font-black text-[#0D2D6E]">
              We focus on businesses that already operate and generate daily revenue.
            </h2>

            <div className="mt-8 grid gap-4">
              {[
                "Existing small businesses with visible activity",
                "Businesses with regular cash flow",
                "Owners willing to provide documents and verification",
                "Businesses seeking capital for stock, operations, or expansion",
                "Applicants with guarantor details where required",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-3xl bg-white p-5 shadow-sm">
                  <CheckCircle2 className="text-[#009B5A]" size={22} />
                  <p className="font-semibold text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-[#0D2D6E] p-8 text-white">
            <ShieldCheck className="text-[#D4A017]" size={38} />
            <h3 className="mt-5 text-3xl font-black">A disciplined review process.</h3>
            <p className="mt-5 leading-8 text-white/75">
              Every application moves through a structured workflow: submission, review, field verification, approval, rejection, or disbursement.
            </p>

            <div className="mt-8 grid gap-4">
              {["Submitted", "Under Review", "Field Verification", "Approved / Rejected", "Disbursed"].map((step, index) => (
                <div key={step} className="flex items-center gap-4 rounded-3xl bg-white/10 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white font-black text-[#0D2D6E]">
                    {index + 1}
                  </div>
                  <p className="font-bold">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#0D2D6E] py-14 text-white">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-4xl font-black">Ready to apply for business support?</h2>
          <p className="mx-auto mt-5 max-w-3xl leading-8 text-white/75">
            Submit your application and documents online. CAPDCOOP will review your request through its internal underwriting workflow.
          </p>
          <a href="/apply" className="mt-8 inline-flex rounded-2xl bg-white px-7 py-4 font-bold text-[#0D2D6E]">
            Start Application
          </a>
        </div>
      </section>
    </main>
  );
}