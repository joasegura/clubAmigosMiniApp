# Club Entre amigos

App web (PWA) del club de amigos de la vinoteca **Entre amigos**. Los socios suben los vinos que toman, los puntúan con copas, comentan, brindan y arman el ranking del club. Desde cada vino pueden pedirlo por WhatsApp a la vinoteca.

Desarrollado por ATOM Soluciones IT.

> **Versión demo (sin servidor).** Esta versión es para mostrarle la app al cliente: no usa base de datos ni login real. Los datos se guardan **en el navegador de cada dispositivo** (localStorage y, para las fotos, IndexedDB) y arranca con un club de ejemplo cargado. Lo que carga una persona no lo ven las demás.

## Qué incluye

| Pantalla | Funciones |
|---|---|
| Ingreso | "Continuar con Google" o código de 6 números por mail (simulados: el código se muestra en pantalla). Primer ingreso: el socio elige su nombre. Acceso de demo como la vinoteca |
| Inicio | Vino del mes con "Lo quiero", feed de publicaciones, brindis, comentarios, reportar |
| Ranking | Un voto por socio (su último puntaje), orden por promedio ponderado, filtros por cepa y precio, "el más tomado del mes" |
| Subir vino | Buscar en el catálogo (sin importar tildes) o cargar un vino externo, foto (se comprime antes de guardar), puntaje 1–5 copas, comentario y ocasión |
| Ficha del vino | Fotos del club, puntaje, puesto en el ranking, precio y stock, opiniones, "Lo tomé", "Lo quiero" por WhatsApp, guardar en "Quiero probar" |
| Mi tarjeta | QR con el número de socio para mostrar en la caja, puntos, progreso al próximo beneficio, beneficios y últimos movimientos (reglas y puntos de ejemplo hasta conectar Nexus) |
| Perfil | Mis vinos, estadísticas, lista "Quiero probar", editar nombre, términos y privacidad, **Reiniciar demo** |
| Panel de la vinoteca | Números de la semana, **cargar compra por número de socio** (simula la caja con Nexus), vino del mes, moderar reportes, volver a mostrar lo oculto, catálogo con precio, stock, foto y visibilidad, **importar catálogo desde CSV** |
| Términos y privacidad | Textos modelo en `/terminos` y `/privacidad` (completar datos de la vinoteca y validarlos) |

**Stack:** React + Vite + TypeScript + Tailwind, PWA, Vercel. Se instala desde el navegador, sin pasar por las tiendas de apps.

**Reglas importantes**
- Los vinos externos quedan en el perfil del socio pero no cuentan para el ranking.
- Subir el mismo vino varias veces no suma votos: cuenta el último puntaje de cada socio.
- Las reglas de permisos (un socio no puede borrar lo de otro, entrar al panel, cambiar precios, etc.) están en `src/lib/api.ts`, igual que las aplicaría el servidor.

## Cómo mostrar la demo

1. Entrar con un mail cualquiera (el código aparece en pantalla) o con "Continuar con Google".
2. Subir un vino con foto, brindar, comentar, guardar en "Quiero probar".
3. Cerrar sesión y entrar con **"Entrar como la vinoteca"** para mostrar el panel: estadísticas, moderación, vino del mes, importación de CSV.
4. Antes de cada presentación: **Perfil → Reiniciar demo** deja todo como nuevo.

## Desarrollo local
```bash
npm install
cp .env.example .env    # completar el WhatsApp de la vinoteca
npm run dev             # http://localhost:5173
npm run build           # compila para producción
npm run lint
```

## Publicar en Vercel
1. Importar el repo en [vercel.com](https://vercel.com). Detecta Vite solo.
2. En **Environment Variables**, cargar `VITE_WHATSAPP_NUMBER`: el WhatsApp de la vinoteca, solo números con código de país (ej. `5493772123456`). Sin esto, "Lo quiero" abre WhatsApp sin destinatario y el panel lo avisa.
3. Hacer el deploy. `vercel.json` ya trae los headers de seguridad y el caché de los archivos.

En el celular, el socio entra al link y elige "Agregar a pantalla de inicio".

## Importar el catálogo (CSV)
Desde el panel de la vinoteca → **Importar CSV**. Acepta coma o punto y coma (Excel en español) y precios como `18.500,50`. Columnas: `codigo, nombre, bodega, cepa, año, region, precio, stock` (solo `nombre` es obligatoria). Si el código ya existe, el vino se actualiza. En el panel se puede descargar una plantilla.

## Pasar a producción (siguiente etapa)
Todo el acceso a datos está en `src/lib/api.ts`. Para tener datos compartidos entre socios y login real, hay que reemplazar ese archivo por uno que hable con un backend, manteniendo las mismas funciones: las pantallas no cambian.

En `supabase/` quedó un esquema inicial de Supabase (tablas, permisos y fotos). Antes de usarlo hay que pasarle las reglas que hoy tiene la demo: un voto por socio en el ranking, promedio ponderado, mes en hora de Argentina, límite de largo del nombre, socios sin `image_url` en vinos externos e índices. Para el login real conviene el código de 6 números por mail (el link no funciona bien con la app instalada en iPhone) y un SMTP propio.

## Modo Nexus (datos reales)
Con `VITE_NEXUS_API_URL` y `VITE_NEXUS_CATALOG_SLUG` configuradas, la app deja de usar la demo y trabaja contra Nexus:
- **Catálogo en tiempo real**: los vinos del catálogo público que la vinoteca arma en Nexus, con precio y stock. Se actualiza solo (socket).
- **Ingreso**: DNI + código por mail. Si el DNI no está registrado, el socio se da de alta y queda en el club.
- **Valorar y comentar**: 1 a 5 copas + comentario. Cuenta un voto por socio y vino (el último). La vinoteca los ve y los modera en Nexus → Productos → Valoraciones.
- **Mi tarjeta**: el QR que la vinoteca le asignó en Nexus, sus puntos y los niveles reales del club.
- **Quiero probar**, ranking, vino del mes (producto "destacado" en Nexus) y el más tomado del mes.

Fotos, brindis, comentarios en hilo, reportes y vinos externos siguen solo en la demo (ver `FEATURES` en `src/lib/backend.ts`). Sin esas variables, la app sigue siendo la demo de siempre.

## Tarjeta de socio y puntos
El QR solo lleva el número de socio (ej. `EA001001`), así la caja lo puede leer con cualquier lector y buscar al cliente. Las reglas de ejemplo están en `POINTS_RULES` (`src/lib/seed.ts`): 50 puntos de bienvenida, 1 punto cada $1.000 y beneficios a los 100, 250 y 500 puntos. Al conectar Nexus hay que acordar el formato del QR y que Nexus informe los movimientos de puntos; la pantalla no cambia.

## Etapa 2 (ideas ya conversadas)
- Conexión con Nexus (sincronizar catálogo, precio y stock por código, y puntos de la tarjeta de socio).
- Ingreso con código por WhatsApp.
- Eventos y catas con confirmación de asistencia y puntaje de los vinos de la cata.
- Insignias ("probó 10 malbecs", "explorador de 5 bodegas").
- Reserva para retirar que entre como pedido en Nexus, en lugar de WhatsApp.
- Notificaciones (vino del mes nuevo, alguien comentó tu vino).
