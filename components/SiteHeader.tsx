import BrandLogo from "./BrandLogo";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <a href="/" className="flex items-center">
          <BrandLogo />
        </a>

        <nav className="hidden items-center gap-7 text-sm font-bold text-slate-700 lg:flex">
          <a href="/about" className="hover:text-[var(--capd-navy)]">
            About
          </a>
          <a href="/membership" className="hover:text-[var(--capd-navy)]">
            Membership
          </a>
          <a href="/business-support" className="hover:text-[var(--capd-navy)]">
            Business Support
          </a>
          <a href="/faq" className="hover:text-[var(--capd-navy)]">
            FAQ
          </a>
          <a href="/contact" className="hover:text-[var(--capd-navy)]">
            Contact
          </a>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href="/login"
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Login
          </a>
          <a
            href="/apply"
            className="rounded-2xl bg-[var(--capd-navy)] px-5 py-3 text-sm font-bold text-white hover:opacity-90"
          >
            Apply
          </a>
        </div>
      </div>
    </header>
  );
}