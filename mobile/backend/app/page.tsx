export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-6 py-16 text-slate-50">
      <h1 className="text-center text-4xl font-semibold tracking-tight sm:text-5xl">
        FlowStore Mobile Backend
      </h1>
      <p className="max-w-xl text-center text-base leading-relaxed text-slate-300">
        Este proyecto proporciona una base limpia de Next.js para construir el backend móvil de FlowStore con
        TypeORM. Desde aquí conectaremos la base de datos existente y expondremos server actions y endpoints
        dedicados.
      </p>
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-5 py-4 text-sm text-slate-200">
        <p className="font-medium uppercase tracking-wide text-slate-400">Siguiente paso sugerido</p>
        <p className="mt-2">
          Configura las variables de entorno de la base de datos en <code>.env.local</code> y crea el data source
          de TypeORM en <code>src/</code>.
        </p>
      </div>
    </main>
  );
}
