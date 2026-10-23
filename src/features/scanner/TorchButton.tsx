import { Zap, ZapOff } from 'lucide-react'
import { IconButton } from '@/ui'

/** Turns the camera light on and off. Render it only when the scanner returns `torch`. */
export function TorchButton({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <IconButton
      label="Linterna"
      aria-pressed={on}
      icon={on ? <Zap aria-hidden="true" /> : <ZapOff aria-hidden="true" />}
      size="lg"
      variant={on ? 'accent' : 'subtle'}
      onClick={onToggle}
    />
  )
}
