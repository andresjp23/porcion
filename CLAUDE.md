# CLAUDE.md — Porción

> "Porción" es un nombre provisional. Si cambia, reemplázalo en todo el repo.

PWA mobile-first para registrar comidas, calorías y macros, y seguir el peso. Multiusuario, con una base de alimentos chilenos compartida, escaneo de código de barras y un modo supermercado. Es un proyecto personal y de portafolio, así que la calidad del código y el README importan tanto como las funcionalidades.

## Lee esto antes de programar

| Archivo | Qué contiene |
|---|---|
| `docs/spec.md` | Qué hace la app: alcance, historias de usuario, criterios de aceptación y reglas de negocio |
| `docs/design.md` | Cómo está construida: arquitectura, modelo de datos, RLS, integraciones |
| `docs/ui.md` | Sistema visual: tokens, componentes y pantallas |
| `docs/tasks.md` | Plan de implementación por fases. **Trabaja siempre desde aquí** |

Si una tarea contradice la spec, se detiene y se pregunta. No se resuelve el conflicto en silencio.

## Stack

- **Frontend:** React 19 + TypeScript (strict) + Vite, Tailwind CSS v4, React Router, TanStack Query, `vite-plugin-pwa`
- **Backend:** Supabase (Postgres, Auth, Row Level Security). No hay servidor propio en el MVP.
- **Validación:** Zod para formularios y para las respuestas de APIs externas
- **Gráficos:** SVG propio o una librería liviana (decidir en la fase de Progreso, ver `docs/tasks.md`)
- **Escaneo:** API `BarcodeDetector` cuando exista y librería de respaldo para Safari (ver `docs/design.md`)
- **Tests:** Vitest + Testing Library (unitarios y componentes), Playwright (flujos principales)
- **Calidad:** ESLint 9 (typescript-eslint, react-hooks, jsx-a11y) y Prettier. ESLint se queda en la v9 hasta que `eslint-plugin-jsx-a11y` soporte la v10.

## Comandos

> Mantener esta sección al día. Los comandos marcados *(pendiente)* aún no existen.

```bash
npm install
npm run dev           # servidor de desarrollo
npm run build         # build de producción
npm run preview       # sirve el build
npm run test          # Vitest (una pasada)
npm run test:watch    # Vitest en modo watch
npm run test:e2e      # Playwright (pendiente, Q-1)
npm run lint          # ESLint
npm run typecheck     # tsc -b --noEmit
npm run format        # Prettier (no formatea los .md)
npm run pwa:assets    # regenera los íconos PWA desde public/logo.svg
supabase start        # Supabase local (requiere Docker). Copia la URL y la anon key a .env.local
npm run db:reset      # aplica migraciones + seed desde cero
npm run db:types      # regenera src/lib/database.types.ts
npm run test:db       # tests pgTAP de supabase/tests (RLS, triggers)
```

## Estructura de carpetas

```
src/
  app/            # router, providers, layout con barra inferior
  features/
    auth/
    onboarding/
    today/        # pantalla Hoy
    foods/        # buscar, detalle, crear, favoritos
    scanner/      # escáner único
    shopping/     # modo supermercado y lista de compras
    progress/
    profile/      # perfil, ajustes, privacidad
  domain/         # lógica de negocio PURA: cálculos, reglas, validaciones
  lib/            # cliente Supabase, Open Food Facts, utilidades
  ui/             # componentes base (Button, Card, Input, Chip, Sheet…)
  styles/         # tokens.css
  test/           # setup de Vitest
supabase/
  migrations/     # SQL versionado, una migración por cambio
  tests/database/ # tests pgTAP
  seed.sql        # alimentos base
docs/
```

Los imports dentro de `src/` usan el alias `@/` (ej.: `@/domain/energy`).

## Reglas

**Lógica de negocio**
- Todo cálculo (kcal por porción, Mifflin-St Jeor, metas, macros, validación 4/4/9, tendencia de peso) vive en `src/domain/` como funciones puras, sin React ni Supabase, y **con tests unitarios**. Los componentes solo las llaman.
- Los valores nutricionales se guardan **siempre por 100 g o 100 ml**. Las porciones son equivalencias en gramos.
- Las calorías mostradas se redondean a entero y los macros a 1 decimal, solo al mostrarlos. Los cálculos internos no redondean.

**Datos y seguridad**
- Cada tabla tiene RLS activado. Nunca desactives RLS ni uses la `service_role` key en el frontend.
- Los cambios de esquema van solo como migraciones nuevas en `supabase/migrations/`. Nunca edites una migración ya aplicada.
- Regenera `database.types.ts` después de cada migración.
- No guardes secretos en el repo. Usa `.env.local` y mantén `.env.example` actualizado.
- Al guardar datos de usuario, pide solo lo que la spec indica. No agregues campos personales nuevos sin actualizar la spec y la política de privacidad.

**UI**
- Textos de interfaz en español de Chile, neutro y cercano. El código, los nombres y los commits van en inglés.
- No uses hex sueltos en los componentes: usa los tokens de `docs/ui.md` (`src/styles/tokens.css`).
- Mobile-first, con áreas táctiles de mínimo 44×44 px y contraste mínimo de 4.5:1 para texto.
- Los botones de solo ícono llevan `aria-label` y todos los inputs llevan `<label>`.
- Nada de rojo ni mensajes de culpa cuando el usuario supera su meta (ver `docs/spec.md`, R-08).

**Flujo de trabajo**
- Toma una tarea de `docs/tasks.md`, impleméntala, agrega o actualiza sus tests, verifica que `lint`, `typecheck` y `test` pasen, y marca la casilla.
- Una tarea, un commit (o PR). Commits con Conventional Commits (`feat:`, `fix:`, `chore:`…).
- Si descubres trabajo nuevo, agrégalo a `docs/tasks.md` en vez de hacerlo de pasada.
- No agregues dependencias pesadas sin justificarlo en el commit.
