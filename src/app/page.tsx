import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col">
      <section className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-16 sm:px-6 sm:py-24">
          <p className="font-medium text-accent">Spécialiste de la membrane armée</p>
          <h1 className="max-w-2xl font-heading text-3xl font-semibold leading-tight text-ink sm:text-5xl">
            Membranes armées et accessoires de pose, livrés en France
          </h1>
          <p className="max-w-xl text-base text-ink-muted sm:text-lg">
            Calculez votre besoin en quelques étapes et recevez un pack prêt
            à poser, membrane et accessoires inclus.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/calculateur">
              <Button variant="primary" size="lg" className="w-full sm:w-auto">
                Lancer le calculateur
              </Button>
            </Link>
            <Link href="/membrane-armee">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                Voir les membranes
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="font-heading text-2xl font-semibold text-ink">
          Catégories
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/membrane-armee"
            className="flex flex-col gap-2 rounded-lg border border-border p-6 transition-shadow hover:shadow-soft"
          >
            <h3 className="font-heading text-lg font-semibold text-ink">
              Membrane armée
            </h3>
            <p className="text-sm text-ink-muted">
              Gammes unies et imprimées, au mètre linéaire ou en rouleau.
            </p>
          </Link>
          <Link
            href="/accessoires"
            className="flex flex-col gap-2 rounded-lg border border-border p-6 transition-shadow hover:shadow-soft"
          >
            <h3 className="font-heading text-lg font-semibold text-ink">
              Accessoires de pose
            </h3>
            <p className="text-sm text-ink-muted">
              Feutre de protection, colles, PVC liquide, profilés, solvants.
            </p>
          </Link>
          <Link
            href="/calculateur"
            className="flex flex-col gap-2 rounded-lg border border-border p-6 transition-shadow hover:shadow-soft"
          >
            <h3 className="font-heading text-lg font-semibold text-ink">
              Calculateur de pack
            </h3>
            <p className="text-sm text-ink-muted">
              Renseignez vos dimensions, obtenez un pack prêt à poser.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
