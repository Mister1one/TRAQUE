import DashboardNav from "@/components/dashboard/DashboardNav";
import CompanyTable from "@/components/dashboard/CompanyTable";
import { getSupabaseServer } from "@/lib/supabase-server";
import { toDateInputValue } from "@/lib/relance";

export const dynamic = "force-dynamic";

export default async function RelancePage() {
  const supabase = await getSupabaseServer();
  const today = toDateInputValue(new Date());

  // Tous les prospects marqués "à relancer" dont la date est aujourd'hui
  // ou dépassée, toutes recherches confondues — triés du plus en retard
  // au plus récent, pour traiter les urgences en premier.
  const { data: companies } = await supabase
    .from("companies")
    .select("*")
    .eq("status", "a_relancer")
    .lte("next_relance_date", today)
    .order("next_relance_date", { ascending: true });

  return (
    <main className="min-h-screen bg-paper">
      <DashboardNav />
      <div className="container-tight py-14">
        <h1 className="mb-2 font-display text-2xl font-semibold uppercase text-text-ink/80">
          Relance
        </h1>
        <p className="mb-8 font-mono text-xs uppercase tracking-widest text-text-ink/40">
          {companies?.length ?? 0} prospect{(companies?.length ?? 0) > 1 ? "s" : ""} à
          relancer aujourd&rsquo;hui ou en retard
        </p>
        {companies && companies.length > 0 ? (
          <CompanyTable initialCompanies={companies} />
        ) : (
          <p className="font-mono text-sm text-text-ink/50">
            Rien à relancer pour l&rsquo;instant.
          </p>
        )}
      </div>
    </main>
  );
}
