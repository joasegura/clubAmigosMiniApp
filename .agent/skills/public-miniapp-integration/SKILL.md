---
name: public-miniapp-integration
description: Cómo conectar una app externa de clientes finales (PWA, miniapp, landing) a Nexus de forma segura usando un catálogo público (slug) + login DNI/código + token de socio, sin exponer secretos de la empresa. Patrón usado en clubAmigosMiniApp.
---

# Skill: Conectar una miniapp de clientes a Nexus

Caso de referencia: `clubAmigosMiniApp` (ver `.agent/knowledge/club-amigos-miniapp.md`).

## Reglas de seguridad
- **Nunca** embeber en el navegador el secreto del webhook ni el `company.token`: se pueden leer del bundle y con ellos se crean ventas o leads.
- El cliente final se identifica con **DNI + código por mail** (`public-catalogs/:slug/auth/*`), y la API devuelve un `sessionToken` (`cms1...`).
- Los endpoints del cliente van como `@Public()` + `ClubMemberGuard`, y validan que `session.catalogId` coincida con el slug.
- Las salas de socket públicas solo reciben datos públicos (promedios, "el catálogo cambió"), nunca datos personales.

## Pasos
1. **Nexus**: crear o elegir un `PublicCatalog` con los productos que va a ver la app. Su `slug` es la llave de todo.
2. **API**: si la app necesita datos nuevos, agregar endpoints en un controller `@Public()` con prefijo `/<app>/:slug`. Resolver todo por slug, paginar (máximo 100) y usar `select` estricto.
3. **CORS**: sumar el dominio de la app a `ADDITIONAL_ALLOWED_ORIGINS` (env de la API).
4. **App**:
   - Configurar `VITE_NEXUS_API_URL` (con el prefijo `/api` de la API) y `VITE_NEXUS_CATALOG_SLUG`. Socket.io va en la raíz, sin `/api`.
   - Mandar `Authorization: Bearer <sessionToken>`.
   - Si la app tiene CSP, agregar la API a `connect-src` (`https://` y `wss://`).
5. **Tiempo real**: `socket.emit('join-club-catalog', { slug })` y escuchar `club-catalog-updated` / `club-review-changed`.
6. **Mantener la demo**: separar la capa de datos (`api.ts` demo, `nexusApi.ts` real, `backend.ts` selector tipado con `typeof demo`). Las pantallas no cambian.

## Checklist
- [ ] Sin secretos de empresa en el bundle del cliente.
- [ ] Endpoints de escritura con `ClubMemberGuard` y chequeo de catálogo.
- [ ] CORS + CSP configurados.
- [ ] Build en modo demo y en modo Nexus.
