import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase-server";
import DashboardNav from "@/components/dashboard/DashboardNav";
import ScoreBadge from "@/components/dashboard/ScoreBadge";
import StatusBadge from "@/components/dashboard/StatusBadge";
import ProspectActions from "@/components/dashboard/ProspectActions";

export const dynamic = "force-dynamic";

export default async function ProspectPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await getSupabaseServer();

  const { data: prospect } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!prospect) notFound();

  const { data: callLog } = await supabase
    .from("call_log")
    .select("*")
    .eq("prospect_id", params.id)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-paper">
      <DashboardNav />
      <div className="container-tight py-10">
        <Link
          href="/dashboard"
          className="mb-6 inline-block font-mono text-xs uppercase tracking-widest text-text-ink/50 hover:text-text-ink"
        >
          ← Retour aux prospects
        </Link>

        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold uppercase">
              {prospect.name}
            </h1>
            <p className="mt-1 text-sm text-text-ink/60">
              {prospect.category ?? "Activité inconnue"} — {prospect.city ?? prospect.source_zone}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ScoreBadge score={prospect.score} />
            <StatusBadge status={prospect.status} />
          </div>
        </div>

        <div className="grid gap-10 md:grid-cols-[1fr_1.2fr]">
          <div className="space-y-6">
            <div>
              <h2 className="mb-3 font-display text-lg font-semibold uppercase">
                Coordonnées
              </h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-line py-2">
                  <dt className="text-text-ink/50">Adresse</dt>
                  <dd className="text-right">{prospect.address ?? "—"}</dd>
                </div>
                <div className="flex justify-between border-b border-line py-2">
                  <dt className="text-text-ink/50">Téléphone</dt>
                  <dd className="font-mono">{prospect.phone ?? "—"}</dd>
                </div>
                <div className="flex justify-between border-b border-line py-2">
                  <dt className="text-text-ink/50">Site web</dt>
                  <dd>
                    {prospect.website ? (
                      <a
                        href={prospect.website}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        Voir le site
                      </a>
                    ) : (
                      "Aucun"
                    )}
                  </dd>
                </div>
                <div className="flex justify-between border-b border-line py-2">
                  <dt className="text-text-ink/50">Note Google</dt>
                  <dd>
                    {prospect.rating
                      ? `${prospect.rating}/5 (${prospect.reviews_count ?? 0} avis)`
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between border-b border-line py-2">
                  <dt className="text-text-ink/50">Prochaine relance</dt>
                  <dd>{prospect.next_relance_date ?? "—"}</dd>
                </div>
                <div>
                  <a
                    href={prospect.google_maps_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost mt-2 inline-flex !px-3 !py-2 text-[11px]"
                  >
                    Voir sur Google Maps
                  </a>
                </div>
              </dl>
            </div>

            {prospect.score_reasons && (
              <div>
                <h2 className="mb-3 font-display text-lg font-semibold uppercase">
                  Détail du score
                </h2>
                <ul className="space-y-1 text-sm">
                  {Object.entries(
                    prospect.score_reasons as Record<string, number>
                  ).map(([reason, points]) => (
                    <li key={reason} className="flex justify-between">
                      <span className="text-text-ink/60">
                        {reason.replace(/_/g, " ")}
                      </span>
                      <span className="font-mono">+{points}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {callLog && callLog.length > 0 && (
              <div>
                <h2 className="mb-3 font-display text-lg font-semibold uppercase">
                  Historique
                </h2>
                <ul className="space-y-2 text-sm">
                  {callLog.map((c) => (
                    <li key={c.id} className="border-b border-line pb-2">
                      <div className="flex justify-between font-mono text-[11px] text-text-ink/45">
                        <span>{c.outcome}</span>
                        <span>{new Date(c.created_at).toLocaleDateString("fr-FR")}</span>
                      </div>
                      {c.note && <p className="mt-1">{c.note}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <ProspectActions prospect={prospect} />
        </div>
      </div>
    </main>
  );
}
