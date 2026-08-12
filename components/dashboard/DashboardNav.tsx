import Link from "next/link";
import SignOutButton from "./SignOutButton";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/tableau", label: "Tableau" },
  { href: "/dashboard/relance", label: "Relance" },
  { href: "/dashboard/recherche", label: "Recherche" },
];

export default function DashboardNav() {
  return (
    <header className="border-b border-line bg-paper">
      <div className="container-tight flex h-16 items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-blaze" aria-hidden />
          <span className="font-display text-xl font-semibold tracking-wide">
            TRAQUE
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-mono text-xs uppercase tracking-widest text-text-ink/70 transition-colors hover:text-text-ink"
            >
              {l.label}
            </Link>
          ))}
          <SignOutButton />
        </nav>
      </div>
    </header>
  );
}
