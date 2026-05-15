"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { EmergencyStop } from "@/components/emergency-stop";
import { ConnectionStatus } from "@/components/connection-status";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/calibrate", label: "Calibrate" },
  { href: "/control", label: "Control" },
  { href: "/teach", label: "Teach" },
  { href: "/scripts", label: "Scripts" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="bg-slate-900 sticky top-0 z-50 shadow-lg">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between px-6 h-14">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
              <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
              </svg>
            </div>
            <span className="text-white font-semibold text-base tracking-tight">uARM Control</span>
          </Link>

          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(({ href, label }) => {
              const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`nav-link ${isActive ? "nav-link-active" : "nav-link-default"}`}
                >
                  {label}
                </Link>
              );
            })}
            <Link
              href="/safety"
              className={`nav-link ${pathname.startsWith("/safety") ? "text-red-300 bg-red-500/15" : "nav-link-danger"}`}
            >
              Safety
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <KeyboardShortcuts />
          <ConnectionStatus />
          <EmergencyStop />
        </div>
      </div>
    </header>
  );
}
