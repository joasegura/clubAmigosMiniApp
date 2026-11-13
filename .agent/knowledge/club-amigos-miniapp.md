# Integración clubAmigosMiniApp ↔ Nexus (transversal)
- **Última verificación**: 2026-11-13 (integración implementada en la rama `testing` de los 3 repos)
- **Repo**: `clubAmigosMiniApp/` (git propio; trabajo en `testing`; `.agent/` agregado). Stack: React 19 + Vite 8 + TS 6 + Tailwind 4 + PWA, deploy en Vercel, lint con `oxlint`.
- **Archivos clave (miniapp)**:
  - `src/lib/backend.ts`: selector demo/Nexus + `FEATURES` (lo que se oculta en modo Nexus). **Las pantallas importan de acá**, no de `api.ts`.
  - `src/lib/api.ts`: demo con localStorage, sin cambios.
  - `src/lib/nexusApi.ts`: mismas firmas que `api.ts`, contra Nexus.
  - `src/lib/nexus/client.ts` (fetch + sesión), `dto.ts` (respuestas de la API), `realtime.ts` (`useClubUpdates`).
  - `src/pages/LoginNexus.tsx`: ingreso DNI → (alta) → código.
- **Archivos clave (Nexus)**: ver [product-reviews-y-club-app](../../../atom-crm-api/.agent/knowledge/product-reviews-y-club-app.md) y [club-amigos-front](../../../atom-crm-front/.agent/knowledge/club-amigos-front.md).

## Mapeo de conceptos
| Miniapp | Nexus |
|---|---|
| Catálogo de vinos | `PublicCatalog` (slug) → `PublicCatalogProduct` → `Product` |
| `Wine.id` / `nexus_id` | `Product.id` (uuid) |
| winery / varietal | `Product.brand.name` / primera categoría (`CategoryProduct`) |
| "Publicación" (Tasting) | `ProductReview` canal `CLUB_AMIGOS` (1 por socio y vino) |
| Socio (`Profile.id`) | `String(Customer.id)` con `clubJoinedAt` |
| QR de la tarjeta | `ClubQr.code` asignado en Nexus (si no hay, `qr_pending`) |
| Beneficios / próximo beneficio | `ClubLevel` (puntos requeridos + % de descuento) |
| Puntos | `Customer.clubPoints` (sin historial de movimientos todavía) |
| Vino del mes | `Product.outstanding` + `outstandingDescription` |
| Quiero probar | `ProductWishlist` |

## URLs (¡ojo!)
- La API tiene `app.setGlobalPrefix('api')`: `VITE_NEXUS_API_URL` **lleva `/api`** (`http://localhost:3001/api`, prod `https://api-nexus.atomsolucionesit.com.ar/api`).
- Socket.io vive en la **raíz** (sin `/api`). Si se le pasa `/api`, lo toma como namespace y no conecta. `NEXUS_SOCKET_URL` se deriva solo, o se define con `VITE_NEXUS_SOCKET_URL`.
- El dominio de producción de la API es `api-nexus.atomsolucionesit.com.ar` (ver `atom-crm-front/.env.production`). El default `api.nexussoftware.app` de `webhooks.service.ts` NO es la API del front.

## Desarrollo local
1. API en `:3001` (base local `localhost:3306/nexus`; las tablas `product_reviews` y `product_wishlist` ya existen). CORS abierto porque `NODE_ENV` no está definido.
2. `clubAmigosMiniApp/.env.local` (en gitignore): API local + `VITE_NEXUS_CATALOG_SLUG=cat-15-427fec` (catálogo 2, empresa 15 "Distribuidora", tiene vinos). La alternativa es `cat-13-77ae5c` (empresa 13 "Demo").
3. `npm run dev` (`:5173`) o `npm run dev:lan` para probar desde el celular por la IP de la PC. `localhost` se reemplaza solo por la IP.
4. **Antes de valorar**: activar el Club Amigos de la empresa 15 en Nexus (Clientes → Club Amigos → Configuración). El 2026-11-13 ninguna empresa local tenía `ClubConfig`, y sin eso la API responde 403 "El Club Amigos no está activo".
5. El código de ingreso llega por mail real (la API local tiene `MAIL_*` configurado): el cliente de prueba necesita un email válido.

## Activar en producción
1. API: `CLUB_APP_SESSION_SECRET` (recomendado) y el dominio de Vercel en `ADDITIONAL_ALLOWED_ORIGINS`. El deploy aplica el schema con `prisma db push`.
2. Vercel (miniapp): `VITE_NEXUS_API_URL` (con `/api`) y `VITE_NEXUS_CATALOG_SLUG`. `vercel.json` ya permite `api-nexus.atomsolucionesit.com.ar` en `connect-src`; si cambia el dominio, actualizarlo.
3. Nexus: catálogo público con `isClubActive`, Club Amigos activo (`ClubConfig.isActive`), niveles cargados y QRs asignados.

## Fuera de esta etapa (ocultos con FEATURES)
Fotos, brindis, comentarios en hilo, reportes, vinos externos, ocasión, panel de la vinoteca dentro de la app e historial de puntos.

## Trampas conocidas
- El secreto del webhook no puede vivir en la miniapp (ver skill `public-miniapp-integration`).
- `oxlint` ya tenía 10 advertencias `set-state-in-effect` antes de la integración; el conteo no cambió.
