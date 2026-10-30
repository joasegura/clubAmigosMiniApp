/**
 * DATOS DE EJEMPLO de la demo: catálogo, socios y publicaciones inventados.
 * Las fechas se calculan desde el momento en que se arma la demo, así el
 * club siempre se ve con actividad reciente.
 */
import type { DB } from './store'
import type { Profile, Tasting, Wine } from './types'

export const SHOP_ID = 'u-vinoteca'

const CATALOG: [string, string, string, number | null, string, number, boolean][] = [
  ['Malbec Reserva', 'Finca Los Álamos', 'Malbec', 2021, 'Valle de Uco, Mendoza', 18500, true],
  ['Malbec Clásico', 'Bodega Tres Cerros', 'Malbec', 2022, 'Luján de Cuyo, Mendoza', 9800, true],
  ['Gran Malbec', 'Altos del Río', 'Malbec', 2019, 'Gualtallary, Mendoza', 42000, true],
  ['Cabernet Franc', 'Finca Los Álamos', 'Cabernet Franc', 2020, 'Valle de Uco, Mendoza', 21000, true],
  ['Cabernet Sauvignon', 'Bodega Tres Cerros', 'Cabernet Sauvignon', 2021, 'Maipú, Mendoza', 11500, true],
  ['Blend de Tintos', 'Altos del Río', 'Blend', 2019, 'Mendoza', 26000, true],
  ['Bonarda', 'Viñas del Este', 'Bonarda', 2022, 'San Martín, Mendoza', 7900, true],
  ['Syrah', 'Cuesta Blanca', 'Syrah', 2021, 'Valle de Tulum, San Juan', 10200, false],
  ['Pinot Noir', 'Patagonia Sur', 'Pinot Noir', 2022, 'Río Negro', 23500, true],
  ['Torrontés', 'Altura Calchaquí', 'Torrontés', 2023, 'Cafayate, Salta', 8900, false],
  ['Chardonnay', 'Finca Los Álamos', 'Chardonnay', 2022, 'Valle de Uco, Mendoza', 14800, true],
  ['Sauvignon Blanc', 'Patagonia Sur', 'Sauvignon Blanc', 2023, 'Neuquén', 12300, true],
  ['Rosado de Malbec', 'Viñas del Este', 'Rosado', 2023, 'Mendoza', 8400, true],
  ['Espumante Extra Brut', 'Cuesta Blanca', 'Espumante', null, 'Mendoza', 16900, true],
]

const MEMBERS: [id: string, name: string, email: string, daysAgo: number][] = [
  [SHOP_ID, 'Vinoteca Entre amigos', 'vinoteca@entreamigos.demo', 60],
  ['u-martin', 'Martín Gómez', 'martin@demo.com', 45],
  ['u-lucia', 'Lucía Fernández', 'lucia@demo.com', 40],
  ['u-sofia', 'Sofía Ramírez', 'sofia@demo.com', 30],
  ['u-diego', 'Diego Paz', 'diego@demo.com', 21],
  ['u-caro', 'Carolina Ruiz', 'caro@demo.com', 5],
  ['u-pablo', 'Pablo Medina', 'pablo@demo.com', 2],
]

// [socio, vino (1-14), copas, comentario, ocasión, hace cuántas horas]
const TASTINGS: [string, number, number, string | null, string | null, number][] = [
  ['u-martin', 1, 5, 'Lo abrimos en el asado del domingo y voló. Taninos suaves, mucha fruta roja. Repetimos seguro.', 'Asado', 3],
  ['u-lucia', 11, 4, 'Fresco y con buena acidez, ideal para unas pastas con crema.', 'Cena', 8],
  ['u-diego', 3, 5, 'Para una ocasión especial. Largo, complejo, vale cada peso.', 'Celebración', 20],
  ['u-sofia', 13, 4, 'Rico bien frío en la pileta. Muy fácil de tomar.', 'Con amigos', 30],
  ['u-caro', 2, 4, 'Precio-calidad imbatible para todos los días.', 'Cena', 44],
  ['u-pablo', 9, 5, 'Primer Pinot que me gusta de verdad. Liviano pero con carácter.', 'En pareja', 52],
  ['u-martin', 4, 4, 'Especiado, con ese toque herbal del Franc. Muy bueno con cordero.', 'Asado', 70],
  ['u-lucia', 14, 5, 'Brindamos por el cumple de mi vieja. Burbuja fina, seco, excelente.', 'Celebración', 95],
  ['u-diego', 7, 3, 'Correcto, frutado. Para la semana está bien.', null, 120],
  ['u-sofia', 1, 5, 'Coincido con Martín: el mejor Malbec que probé este año.', 'Regalo', 150],
  ['u-caro', 6, 4, 'Redondo, se nota la madera pero sin tapar la fruta.', 'Cena', 180],
  ['u-martin', 5, 3, 'Le faltó un poco de cuerpo para mi gusto.', null, 220],
  ['u-pablo', 12, 4, 'Cítrico y herbáceo, perfecto con mariscos.', 'Cena', 260],
  ['u-lucia', 1, 4, 'Muy bueno, aunque el Gran Malbec juega en otra liga.', 'Con amigos', 300],
  ['u-diego', 9, 4, 'Delicado, para tomar sin apuro.', 'En pareja', 340],
  ['u-sofia', 3, 5, null, 'Celebración', 400],
  ['u-caro', 10, 4, 'Aromático, floral, ideal con empanadas salteñas.', 'Con amigos', 450],
  ['u-martin', 2, 4, null, 'Asado', 520],
]

const COMMENTS: [tasting: number, user: string, body: string, hoursAfter: number][] = [
  [0, 'u-lucia', '¡Lo tengo anotado para el finde! 🍷', 1],
  [0, 'u-diego', 'Ese Malbec es un golazo.', 2],
  [2, 'u-martin', 'Envidia sana. ¿Lo decantaste?', 3],
  [2, 'u-diego', 'Una hora antes, cambia muchísimo.', 4],
  [5, 'u-sofia', 'Me lo llevo la próxima, gracias por la recomendación.', 5],
  [7, 'u-caro', 'Feliz cumple a tu mamá!', 6],
]

function wineId(n: number) {
  return `w${String(n).padStart(2, '0')}`
}

export function buildSeed(now = Date.now()): DB {
  const ago = (hours: number) => new Date(now - hours * 3600_000).toISOString()

  const profiles: Profile[] = MEMBERS.map(([id, display_name, email, days]) => ({
    id,
    email,
    display_name,
    avatar_url: null,
    role: id === SHOP_ID ? 'admin' : 'socio',
    created_at: ago(days * 24),
  }))

  const wines: Wine[] = CATALOG.map(([name, winery, varietal, vintage, region, price, in_stock], i) => ({
    id: wineId(i + 1),
    nexus_id: `PRUEBA-${String(i + 1).padStart(3, '0')}`,
    name,
    winery,
    varietal,
    vintage,
    region,
    price,
    in_stock,
    image_url: null,
    source: 'catalogo',
    active: true,
    created_by: null,
  }))

  const tastings: Tasting[] = TASTINGS.map(([user_id, wine, rating, comment, occasion, hours], i) => ({
    id: `t${String(i + 1).padStart(2, '0')}`,
    user_id,
    wine_id: wineId(wine),
    rating,
    comment,
    occasion,
    photo_path: null,
    hidden: false,
    created_at: ago(hours),
  }))

  const memberIds = MEMBERS.slice(1).map(([id]) => id)
  const cheers = tastings.flatMap((t, i) =>
    memberIds
      .filter((u, j) => u !== t.user_id && (i + j) % 3 !== 0)
      .slice(0, 6 - (i % 5))
      .map((user_id) => ({ tasting_id: t.id, user_id, created_at: t.created_at })),
  )

  const comments = COMMENTS.map(([ti, user_id, body, after], i) => ({
    id: `c${i + 1}`,
    tasting_id: tastings[ti].id,
    user_id,
    body,
    hidden: false,
    created_at: ago(TASTINGS[ti][5] - after),
  }))

  return {
    version: 1,
    profiles,
    wines,
    tastings,
    cheers,
    comments,
    wishlist: [],
    reports: [
      {
        id: 'r1',
        target_type: 'tasting',
        target_id: 't09',
        reporter_id: 'u-sofia',
        reason: 'Foto que no tiene nada que ver',
        status: 'pendiente',
        created_at: ago(10),
      },
    ],
    wantClicks: [1, 1, 3, 9, 14, 1, 11, 2].map((w, i) => ({
      id: `wc${i + 1}`,
      wine_id: wineId(w),
      user_id: memberIds[i % memberIds.length],
      created_at: ago(6 + i * 17),
    })),
    settings: { wine_of_month_id: wineId(1), wine_of_month_note: '15% off para socios todo el mes' },
  }
}
