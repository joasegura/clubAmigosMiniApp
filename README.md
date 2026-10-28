# Club Entre amigos

App web (PWA) del club de amigos de la vinoteca **Entre amigos**. Los socios suben los vinos que toman, los puntúan con copas, comentan, brindan y arman el ranking del club. Desde cada vino pueden pedirlo por WhatsApp a la vinoteca.

Desarrollado por ATOM Soluciones IT.

## Qué incluye el MVP

| Pantalla | Funciones |
|---|---|
| Ingreso | Google o link al mail (sin contraseña) |
| Inicio | Vino del mes con "Lo quiero", feed de publicaciones, brindis, comentarios, reportar |
| Ranking | Puntaje promedio por vino del catálogo, filtros por cepa y precio, "el más tomado del mes" |
| Subir vino | Buscar en el catálogo o cargar un vino externo, foto (se comprime antes de subir), puntaje 1–5 copas, comentario y ocasión |
| Ficha del vino | Fotos del club, puntaje, precio y stock, opiniones, "Lo tomé", "Lo quiero" por WhatsApp, guardar en "Quiero probar" |
| Perfil | Mis vinos, estadísticas, lista "Quiero probar", editar nombre, cerrar sesión |
| Panel de la vinoteca | Números de la semana (socios nuevos, vinos subidos, toques en "Lo quiero"), elegir el vino del mes, moderar reportes, catálogo con precio y stock |

**Stack:** React + Vite + TypeScript + Tailwind, Supabase (base de datos, login, fotos), Vercel. Se instala desde el navegador, sin pasar por las tiendas de apps.

**Reglas importantes**
- Los vinos externos quedan en el perfil del socio pero no cuentan para el ranking.
- Todas las reglas de permisos están en la base de datos (Row Level Security). Un socio no puede cambiar precios, hacerse admin, publicar a nombre de otro ni ver lo que ocultó la vinoteca.

---

## Puesta en producción

### 1. Supabase
1. Crear un proyecto en [supabase.com](https://supabase.com). Elegir la región **São Paulo**, que es la más cercana.
2. En **SQL Editor**, pegar y correr completo `supabase/migrations/20261024000000_club_inicial.sql`.
3. Opcional: correr `supabase/seed.sql` para cargar el **catálogo de prueba**. Son 14 vinos inventados, todos con `nexus_id` que empieza con `PRUEBA-`.
4. En **Project Settings → API**, copiar la `Project URL` y la `anon public key`.

### 2. Login
En **Authentication → URL Configuration**:
- **Site URL:** el dominio final (por ejemplo `https://club.entreamigos.com.ar`).
- **Redirect URLs:** agregar ese dominio y `http://localhost:5173` para desarrollo.

**Google**
1. En [Google Cloud Console](https://console.cloud.google.com/), ir a APIs y servicios → Credenciales y crear un **ID de cliente OAuth** de tipo *Aplicación web*.
2. En URI de redirección autorizado, cargar `https://<tu-proyecto>.supabase.co/auth/v1/callback`.
3. En Supabase, ir a **Authentication → Providers → Google**, activarlo y pegar el Client ID y el Secret.
4. Configurar la pantalla de consentimiento con el nombre "Club Entre amigos" y el logo, y publicarla (salir del modo prueba).

**Mail con link**
- Ya viene activado. El mail que manda Supabase por defecto tiene un límite bajo de envíos por hora, así que para producción hay que configurar un SMTP propio en **Authentication → Emails → SMTP Settings**. Resend o Brevo tienen planes gratis que alcanzan.
- Conviene traducir la plantilla "Magic Link" al español en **Authentication → Emails → Templates**.

### 3. Primer administrador
Entrar a la app una vez con la cuenta de la vinoteca y después correr en el SQL Editor:
```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'MAIL-DE-LA-VINOTECA');
```
Desde ese momento, en el Perfil aparece el botón **Panel de la vinoteca**.

### 4. Vercel
1. Importar el repo en [vercel.com](https://vercel.com). Detecta Vite solo.
2. En **Environment Variables**, cargar:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_WHATSAPP_NUMBER`: el WhatsApp de la vinoteca, solo números con código de país (ej. `5493772123456`)
3. Hacer el deploy y, si se quiere, conectar un dominio propio. Si se conecta, actualizar el Site URL en Supabase.

### 5. Difusión
Imprimir un QR con el link de la app para el mostrador, las bolsas y los tickets. En el celular, el socio entra y elige "Agregar a pantalla de inicio".

---

## Desarrollo local
```bash
npm install
cp .env.example .env    # completar con los datos de Supabase
npm run dev             # http://localhost:5173
npm run build           # compila para producción
```

## Conexión con Nexus (siguiente etapa)
La app lee el catálogo de la tabla `wines` (`source = 'catalogo'`). Todo el acceso a datos está centralizado en `src/lib/api.ts`. Para conectar Nexus:
1. Hacer una sincronización (Edge Function programada o webhook desde Nexus) que haga **upsert por `nexus_id`** de nombre, bodega, cepa, año, precio, `in_stock` y foto.
2. Borrar los datos de prueba con `delete from public.wines where nexus_id like 'PRUEBA-%';`.
3. Opcional: ocultar del panel admin la edición manual de precio y stock, porque pasarían a venir de Nexus.

Las pantallas no cambian.

## Etapa 2 (ideas ya conversadas)
- Ingreso con código por WhatsApp (requiere Twilio o la API de Meta).
- Eventos y catas con confirmación de asistencia y puntaje de los vinos de la cata.
- Insignias ("probó 10 malbecs", "explorador de 5 bodegas").
- Reserva para retirar que entre como pedido en Nexus, en lugar de WhatsApp.
- Notificaciones (vino del mes nuevo, alguien comentó tu vino).
