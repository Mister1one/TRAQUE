import Link from "next/link";
import DashboardNav from "@/components/dashboard/DashboardNav";
import { getSupabaseServer } from "@/lib/supabase-server";
import { toDateInputValue } from "@/lib/relance";
import { computeStreak } from "@/lib/streak";
import type { Company } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<Company["status"], string> = {
  a_contacter: "À contacter",
  envoyee: "Envoyée",
  conversation: "Conversation",
  refus: "Refus",
  a_relancer: "À relancer",
  injoignable: "Injoignable",
  a_rappeler: "À rappeler",
  rdv: "RDV",
  vendu: "Vendu",
};

// Ordre d'affichage : du prospect neuf au prospect converti, plutôt que
// l'ordre alphabétique — ça raconte le pipeline visuellement.
const STATUS_ORDER: Company["status"][] = [
  "a_contacter",
  "envoyee",
  "conversation",
  "a_relancer",
  "a_rappeler",
  "injoignable",
  "refus",
  "rdv",
  "vendu",
];

export default async function DashboardPage() {
  const supabase = await getSupabaseServer();
  const today = toDateInputValue(new Date());

  const { data: companies } = await supabase
    .from("companies")
    .select("status, next_relance_date");

  const { data: activityRows } = await supabase
    .from("activity_days")
    .select("day")
    .order("day", { ascending: false })
    .limit(60);

  const streak = computeStreak(new Set((activityRows ?? []).map((r) => r.day)));

  const list = companies ?? [];
  const total = list.length;

  const counts = STATUS_ORDER.reduce<Record<string, number>>((acc, s) => {
    acc[s] = 0;
    return acc;
  }, {});
  list.forEach((c) => {
    counts[c.status] = (counts[c.status] ?? 0) + 1;
  });

  const contactes = total - (counts.a_contacter ?? 0);
  const vendus = counts.vendu ?? 0;
  const tauxConversion =
    contactes > 0 ? Math.round((vendus / contactes) * 100) : 0;

  const relancesDues = list.filter(
    (c) => c.status === "a_relancer" && c.next_relance_date && c.next_relance_date <= today
  ).length;

  if (total === 0) {
    return (
      <main className="min-h-screen bg-paper">
        <DashboardNav />
        <div className="container-tight flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <div className="text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-text-ink/40">
              Dashboard
            </p>
            <h1 className="mt-2 font-display text-2xl font-semibold uppercase text-text-ink/70">
              Rien à afficher pour l&rsquo;instant
            </h1>
            <Link
              href="/dashboard/recherche"
              className="mt-6 inline-block border border-ink px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-text-ink hover:bg-ink hover:text-paper"
            >
              Lancer une recherche
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper">
      <DashboardNav />
      <div className="container-tight py-14">
        <h1 className="mb-2 font-display text-2xl font-semibold uppercase text-text-ink/80">
          Dashboard
        </h1>
        <p className="mb-8 font-mono text-sm text-text-ink/60">
          {streak > 0 ? (
            <>
              🔥 <span className="font-semibold text-text-ink">{streak}</span>{" "}
              jour{streak > 1 ? "s" : ""} d&rsquo;affilée
            </>
          ) : (
            "Commence ton streak aujourd'hui — traite un prospect."
          )}
        </p>

        {/* Boutons d'action rapide : ce qu'il y a à faire là, maintenant. */}
        <div className="mb-10 flex flex-wrap gap-3">
          <Link
            href="/dashboard/relance"
            className={`border px-5 py-3 font-mono text-xs uppercase tracking-widest ${
              relancesDues > 0
                ? "border-blaze bg-blaze/10 text-blaze"
                : "border-line text-text-ink/60 hover:border-ink hover:text-text-ink"
            }`}
          >
            {relancesDues} relance{relancesDues > 1 ? "s" : ""} à traiter
            aujourd&rsquo;hui
          </Link>
          <Link
            href="/dashboard/tableau"
            className="border border-line px-5 py-3 font-mono text-xs uppercase tracking-widest text-text-ink/70 hover:border-ink hover:text-text-ink"
          >
            Reprendre une session
          </Link>
          <Link
            href="/dashboard/recherche"
            className="border border-line px-5 py-3 font-mono text-xs uppercase tracking-widest text-text-ink/70 hover:border-ink hover:text-text-ink"
          >
            Nouvelle recherche
          </Link>
        </div>

        {/* Vue d'ensemble : où en est le pipeline, pas juste un total. */}
        <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="border border-line p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-text-ink/40">
              Prospects
            </p>
            <p className="mt-1 font-display text-3xl font-semibold">{total}</p>
          </div>
          <div className="border border-line p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-text-ink/40">
              Contactés
            </p>
            <p className="mt-1 font-display text-3xl font-semibold">
              {contactes}
            </p>
          </div>
          <div className="border border-line p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-text-ink/40">
              Vendus
            </p>
            <p className="mt-1 font-display text-3xl font-semibold">
              {vendus}
            </p>
          </div>
          <div className="border border-line p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-text-ink/40">
              Taux de conversion
            </p>
            <p className="mt-1 font-display text-3xl font-semibold">
              {tauxConversion}%
            </p>
          </div>
        </div>

        {/* Répartition par statut, dans l'ordre du pipeline. */}
        <div>
          <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-text-ink/40">
            Répartition
          </p>
          <div className="flex flex-wrap gap-2">
            {STATUS_ORDER.map((s) => (
              <div
                key={s}
                className="border border-line px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-text-ink/70"
              >
                {STATUS_LABELS[s]} <span className="text-text-ink/40">·</span>{" "}
                <span className="font-semibold text-text-ink">{counts[s] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
