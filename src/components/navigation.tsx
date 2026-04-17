"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Inbox, LayoutDashboard, Database } from "lucide-react";

export default function Navigation() {
  const pathname = usePathname();

  const links = [
    { href: "/leads", label: "Inbox", icon: Inbox },
    { href: "/scrape", label: "Scrape", icon: Search },
    { href: "/pipeline", label: "Pipeline", icon: LayoutDashboard },
  ];

  return (
    <nav className="flex items-center gap-6">
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-2 text-sm font-bold transition-colors ${
              isActive 
              ? "text-zinc-900 dark:text-zinc-50 underline underline-offset-8 decoration-2" 
              : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            }`}
          >
            <Icon className="h-4 w-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
