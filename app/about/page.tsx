import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { CheckCircle2, ShieldCheck, Users, Building2 } from "lucide-react";
import Image from "next/image";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
  <SiteHeader />

      <section className="bg-gradient-to-br from-white via-slate-50 to-blue-50 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <p className="font-black uppercase tracking-widest text-[#009B5A]">
            About CAPDCOOP
          </p>

          <h1 className="mt-4 max-w-5xl text-5xl font-black leading-tight text-[#0D2D6E] md:text-7xl">
            A cooperative built to finance businesses and strengthen communities.
          </h1>

          <p className="mt-7 max-w-3xl text-xl leading-8 text-slate-600">
            CAPDCOOP is a modern cooperative created to help members participate
            in structured economic growth while supporting productive small
            businesses with financing, supervision, and practical business
            discipline.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-2">
          <div>
            <p className="font-black uppercase tracking-widest text-[#009B5A]">
              Our purpose
            </p>
            <h2 className="mt-3 text-4xl font-black text-[#0D2D6E]">
              We exist to make capital more useful, disciplined, and accessible.
            </h2>
            <p className="mt-5 leading-8 text-slate-600">
              Many hardworking entrepreneurs operate viable businesses but lack
              structured capital, financial discipline, and management support.
              CAPDCOOP addresses this gap through a cooperative model that
              brings members, businesses, and administrators into one accountable
              operating system.
            </p>
            <p className="mt-5 leading-8 text-slate-600">
              Our approach goes beyond giving money. We focus on records,
              verification, payments, supervision, and follow-through because
              real growth requires structure.
            </p>
          </div>
          <div className="relative">
  <div className="overflow-hidden rounded-[2rem] shadow-2xl">
    <Image
      src="/images/about-community.jpg"
      alt="CAPDCOOP community members"
      width={1200}
      height={900}
      className="h-full w-full object-cover"/>
  </div>

  <div className="absolute -bottom-6 -right-6 rounded-3xl bg-white p-6 shadow-xl">
    <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#009B5A]">
      Cooperative Foundation
    </p>

    <p className="mt-2 text-2xl font-black text-[#0D2D6E]">
      Built on trust and accountability
    </p>
  </div>
</div> 
        </div>
      </section>

      <section className="bg-[#F8FAFC] py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-7 md:grid-cols-3">
            {[
              {
                title: "Members",
                text: "Members participate in cooperative growth and track shares, payments, and declarations through a secure portal.",
                icon: Users,
              },
              {
                title: "Businesses",
                text: "Businesses can apply for support, submit documents, and move through a structured review process.",
                icon: Building2,
              },
              {
                title: "Governance",
                text: "Administrative workflows make approvals, member updates, and records easier to manage responsibly.",
                icon: ShieldCheck,
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

      <section className="bg-[#0D2D6E] py-14 text-white">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-4xl font-black">
            CAPDCOOP is built for practical economic impact.
          </h2>
          <p className="mx-auto mt-5 max-w-3xl leading-8 text-white/75">
            Our mission is simple: strengthen members, finance productive
            businesses, and support communities through structure and discipline.
          </p>
          <a
            href="/membership"
            className="mt-8 inline-flex rounded-2xl bg-white px-7 py-4 font-bold text-[#0D2D6E]"
          >
            Become a Member
          </a>
        </div>
      </section>
    </main>
  );
}