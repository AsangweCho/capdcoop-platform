import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

export default function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
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

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden rounded-2xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 transition-all duration-300 hover:border-[var(--capd-green)] hover:text-[var(--capd-green)] sm:inline-flex"
          >
            Member Login
          </Link>

          <Link
            href="/apply"
            className="rounded-2xl bg-[var(--capd-navy)] px-4 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-[var(--capd-green)] sm:px-5"
          >
            Apply
          </Link>
        </div>
      </div>
    </header>
  );
}