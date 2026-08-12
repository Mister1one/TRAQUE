import DashboardNav from "@/components/dashboard/DashboardNav";
import ScanForm from "@/components/dashboard/ScanForm";

export const dynamic = "force-dynamic";

export default function RecherchePage() {
  return (
    <main className="min-h-screen bg-paper">
      <DashboardNav />
      <div className="container-tight py-14">
        <h1 className="mb-8 text-center font-display text-2xl font-semibold uppercase text-text-ink/80">
          Nouvelle recherche
        </h1>
        <ScanForm />
      </div>
    </main>
  );
}
