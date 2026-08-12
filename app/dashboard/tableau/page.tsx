import Link from "next/link";
import DashboardNav from "@/components/dashboard/DashboardNav";
import { getSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type Group = { activite: string; zone: string; count: number };

export default async function TableauListPage() {
  const supabase = await getSupabaseServer();

  const { data: companies } = await supabase
    .from("companies")
    .select("activite, zone, created_at")
    .order("created_at", { ascending: false });

  // Regroupement en mémoire : companies est la mémoire brute de découverte
  // (une ligne par entreprise, pas de notion de "tableau" en base), donc
  // on reconstitue les groupes activité+zone ici plutôt que côté SQL.
  const groups = new Map<string, Group>();
  for (const c of companies ?? []) {
    const key = `${c.activite}__${c.zone}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count++;
    } else {
      groups.set(key, { activite: c.activite, zone: c.zone, count: 1 });
    }
  }
  const list = Array.from(groups.values());

  return (
    <main className="min-h-screen bg-paper">
      <DashboardNav />
      <div className="container-tight py-14">
        <h1 className="mb-8 font-display text-2xl font-semibold uppercase text-text-ink/80">
          Tableau
        </h1>

        {list.length === 0 ? (
          <div className="flex min-h-[40vh] items-center justify-center text-center">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-text-ink/40">
                Tableau
              </p>
              <h2 className="mt-2 font-display text-xl font-semibold uppercase text-text-ink/70">
                Rien à afficher pour l&rsquo;instant
              </h2>
              <p className="mt-3 text-sm text-text-ink/50">
                Lance une recherche pour avoir des prospects à travailler ici.
              </p>
              <Link href="/dashboard/recherche" className="btn-blaze mt-6 inline-block">
                Nouvelle recherche
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((g) => (
              <Link
                key={`${g.activite}__${g.zone}`}
                href={`/dashboard/tableau/resultats?activite=${encodeURIComponent(
                  g.activite
                )}&zone=${encodeURIComponent(g.zone)}`}
                className="block border border-line p-5 transition-colors hover:border-ink"
              >
                <p className="font-mono text-[11px] uppercase tracking-widest text-text-ink/45">
                  {g.activite} · {g.zone}
                </p>
                <p className="mt-1 font-display text-lg">{g.count} prospects</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
