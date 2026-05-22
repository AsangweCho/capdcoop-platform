"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const links = [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Membership", href: "/membership" },
    { label: "Investors", href: "/investors" },
    { label: "Business Support", href: "/business-support" },
    { label: "Contact", href: "/contact" },
    { label: "Login", href: "/login" },
  ];

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="sticky top-0 z-50 hidden border-b border-[#0D2D6E]/10 bg-white/95 px-6 py-3 shadow-sm backdrop-blur lg:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/capdcoop-logo.png"
              alt="CAPDCOOP Logo"
              className="h-12 w-auto"
            />
          </Link>

          <div className="flex items-center gap-2 rounded-full bg-[#F1F5F9] p-2">
            {links.map((link) => {
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-5 py-3 text-sm font-black transition-all duration-300 ${
                    isActive
                      ? "bg-[#0D2D6E] text-white shadow-md"
                      : "text-slate-700 hover:bg-[#009B5A] hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="sticky top-0 z-50 border-b border-[#0D2D6E]/10 bg-white/95 px-4 py-3 shadow-xl backdrop-blur lg:hidden">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/capdcoop-logo.png"
              alt="CAPDCOOP Logo"
              className="h-10 w-auto"
            />
          </Link>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0D2D6E] text-white shadow-lg transition hover:bg-[#009B5A]"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="grid gap-2">
              {links.map((link) => {
                const isActive = pathname === link.href;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`rounded-2xl px-4 py-3 text-sm font-black transition-all ${
                      isActive
                        ? "bg-[#0D2D6E] text-white"
                        : "bg-slate-50 text-slate-700 hover:bg-[#009B5A] hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}