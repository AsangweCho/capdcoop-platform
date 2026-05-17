import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { HelpCircle, CheckCircle2 } from "lucide-react";

const faqs = [
  {
    question: "How do I become a CAPDCOOP beneficiary?",
    answer:
      "To benefit from CAPDCOOP programs and financial assistance, you must first become a registered member of the cooperative.",
  },
  {
    question: "How do I become a registered member?",
    answer:
      "Membership is open to eligible Cameroonians. To become a full member, you pay a registration fee of 5,000 FCFA, a compulsory construction contribution of 10,000 FCFA, and purchase at least one share of 10,000 FCFA. The minimum total is therefore 25,000 FCFA.",
  },
  {
    question: "Is membership registration renewed every year?",
    answer:
      "No. Membership registration is paid once. It is not renewed yearly.",
  },
  {
    question: "Is the program open to non-Cameroonians?",
    answer:
      "No. CAPDCOOP membership is currently open to Cameroonians.",
  },
  {
    question: "What services does CAPDCOOP provide?",
    answer:
      "CAPDCOOP provides financial assistance to members, business consultancy, affordable group insurance, agricultural production and marketing support, sourcing of critical agricultural products, and support for land leasing and plantation farming initiatives.",
  },
  {
    question: "What benefits do registered members receive?",
    answer:
      "Registered members may access business financing, agricultural and commercial project support, discounted agricultural products, annual dividends on declared shares, cheaper insurance options, business consultancy, and management support.",
  },
];

export default function FAQPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
    <SiteHeader />

      <section className="bg-gradient-to-br from-white via-slate-50 to-blue-50 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <p className="font-black uppercase tracking-widest text-[#009B5A]">
            Frequently Asked Questions
          </p>

          <h1 className="mt-4 max-w-5xl text-5xl font-black leading-tight text-[#0D2D6E] md:text-7xl">
            Clear answers about membership, benefits, and support.
          </h1>

          <p className="mt-7 max-w-3xl text-xl leading-8 text-slate-600">
            These answers help prospective members understand how CAPDCOOP
            membership works, what it costs, and the benefits available through
            the cooperative.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[0.75fr_1.25fr]">
          <div className="rounded-[2rem] bg-[#0D2D6E] p-8 text-white">
            <HelpCircle className="text-[#D4A017]" size={40} />

            <h2 className="mt-5 text-3xl font-black">
              Need help deciding where to start?
            </h2>

            <p className="mt-5 leading-8 text-white/75">
              Start with membership if you want to participate in the
              cooperative. Start with business support if you already operate a
              business and want financing assistance.
            </p>

            <div className="mt-8 grid gap-4">
              {[
                "Membership starts from 25,000 FCFA",
                "Registration is paid once",
                "Members can access financial assistance",
                "Business applications require review",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="text-[#D4A017]" size={20} />
                  <span className="font-semibold text-white/85">{item}</span>
                </div>
              ))}
            </div>

            <a
              href="/contact"
              className="mt-8 inline-flex rounded-2xl bg-white px-6 py-4 font-bold text-[#0D2D6E]"
            >
              Contact CAPDCOOP
            </a>
          </div>

          <div className="grid gap-5">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm"
              >
                <h3 className="text-xl font-black text-[#0D2D6E]">
                  {faq.question}
                </h3>
                <p className="mt-4 leading-8 text-slate-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F8FAFC] py-14">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-4xl font-black text-[#0D2D6E]">
            Still have questions?
          </h2>
          <p className="mx-auto mt-5 max-w-3xl leading-8 text-slate-600">
            Contact CAPDCOOP directly and our team will guide you on membership,
            share participation, payments, or business support.
          </p>
          <a
            href="/contact"
            className="mt-8 inline-flex rounded-2xl bg-[#0D2D6E] px-7 py-4 font-bold text-white"
          >
            Speak With Us
          </a>
        </div>
      </section>
    </main>
  );
}