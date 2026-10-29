import { useEffect, useRef, type PointerEvent } from 'react'

type NumberButtonProps = {
  digit: number
  noteMode: boolean
  disabled: boolean
  onDigit: (noteMode: boolean) => void
}
type Press = { pointerId: number; x: number; y: number; timer: number }

export default function NumberButton({ digit, noteMode, disabled, onDigit }: NumberButtonProps) {
  const press = useRef<Press | null>(null)
  const suppressClick = useRef(false)

  function cancel() {
    if (!press.current) return
    window.clearTimeout(press.current.timer)
    press.current = null
    suppressClick.current = true
  }

  useEffect(() => {
    window.addEventListener('blur', cancel)
    document.addEventListener('visibilitychange', cancel)
    return () => {
      cancel()
      window.removeEventListener('blur', cancel)
      document.removeEventListener('visibilitychange', cancel)
    }
  }, [noteMode, disabled])

  function start(event: PointerEvent<HTMLButtonElement>) {
    if (disabled || !event.isPrimary || event.button !== 0 || press.current) return
    suppressClick.current = false
    press.current = {
      pointerId: event.pointerId, x: event.clientX, y: event.clientY,
      timer: window.setTimeout(() => {
        suppressClick.current = true
        onDigit(!noteMode)
      }, 500),
    }
  }

  return <button type="button" disabled={disabled} aria-label={`${noteMode ? 'Toggle note' : 'Enter'} ${digit}`}
    onPointerDown={start}
    onPointerMove={event => {
      const current = press.current
      if (current?.pointerId === event.pointerId && Math.hypot(event.clientX - current.x, event.clientY - current.y) > 10) cancel()
    }}
    onPointerUp={event => {
      if (press.current?.pointerId !== event.pointerId) return
      window.clearTimeout(press.current.timer)
      press.current = null
    }}
    onPointerLeave={cancel} onPointerCancel={cancel} onLostPointerCapture={cancel} onBlur={cancel}
    onContextMenu={event => event.preventDefault()}
    onClick={event => {
      if (event.detail !== 0 && suppressClick.current) { suppressClick.current = false; return }
      onDigit(noteMode)
    }}>{digit}</button>
}
