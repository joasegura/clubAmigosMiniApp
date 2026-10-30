/**
 * Importación del catálogo desde un CSV (por ejemplo, exportado de Nexus o
 * de Excel). Acepta coma o punto y coma, y encabezados en español o inglés.
 */
import type { Wine } from './types'

export type CatalogRow = Pick<Wine, 'nexus_id' | 'name' | 'winery' | 'varietal' | 'vintage' | 'region' | 'price' | 'in_stock'>

const HEADERS: Record<keyof CatalogRow, string[]> = {
  nexus_id: ['nexus_id', 'codigo', 'cod', 'sku', 'id'],
  name: ['name', 'nombre', 'vino', 'producto', 'descripcion'],
  winery: ['winery', 'bodega'],
  varietal: ['varietal', 'cepa', 'varietal/cepa'],
  vintage: ['vintage', 'ano', 'anio', 'cosecha'],
  region: ['region', 'zona', 'origen'],
  price: ['price', 'precio', 'precio venta', 'pvp'],
  in_stock: ['in_stock', 'stock', 'disponible', 'hay stock'],
}

export const CSV_TEMPLATE =
  'codigo;nombre;bodega;cepa;año;region;precio;stock\nNX-0001;Malbec Reserva;Finca Los Álamos;Malbec;2021;Valle de Uco, Mendoza;18500;si\n'

const normalizeHeader = (h: string) =>
  h.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase()

function splitRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === delimiter) {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim()))
}

/** "18.500,50", "18500.5" o "$ 18.500" → 18500.5 */
export function parsePrice(raw: string): number | null {
  let s = raw.replace(/[^\d.,-]/g, '')
  if (!s) return null
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.')
  else if (s.includes(',')) s = s.replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '')
  const n = Number(s)
  return Number.isFinite(n) && n >= 0 ? n : null
}

function parseStock(raw: string): boolean {
  const s = normalizeHeader(raw)
  if (!s) return true
  if (/^\d+([.,]\d+)?$/.test(s)) return Number(s.replace(',', '.')) > 0
  return ['si', 's', 'true', '1', 'x', 'yes', 'disponible', 'con stock'].includes(s)
}

export function parseCatalogCsv(text: string): { rows: CatalogRow[]; skipped: number } {
  const clean = text.replace(/^﻿/, '')
  const firstLine = clean.split(/\r?\n/)[0] ?? ''
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','
  const [header, ...data] = splitRows(clean, delimiter)
  if (!header) throw new Error('El archivo está vacío')

  const cols = header.map(normalizeHeader)
  const index = Object.fromEntries(
    (Object.keys(HEADERS) as (keyof CatalogRow)[]).map((k) => [k, cols.findIndex((c) => HEADERS[k].includes(c))]),
  ) as Record<keyof CatalogRow, number>
  if (index.name < 0) throw new Error('Falta la columna "nombre"')

  let skipped = 0
  const rows: CatalogRow[] = []
  for (const r of data) {
    const get = (k: keyof CatalogRow) => (index[k] >= 0 ? (r[index[k]] ?? '').trim() : '')
    const name = get('name').slice(0, 120)
    if (!name) {
      skipped++
      continue
    }
    const vintage = Number(get('vintage'))
    rows.push({
      nexus_id: get('nexus_id') || null,
      name,
      winery: get('winery').slice(0, 120) || null,
      varietal: get('varietal').slice(0, 60) || null,
      vintage: Number.isInteger(vintage) && vintage >= 1900 && vintage <= 2100 ? vintage : null,
      region: get('region').slice(0, 120) || null,
      price: parsePrice(get('price')),
      in_stock: index.in_stock >= 0 ? parseStock(get('in_stock')) : true,
    })
  }
  return { rows, skipped }
}
