import { getSupabaseServer } from "@/lib/supabase-server";
import DashboardNav from "@/components/dashboard/DashboardNav";
import { levelForPoints, LEVELS } from "@/lib/points";

export const dynamic = "force-dynamic";

export default async function ProgressionPage() {
  const supabase = await getSupabaseServer();
  const { data: pointsLog } = await supabase
    .from("points_log")
    .select("points, action_type, created_at")
    .order("created_at", { ascending: false });

  const total = (pointsLog ?? []).reduce((sum, p) => sum + p.points, 0);
  const { current, next } = levelForPoints(total);
  const progressToNext = next
    ? Math.min(
        100,
        Math.round(
          ((total - current.threshold) / (next.threshold - current.threshold)) *
            100
        )
      )
    : 100;

  return (
    <main className="min-h-screen bg-paper">
      <DashboardNav />
      <div className="container-tight py-10">
        <h1 className="mb-8 font-display text-3xl font-semibold uppercase">
          Progression
        </h1>

        <div className="mb-10 border border-line-paper bg-ink p-6 text-text-paper">
          <div className="mb-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-widest text-text-paper/50">
            <span>
              Niveau {current.rank} — {current.title}
            </span>
            <span>
              {total} pts{next ? ` / ${next.threshold} pts` : ""}
            </span>
          </div>
          <div className="h-2 w-full bg-text-paper/10">
            <div
              className="h-full bg-blaze"
              style={{ width: `${progressToNext}%` }}
            />
          </div>
          {next && (
            <p className="mt-3 text-sm text-text-paper/60">
              Encore {next.threshold - total} pts avant &laquo;&nbsp;{next.title}
              &nbsp;&raquo;.
            </p>
          )}
        </div>

        <div className="mb-10 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-4">
          {LEVELS.map((l) => (
            <div
              key={l.rank}
              className={`bg-paper p-5 ${l.rank === current.rank ? "outline outline-2 outline-blaze -outline-offset-2" : ""}`}
            >
              <span className="font-mono text-xs text-text-ink/40">
                {String(l.rank).padStart(2, "0")}
              </span>
              <p className="mt-1 font-display text-base font-semibold uppercase">
                {l.title}
              </p>
              <p className="mt-1 text-xs text-text-ink/50">
                {l.threshold} pts
              </p>
            </div>
          ))}
        </div>

        <h2 className="mb-3 font-display text-lg font-semibold uppercase">
          Dernières actions
        </h2>
        {pointsLog && pointsLog.length > 0 ? (
          <ul className="divide-y divide-line border border-line">
            {pointsLog.slice(0, 20).map((p, i) => (
              <li
                key={i}
                className="flex items-center justify-between px-4 py-2.5 text-sm"
              >
                <span className="text-text-ink/70">
                  {p.action_type.replace(/_/g, " ")}
                </span>
                <span className="flex items-center gap-4">
                  <span className="font-mono text-xs text-text-ink/40">
                    {new Date(p.created_at).toLocaleDateString("fr-FR")}
                  </span>
                  <span className="font-mono text-blaze">+{p.points}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-ink/50">Aucune action pour l&rsquo;instant.</p>
        )}
      </div>
    </main>
  );
}
