// Usage: npm run seed:build
// Validates data/ and writes supabase/seed.sql. Exits with 1 on any error.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildSeed, recipeSchema, renderSeedSql, type Recipe } from './seed'

export const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path: string) => readFileSync(join(repoRoot, path), 'utf8')

export function loadRecipes() {
  const recipes = new Map<string, Recipe>()
  for (const file of readdirSync(join(repoRoot, 'data/recipes'))) {
    if (!file.endsWith('.json')) continue
    const recipe = recipeSchema.parse(JSON.parse(read(`data/recipes/${file}`)))
    recipes.set(recipe.key, recipe)
  }
  return recipes
}

export function buildFromData() {
  return buildSeed(read('data/seed_foods.csv'), read('data/seed_portions.csv'), loadRecipes())
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = buildFromData()
  for (const warning of result.warnings) console.warn(`warning: ${warning}`)
  if (result.errors.length > 0) {
    for (const error of result.errors) console.error(`error: ${error}`)
    process.exit(1)
  }
  writeFileSync(join(repoRoot, 'supabase/seed.sql'), renderSeedSql(result))
  console.log(`supabase/seed.sql: ${result.foods.length} foods, ${result.portions.length} portions`)
}
