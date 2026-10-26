import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { SavedTarget } from '@/domain/target'
import { updateProfile } from '@/features/onboarding/api'
import type { Tables, TablesUpdate } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'
import { profileKey } from './useProfile'

/** The stored target, or null while the onboarding has not set one. */
export function savedTargetFrom(
  profile: Pick<
    Tables<'profiles'>,
    'kcal_target' | 'protein_g' | 'carbs_g' | 'fat_g' | 'kcal_is_manual' | 'macros_are_manual'
  >,
): SavedTarget | null {
  const { kcal_target, protein_g, carbs_g, fat_g } = profile
  if (kcal_target === null || protein_g === null || carbs_g === null || fat_g === null) return null
  return {
    kcal: kcal_target,
    protein: protein_g,
    carbs: carbs_g,
    fat: fat_g,
    kcalIsManual: profile.kcal_is_manual,
    macrosAreManual: profile.macros_are_manual,
  }
}

/** The profile columns that store a target. */
export function targetColumns(target: SavedTarget): TablesUpdate<'profiles'> {
  return {
    kcal_target: target.kcal,
    protein_g: target.protein,
    carbs_g: target.carbs,
    fat_g: target.fat,
    kcal_is_manual: target.kcalIsManual,
    macros_are_manual: target.macrosAreManual,
  }
}

/** Saves on the own profile and refreshes it everywhere (Hoy reads the target from it). */
export function useUpdateProfile(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: TablesUpdate<'profiles'>) => updateProfile(userId, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKey(userId) }),
  })
}

/** HU-16 CA1: everything stored about the user, as the RPC builds it. */
export async function exportMyData() {
  const { data, error } = await supabase.rpc('export_my_data')
  if (error) throw error
  return data
}
