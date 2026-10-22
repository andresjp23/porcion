const swatches = [
  { name: 'bg', className: 'bg-bg border border-line' },
  { name: 'ink', className: 'bg-ink' },
  { name: 'ink-muted', className: 'bg-ink-muted' },
  { name: 'ink-soft', className: 'bg-ink-soft' },
  { name: 'line', className: 'bg-line' },
  { name: 'surface', className: 'bg-surface' },
  { name: 'surface-2', className: 'bg-surface-2' },
  { name: 'on-surface', className: 'bg-on-surface border border-line' },
  { name: 'on-surface-muted', className: 'bg-on-surface-muted' },
  { name: 'accent', className: 'bg-accent' },
  { name: 'protein', className: 'bg-protein' },
  { name: 'carbs', className: 'bg-carbs' },
  { name: 'fat', className: 'bg-fat' },
  { name: 'camera', className: 'bg-camera' },
]

/** Development-only showcase of design tokens and base components. */
export function DevUiPage() {
  return (
    <main className="mx-auto max-w-md space-y-6 px-4 py-6">
      <h1 className="text-3xl font-extrabold">Sistema visual</h1>

      <section aria-labelledby="colors-title" className="space-y-3">
        <h2 id="colors-title" className="text-base font-extrabold">
          Colores
        </h2>
        <ul className="grid grid-cols-3 gap-3">
          {swatches.map((swatch) => (
            <li key={swatch.name} className="space-y-1">
              <div className={`h-14 rounded-icon ${swatch.className}`} />
              <p className="text-xs font-bold text-ink-muted">{swatch.name}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="type-title" className="space-y-2">
        <h2 id="type-title" className="text-base font-extrabold">
          Tipografía
        </h2>
        <p className="text-[56px] leading-none font-extrabold">1.240</p>
        <p className="text-3xl font-extrabold">Título de pantalla</p>
        <p className="text-base font-extrabold">Título de sección</p>
        <p className="text-base font-semibold text-ink-soft">Cuerpo de texto</p>
        <p className="text-xs font-bold text-ink-muted">Etiqueta</p>
      </section>

      <section className="space-y-3 rounded-card-lg border border-surface-2 bg-surface p-5 text-on-surface">
        <p className="font-extrabold">Tarjeta grafito</p>
        <p className="text-on-surface-muted">Texto secundario sobre grafito</p>
        <button
          type="button"
          className="h-14 w-full rounded-pill bg-accent font-extrabold text-on-accent"
        >
          Agregar a Almuerzo · 245 kcal
        </button>
      </section>
    </main>
  )
}
