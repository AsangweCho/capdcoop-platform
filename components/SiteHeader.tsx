import BrandLogo from "./BrandLogo";

export default function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
  <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
    <a href="/" className="flex items-center">
      <BrandLogo compact />
    </a>

    <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 lg:flex">
      <a href="/about" className="hover:text-[var(--capd-navy)]">About</a>
      <a href="/membership" className="hover:text-[var(--capd-navy)]">Membership</a>
      <a href="/business-support" className="hover:text-[var(--capd-navy)]">Business Support</a>
      <a href="/faq" className="hover:text-[var(--capd-navy)]">FAQ</a>
      <a href="/contact" className="hover:text-[var(--capd-navy)]">Contact</a>
    </nav>

    <div className="flex items-center gap-2">
      <a
        href="/login"
        className="hidden rounded-2xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 sm:inline-flex"
      >
        Login
      </a>

      <a
        href="/apply"
        className="rounded-2xl bg-[var(--capd-navy)] px-4 py-3 text-sm font-bold text-white sm:px-5"
      >
        Apply
      </a>
    </div>
  </div>
</header>
  );
}