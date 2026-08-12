import Link from "next/link";
import DashboardNav from "@/components/dashboard/DashboardNav";
import CompanyTable from "@/components/dashboard/CompanyTable";
import { getSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function TableauResultatsPage({
  searchParams,
}: {
  searchParams: { activite?: string; zone?: string };
}) {
  const activite = searchParams.activite ?? "";
  const zone = searchParams.zone ?? "";

  const supabase = await getSupabaseServer();
  const { data: companies } = await supabase
    .from("companies")
    .select("*")
    .eq("activite", activite)
    .eq("zone", zone)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-paper">
      <DashboardNav />
      <div className="container-tight py-14">
        <Link
          href="/dashboard/tableau"
          className="mb-6 inline-block font-mono text-[11px] uppercase tracking-widest text-text-ink/50 hover:text-text-ink"
        >
          ← Toutes les recherches
        </Link>
        <h1 className="mb-2 font-display text-2xl font-semibold uppercase text-text-ink/80">
          {activite} · {zone}
        </h1>
        <p className="mb-8 font-mono text-xs uppercase tracking-widest text-text-ink/40">
          {companies?.length ?? 0} prospects
        </p>
        <CompanyTable initialCompanies={companies ?? []} />
      </div>
    </main>
  );
}
