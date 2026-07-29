import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase-server";
import DashboardNav from "@/components/dashboard/DashboardNav";
import ScoreBadge from "@/components/dashboard/ScoreBadge";

export const dynamic = "force-dynamic";

export default async function RelancesPage() {
  const supabase = await getSupabaseServer();
  const today = new Date().toISOString().slice(0, 10);

  const { data: prospects, error } = await supabase
    .from("prospects")
    .select("*")
    .eq("status", "relance_prevue")
    .lte("next_relance_date", today)
    .order("next_relance_date", { ascending: true });

  return (
    <main className="min-h-screen bg-paper">
      <DashboardNav />
      <div className="container-tight py-10">
        <h1 className="mb-2 font-display text-3xl font-semibold uppercase">
          Relances du jour
        </h1>
        <p className="mb-8 text-sm text-text-ink/60">
          Prospects à rappeler aujourd&rsquo;hui ou en retard.
        </p>

        {error && (
          <p className="border border-blaze/40 bg-blaze/5 p-4 text-sm text-blaze">
            {error.message}
          </p>
        )}

        {!error && (!prospects || prospects.length === 0) && (
          <div className="border border-line p-10 text-center text-text-ink/60">
            Rien à relancer aujourd&rsquo;hui.
          </div>
        )}

        {prospects && prospects.length > 0 && (
          <ul className="divide-y divide-line border border-line">
            {prospects.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-4">
                  <ScoreBadge score={p.score} />
                  <div>
                    <Link
                      href={`/dashboard/prospect/${p.id}`}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      {p.name}
                    </Link>
                    <p className="text-xs text-text-ink/50">
                      {p.phone ?? "Pas de téléphone"} · prévu le{" "}
                      {p.next_relance_date}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/dashboard/prospect/${p.id}`}
                  className="btn-ghost !px-3 !py-2 text-[11px]"
                >
                  Ouvrir
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
