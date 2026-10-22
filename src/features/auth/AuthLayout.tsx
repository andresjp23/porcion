import type { ReactNode } from 'react'

type AuthLayoutProps = {
  title: string
  subtitle: string
  children: ReactNode
}

/** Logo, title and subtitle shared by the sign-in, sign-up and consent screens. */
export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pt-12 pb-8">
      <img src="/logo.svg" alt="" className="size-16" />
      <h1 className="mt-6 text-3xl leading-tight font-extrabold text-ink">{title}</h1>
      <p className="mt-3 text-base font-semibold text-ink-soft">{subtitle}</p>
      {children}
    </main>
  )
}
