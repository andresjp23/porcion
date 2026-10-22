-- O-0b (R-13): the kcal target and the macros are fixed by hand separately, so
-- recalculating can update one and keep the other.

alter table public.profiles rename column target_is_manual to kcal_is_manual;

alter table public.profiles
  add column macros_are_manual boolean not null default false;

comment on column public.profiles.kcal_is_manual is 'kcal_target was set by hand (R-05, R-13).';
comment on column public.profiles.macros_are_manual is 'protein_g, carbs_g and fat_g were set by hand (R-13).';
