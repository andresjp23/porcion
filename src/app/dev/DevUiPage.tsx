import { ChevronLeft, ScanBarcode, Search, Star } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import {
  BottomNav,
  Button,
  Card,
  Chip,
  EmptyState,
  FoodRow,
  IconButton,
  Input,
  MacroBar,
  Ring,
  Segmented,
  Sheet,
  Stepper,
} from '@/ui'

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

const meals = ['Desayuno', 'Almuerzo', 'Colación', 'Cena'] as const

const tabs = [
  { value: 'recent', label: 'Recientes' },
  { value: 'favorites', label: 'Favoritos' },
  { value: 'mine', label: 'Mis alimentos' },
] as const

const bases = [
  { value: 'g', label: 'por 100 g' },
  { value: 'ml', label: 'por 100 ml' },
] as const

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-extrabold">{title}</h2>
      {children}
    </section>
  )
}

/** Development-only showcase of design tokens and base components. */
export function DevUiPage() {
  const [meal, setMeal] = useState<(typeof meals)[number]>('Almuerzo')
  const [tab, setTab] = useState<(typeof tabs)[number]['value']>('recent')
  const [basis, setBasis] = useState<(typeof bases)[number]['value']>('g')
  const [quantity, setQuantity] = useState(1)
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <main className="mx-auto max-w-md space-y-8 px-4 pt-6 pb-32">
      <h1 className="text-3xl font-extrabold">Sistema visual</h1>

      <Section title="Colores">
        <ul className="grid grid-cols-3 gap-3">
          {swatches.map((swatch) => (
            <li key={swatch.name} className="space-y-1">
              <div className={`h-14 rounded-icon ${swatch.className}`} />
              <p className="text-xs font-bold text-ink-muted">{swatch.name}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Tipografía">
        <p className="text-[56px] leading-none font-extrabold">1.240</p>
        <p className="text-3xl font-extrabold">Título de pantalla</p>
        <p className="text-base font-extrabold">Título de sección</p>
        <p className="text-base font-semibold text-ink-soft">Cuerpo de texto</p>
        <p className="text-xs font-bold text-ink-muted">Etiqueta</p>
      </Section>

      <Section title="Button">
        <Button fullWidth>Agregar a Almuerzo · 245 kcal</Button>
        <Button fullWidth icon={<ScanBarcode aria-hidden="true" />}>
          Escanear código de barras
        </Button>
        <Button variant="secondary" fullWidth>
          Buscar por nombre
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="md">Mediano</Button>
          <Button size="md" variant="secondary">
            Secundario
          </Button>
          <Button size="md" variant="ghost">
            Escanear otro
          </Button>
          <Button size="md" disabled>
            Desactivado
          </Button>
        </div>
      </Section>

      <Section title="IconButton">
        <div className="flex items-center gap-3">
          <IconButton label="Volver" size="lg" icon={<ChevronLeft aria-hidden="true" />} />
          <IconButton
            label="Quitar de favoritos"
            size="lg"
            icon={<Star aria-hidden="true" fill="currentColor" />}
          />
          <Card className="flex gap-3">
            <IconButton
              label="Escanear"
              variant="subtle"
              icon={<ScanBarcode aria-hidden="true" />}
            />
            <IconButton label="Buscar" variant="accent" icon={<Search aria-hidden="true" />} />
          </Card>
        </div>
      </Section>

      <Section title="Chip">
        <div className="flex gap-2 overflow-x-auto">
          {meals.map((option) => (
            <Chip key={option} selected={option === meal} onClick={() => setMeal(option)}>
              {option}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Segmented">
        <Segmented label="Lista" options={tabs} value={tab} onChange={setTab} tone="subtle" />
        <Segmented label="Base nutricional" options={bases} value={basis} onChange={setBasis} />
      </Section>

      <Section title="Card + Input">
        <Card radius="lg" className="space-y-4">
          <Input label="Nombre" defaultValue="Atún en agua" />
          <Input label="Marca" placeholder="Opcional" hint="Como aparece en la etiqueta." />
          <Input label="Energía (kcal)" inputMode="decimal" error="Ingresa un número." />
        </Card>
      </Section>

      <Section title="Stepper">
        <Stepper
          label="Cantidad"
          value={quantity}
          onChange={setQuantity}
          step={0.5}
          unit="unidad"
        />
      </Section>

      <Section title="Ring + MacroBar">
        <Card radius="lg" className="space-y-6">
          <div className="flex items-center gap-6">
            <Ring progress={1187 / 2100} label="913 kcal restantes de 2.100">
              <div>
                <p className="text-4xl font-extrabold">913</p>
                <p className="text-sm font-bold text-on-surface-muted">restantes</p>
              </div>
            </Ring>
            <Ring progress={1.2} label="Sobre la meta: 120 kcal" size={96} strokeWidth={10} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <MacroBar macro="protein" value={78} target={130} />
            <MacroBar macro="carbs" value={128.46} target={235} />
            <MacroBar macro="fat" value={82} target={70} />
          </div>
        </Card>
      </Section>

      <Section title="FoodRow">
        <FoodRow
          name="Huevo"
          portion="1 unidad · 50 g"
          kcal={70}
          onSelect={() => {}}
          onAdd={() => {}}
        />
        <FoodRow
          name="Pechuga de pollo a la plancha con ensalada"
          portion="100 g"
          kcal={165.4}
          onSelect={() => {}}
          onAdd={() => {}}
        />
      </Section>

      <Section title="EmptyState">
        <EmptyState
          icon={<Search aria-hidden="true" />}
          title="Aún no hay favoritos"
          description="Marca la estrella en un alimento para encontrarlo aquí."
          action={
            <Button variant="secondary" fullWidth>
              Buscar alimentos
            </Button>
          }
        />
      </Section>

      <Section title="Sheet">
        <Button variant="secondary" onClick={() => setSheetOpen(true)}>
          Abrir hoja
        </Button>
        <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Marraqueta">
          <div className="space-y-3">
            <Stepper
              label="Cantidad"
              value={quantity}
              onChange={setQuantity}
              step={0.5}
              unit="unidad"
            />
            <Button fullWidth onClick={() => setSheetOpen(false)}>
              Guardar
            </Button>
          </div>
        </Sheet>
      </Section>

      <BottomNav />
    </main>
  )
}
