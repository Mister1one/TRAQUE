import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase-server";
import DashboardNav from "@/components/dashboard/DashboardNav";
import ScoreBadge from "@/components/dashboard/ScoreBadge";
import StatusBadge from "@/components/dashboard/StatusBadge";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await getSupabaseServer();
  const { data: prospects, error } = await supabase
    .from("prospects")
    .select("*")
    .order("score", { ascending: false, nullsFirst: false });

  return (
    <main className="min-h-screen bg-paper">
      <DashboardNav />
      <div className="container-tight py-10">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-display text-3xl font-semibold uppercase">
            Prospects
          </h1>
          <Link href="/dashboard/nouvelle-recherche" className="btn-blaze !px-4 !py-2.5 text-xs">
            Nouvelle recherche
          </Link>
        </div>

        {error && (
          <p className="border border-blaze/40 bg-blaze/5 p-4 text-sm text-blaze">
            Erreur de chargement : {error.message}
          </p>
        )}

        {!error && (!prospects || prospects.length === 0) && (
          <div className="border border-line p-10 text-center">
            <p className="text-text-ink/60">
              Aucun prospect pour l&rsquo;instant.
            </p>
            <Link
              href="/dashboard/nouvelle-recherche"
              className="btn-ghost mt-5 inline-flex"
            >
              Lancer une première recherche
            </Link>
          </div>
        )}

        {prospects && prospects.length > 0 && (
          <div className="overflow-x-auto border border-line">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr className="border-b border-line bg-ink text-text-paper">
                  <th className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-widest">
                    Score
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-widest">
                    Nom
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-widest">
                    Activité
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-widest">
                    Zone
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-widest">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {prospects.map((p) => (
                  <tr key={p.id} className="hover:bg-ink/5">
                    <td className="px-4 py-3">
                      <ScoreBadge score={p.score} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/prospect/${p.id}`}
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-ink/70">
                      {p.category ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-ink/70">
                      {p.city ?? p.source_zone ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
