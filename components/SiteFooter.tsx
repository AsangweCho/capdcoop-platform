import BrandLogo from "./BrandLogo";

export default function SiteFooter() {
  return (
    <footer className="border-t bg-white py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <BrandLogo />
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
            CAPDCOOP supports membership participation, structured business
            financing, and cooperative growth.
          </p>
        </div>

        <div className="flex flex-wrap gap-5 text-sm font-bold text-slate-600">
          <a href="/about">About</a>
          <a href="/membership">Membership</a>
          <a href="/business-support">Business Support</a>
          <a href="/contact">Contact</a>
          <a href="/login">Login</a>
        </div>
      </div>
    </footer>
  );
}