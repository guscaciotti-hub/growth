import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Wizard } from "@/components/wizard/Wizard";

export default function NovoPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/" className="glass grid size-10 place-items-center rounded-xl text-muted transition hover:text-fg" aria-label="Voltar"><ArrowLeft className="size-4" /></Link>
        <div>
          <h1 className="text-lg font-semibold leading-tight">Fundar um novo negócio</h1>
          <p className="text-sm text-muted">Cinco passos. Depois a IA analisa tudo e 100 clientes decidem.</p>
        </div>
      </div>
      <Wizard />
    </main>
  );
}
