import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Mail, MapPin, Phone, Send, ShieldCheck } from "lucide-react";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
<SiteHeader />

      <section className="bg-gradient-to-br from-white via-slate-50 to-blue-50 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <p className="font-black uppercase tracking-widest text-[#009B5A]">
            Contact CAPDCOOP
          </p>

          <h1 className="mt-4 max-w-5xl text-5xl font-black leading-tight text-[#0D2D6E] md:text-7xl">
            Speak with us about membership, shares, or business support.
          </h1>

          <p className="mt-7 max-w-3xl text-xl leading-8 text-slate-600">
            Whether you want to join the cooperative, apply for business support,
            or speak with our team, we are ready to guide you through the next
            step.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-5">
            {[
              {
                title: "Phone",
                value: "691 769 863 / 672 697 652",
                icon: Phone,
              },
              {
                title: "Email",
                value: "info@capdcoop.com",
                icon: Mail,
              },
              {
                title: "Office",
                value: "Bonaberi, Douala, Cameroon",
                icon: MapPin,
              },
            ].map(({ title, value, icon: Icon }) => (
              <div
                key={title}
                className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-[#0D2D6E]/10 p-3 text-[#0D2D6E]">
                    <Icon size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[#0D2D6E]">
                      {title}
                    </h3>
                    <p className="mt-2 font-semibold leading-7 text-slate-600">
                      {value}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            <div className="rounded-[2rem] bg-[#0D2D6E] p-7 text-white">
              <ShieldCheck className="text-[#D4A017]" size={34} />
              <h3 className="mt-4 text-2xl font-black">
                For faster processing
              </h3>
              <p className="mt-3 leading-7 text-white/75">
                If you are applying for business support, prepare your ID,
                business photos, location proof, guarantor information, and a
                clear explanation of how the financing will be used.
              </p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-8">
            <h2 className="text-3xl font-black text-[#0D2D6E]">
              Send an enquiry
            </h2>
            <p className="mt-3 text-slate-600">
              This form is currently for presentation. Direct online message
              submission can be connected after deployment.
            </p>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <input
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none"
                placeholder="Full name"
              />
              <input
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none"
                placeholder="Phone number"
              />
              <input
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none md:col-span-2"
                placeholder="Email address"
              />
              <select className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none md:col-span-2">
                <option>Membership enquiry</option>
                <option>Business support enquiry</option>
                <option>Payment support</option>
                <option>Partnership</option>
              </select>
              <textarea
                className="min-h-[160px] rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none md:col-span-2"
                placeholder="Your message"
              />
            </div>

            <button className="mt-7 inline-flex items-center rounded-2xl bg-[#0D2D6E] px-7 py-4 font-bold text-white">
              Send Message <Send className="ml-2" size={18} />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}