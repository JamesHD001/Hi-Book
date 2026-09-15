"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/auth/LogoutButton";

const links = [
  { href: "/community", label: "Home", icon: "⌂" },
  { href: "/discover", label: "Discover", icon: "◎" },
  { href: "/network/followers", label: "Network", icon: "◌" },
  { href: "/messages", label: "Messages", icon: "◇" },
  { href: "/notifications", label: "Notifications", icon: "!" },
  { href: "/profile", label: "Profile", icon: "○" },
];

export default function CommunityNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex min-h-[68px] max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/community" className="group flex shrink-0 items-center gap-2.5" aria-label="Hi!Book home">
          <span className="grid h-10 w-10 place-items-center rounded-[13px] bg-[linear-gradient(135deg,#315efb,#8b5cf6)] text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(49,94,251,0.22)] transition group-hover:-translate-y-0.5">
            H!
          </span>
          <span className="hidden text-lg font-extrabold tracking-[-0.04em] text-slate-950 sm:block">Hi!Book</span>
        </Link>

        <nav aria-label="Main navigation" className="hidden flex-1 items-center gap-1 md:flex">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-[#eef2ff] text-[#315efb]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                }`}
              >
                <span className="text-base" aria-hidden="true">{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/profile"
            className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:flex"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-[#eef2ff] text-xs font-extrabold text-[#315efb]" aria-hidden="true">○</span>
            <span>My profile</span>
          </Link>
          <LogoutButton />
        </div>
      </div>

      <nav aria-label="Mobile navigation" className="border-t border-slate-100 bg-white md:hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-6 gap-1 px-2 py-2 sm:px-6">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold transition ${
                  active ? "bg-[#eef2ff] text-[#315efb]" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <span className="text-base leading-none" aria-hidden="true">{link.icon}</span>
                <span className="truncate">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
