import { cx } from '@/lib/cx'

/** Yellow corners around the area to aim at; decorative. Size it with `className`. */
export function ScanFrame({ className }: { className?: string }) {
  const corner = 'absolute size-10 border-accent'
  return (
    <div aria-hidden="true" className={cx('relative', className)}>
      <span className={cx(corner, 'top-0 left-0 rounded-tl-2xl border-t-4 border-l-4')} />
      <span className={cx(corner, 'top-0 right-0 rounded-tr-2xl border-t-4 border-r-4')} />
      <span className={cx(corner, 'bottom-0 left-0 rounded-bl-2xl border-b-4 border-l-4')} />
      <span className={cx(corner, 'right-0 bottom-0 rounded-br-2xl border-r-4 border-b-4')} />
    </div>
  )
}
