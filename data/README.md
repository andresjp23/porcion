# Datos del seed

Base de alimentos con la que parte la app (`source = 'seed'`, `verified = true`). `npm run seed:build` valida estos archivos y genera `supabase/seed.sql`. Un test de Vitest falla si `seed.sql` no está al día con `data/`.

## Fuentes

| Fuente | Uso | Licencia | Cita |
|---|---|---|---|
| [USDA FoodData Central](https://fdc.nal.usda.gov/) (Foundation Foods 2026-04 y SR Legacy 2018-04) | Base de los alimentos genéricos | Dominio público (CC0) | U.S. Department of Agriculture, FoodData Central |
| CD Tabla Chilena de Composición Química de Alimentos, actualización 2010 | Solo alimentos chilenos que USDA no tiene | Uso, reproducción y difusión **sin fines comerciales** | FAO y Ministerio de Salud de Chile 2010 |
| Recetas propias (`recipes/`) | Preparaciones chilenas, calculadas con ingredientes de USDA | CC0 | — |

Las filas de FAO/MINSAL llevan `licencia = nc`, así se pueden retirar si el proyecto se usa con fines comerciales.

## Archivos

**`seed_foods.csv`**: un alimento por fila, con valores por 100 g (o 100 ml).

- `key`: identificador estable en kebab-case. Del `key` sale el `id` (UUID v5), así que no se cambia.
- `aliases`: sinónimos separados por `|` ("palta|aguacate").
- `carbs_100`: carbohidratos **disponibles**, sin la fibra, como en las etiquetas chilenas. Con USDA: `Carbohydrate, by difference` (1005) − `Fiber, total dietary` (1079).
- `kcal_100`: `Energy` (1008) de USDA, o `Energy (Atwater General Factors)` (2047) si falta.
- `fuente`: `fdc:<fdc_id>`, `minsal2010:<COD_PROV>` o `receta:<archivo>`. En las recetas, los nutrientes van vacíos y los calcula el script.
- `nota_4_4_9`: obligatoria solo si las kcal no calzan con 4·P + 4·C + 9·G (R-07). Por ejemplo, en las legumbres USDA cuenta la energía de la fibra.

**`seed_portions.csv`**: porciones en gramos, con una sola por defecto por alimento. La `fuente` es `fdc:<fdc_id>` (medida casera de USDA), `medida` (un volumen definido, con 1 ml = 1 g) o `estimado` (peso por confirmar pesando; el script lo avisa).

**`recipes/<key>.json`**: ingredientes en gramos, con su fuente y sus valores por 100 g, más el peso después de cocinar (`cookedGrams`).

## Agregar un alimento

1. Busca el alimento en [FoodData Central](https://fdc.nal.usda.gov/). Prefiere Foundation Foods si trae kcal y los tres macros; si no, usa SR Legacy.
2. Agrega la fila con el nombre que se usa en Chile y sus alias, y sus porciones.
3. Corre `npm run seed:build` y `npm test`.
