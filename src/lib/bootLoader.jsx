// Boot loader. index.html paints the same markup (#app-loader) before any JS
// runs; React shows <BootLoader /> for its own loading states, so the screen
// never jumps between different loaders. The first real screen renders
// <BootDone />, which fades the boot layer out once fonts are in.
import { useLayoutEffect } from 'react'

export function BootLoader() {
  return (
    <div className="ltj-boot" role="status" aria-label="Loading LIMITLESS">
      <div className="ltj-boot-grid" />
      <div className="ltj-boot-spot" />
      <div className="ltj-boot-chip"><img src="/logo2.png" alt="" /></div>
      <div className="ltj-boot-bar"><i /></div>
    </div>
  )
}

let done = false
export function bootDone() {
  if (done || typeof document === 'undefined') return
  done = true
  const el = document.getElementById('app-loader')
  if (!el) return
  const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()
  Promise.race([fonts, new Promise((r) => setTimeout(r, 500))]).then(() => {
    requestAnimationFrame(() => {
      el.classList.add('out')
      setTimeout(() => el.remove(), 650)
    })
  })
}

export function BootDone() {
  useLayoutEffect(() => { bootDone() }, [])
  return null
}
