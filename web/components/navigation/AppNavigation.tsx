"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Compass,
  House,
  MessageCircle,
  Network,
  Settings,
  UserRound,
} from "lucide-react";
import LogoutButton from "@/components/auth/LogoutButton";
import HiBookLogo from "@/components/brand/HiBookLogo";

const items = [
  { href: "/community", label: "Community", icon: House },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/network/followers", label: "Network", icon: Network },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export default function AppNavigation() {
  const pathname = usePathname();

  return (
    <>
      <header className="hb-app-header">
        <div className="hb-app-header__inner">
          <Link href="/community" className="hb-app-brand" aria-label="Hi!Book home">
            <HiBookLogo className="hb-logo" compact aria-hidden="true" />
            <span>Hi!Book</span>
          </Link>

          <nav className="hb-app-nav" aria-label="Main navigation">
            {items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className="hb-app-nav-link"
                >
                  <Icon size={16} strokeWidth={2} aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <Link
              href="/settings"
              aria-current={pathname === "/settings" ? "page" : undefined}
              aria-label="Settings"
              className="hb-app-nav-link hb-app-nav-link--icon"
            >
              <Settings size={17} aria-hidden="true" />
            </Link>
          </nav>

          <div className="hb-app-header__actions">
            <Link
              href="/profile"
              className="hb-app-icon-button"
              aria-label="Open your profile"
            >
              <UserRound size={17} aria-hidden="true" />
            </Link>

            <Link
              href="/settings"
              className="hb-app-icon-button md:hidden"
              aria-label="Open settings"
            >
              <Settings size={17} aria-hidden="true" />
            </Link>

            <div className="hidden md:block">
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <nav className="hb-app-mobile-nav" aria-label="Mobile navigation">
        <div className="hb-app-mobile-nav__inner">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="hb-app-mobile-link"
              >
                <Icon size={17} strokeWidth={2} aria-hidden="true" />
                <span className="hb-app-mobile-link__label">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
