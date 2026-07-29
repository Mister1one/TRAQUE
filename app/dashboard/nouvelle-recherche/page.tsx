import DashboardNav from "@/components/dashboard/DashboardNav";
import NouvelleRechercheForm from "@/components/dashboard/NouvelleRechercheForm";

export default function NouvelleReecherchePage() {
  return (
    <main className="min-h-screen bg-paper">
      <DashboardNav />
      <div className="container-tight py-10">
        <h1 className="mb-2 font-display text-3xl font-semibold uppercase">
          Nouvelle recherche
        </h1>
        <p className="mb-8 max-w-lg text-sm text-text-ink/60">
          Le scan visite Google Maps et enregistre chaque fiche trouvée, notée
          automatiquement selon le potentiel d&rsquo;opportunité.
        </p>
        <NouvelleRechercheForm />
      </div>
    </main>
  );
}
