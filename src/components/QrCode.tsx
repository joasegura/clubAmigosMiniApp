import { useMemo } from 'react'
import qrcode from 'qrcode-generator'

/** Código QR dibujado en SVG (nítido en cualquier pantalla, sin servicios externos) */
export default function QrCode({ value, size = 200, label }: { value: string; size?: number; label: string }) {
  const { count, path } = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(value)
    qr.make()
    const n = qr.getModuleCount()
    let d = ''
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`
    }
    return { count: n, path: d }
  }, [value])

  // Margen de 2 módulos alrededor: los lectores lo necesitan para encontrar el código
  const box = count + 4
  return (
    <svg role="img" aria-label={label} width={size} height={size} viewBox={`-2 -2 ${box} ${box}`} shapeRendering="crispEdges">
      <rect x={-2} y={-2} width={box} height={box} fill="#fff" />
      <path d={path} fill="#1C1A19" />
    </svg>
  )
}
