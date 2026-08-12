import DashboardNav from "@/components/dashboard/DashboardNav";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
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
        </div>
      </div>
    </main>
  );
}
