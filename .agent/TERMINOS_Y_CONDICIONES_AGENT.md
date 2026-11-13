# TÉRMINOS Y CONDICIONES DE OPERACIÓN Y USO ESTANDARIZADO PARA AGENTES DE IA

> **Vigencia**: Permanente y de aplicación obligatoria para todo Agente de Inteligencia Artificial (Antigravity, Cursor, Copilot o derivados) que opere en el repositorio o monorepo **Nexus**.

---

## 1. PROPÓSITO Y ÁMBITO DE APLICACIÓN

El presente documento establece los **Términos y Condiciones Contractuales de Operación** a los que todo Agente de IA queda subordinado al interactuar con el código fuente, bases de datos, dependencias, ramas de control de versiones y entornos de ejecución del proyecto.

El objetivo primario es garantizar:
1. **Estabilidad Absoluta**: Proteger la integridad de la base de datos contra cuellos de botella, sobrecargas y bloqueos.
2. **Preservación del Patrimonio del Código**: Evitar la sobreescritura accidental, regresiones o pérdida de lógica preexistente.
3. **Control Estricto de Supresiones**: Erradicar la eliminación silenciosa de código, requiriendo autorización explícita previa y notificación detallada del agente.
4. **Estandarización de Nuevas Implementaciones**: Mantener coherencia arquitectónica en NestJS (backend) y React/Vite (frontend).

---

## 2. CLÁUSULAS FUNDAMENTALES Y POLÍTICA DE ELIMINACIÓN

### Cláusula 2.1 — Política de Cero Eliminación Silenciosa (Zero Silent Deletion)
- **Prohibición**: Queda terminantemente PROHIBIDO que el agente elimine archivos, tablas/modelos de Prisma, endpoints de API, servicios, métodos, componentes visuales, funciones utilitarias o bloques de código sin solicitud previa y expresa del usuario.
- **Protocolo de Aviso Obligatorio**: Si durante una refactorización o corrección el agente determina técnicamente que un bloque de código debe ser removido o sustituido:
  1. El agente **NO** debe borrar el código de forma unilateral.
  2. El agente **DEBE** enviar un mensaje explícito y destacado al usuario indicando:
     - Archivo(s) y número de líneas exactas a remover.
     - Motivo técnico por el cual se propone la eliminación.
     - Análisis de impacto (si otros módulos, endpoints o componentes dependen de él).
     - Solicitud de autorización expresa al usuario antes de aplicar la supresión.
- **Preferencia por Deprecación**: Ante la duda sobre si un código sigue siendo consumido o no, el agente debe marcarlo como `@deprecated` o encapsularlo, en lugar de eliminarlo.

### Cláusula 2.2 — Prohibición de Sobreescritura Destructiva
- El agente **NUNCA** debe reemplazar un archivo existente completo cuando la tarea requiera modificar una función o añadir una propiedad.
- Antes de aplicar cualquier cambio, el agente debe **leer e inspeccionar** el archivo objetivo en su totalidad o en su bloque circundante para retener:
  - Importaciones existentes.
  - Tipados e interfaces TypeScript existentes.
  - Validaciones de negocio previas.
  - Comentarios, anotaciones y docstrings.
- Las modificaciones deben ejecutarse con herramientas de edición quirúrgica (reemplazos específicos de bloques de texto mínimos) para preservar intacta la lógica no relacionada.

---

## 3. RESPONSABILIDAD Y PROTECCIÓN DE LA BASE DE DATOS

El agente es responsable de asegurar que ninguna línea de código añadida o modificada provoque degradación del rendimiento en el motor de base de datos.

### Cláusula 3.1 — Erradicación del Problema N+1
- Queda prohibido iterar colecciones en memoria (`forEach`, `map`, `for...of`) ejecutando llamadas asíncronas a la base de datos (`await prisma...`) dentro del bucle.
- Todo agente debe utilizar consultas por lote (`in: [ids]`), joins controlados mediante `include` o agrupamientos en una única sentencia SQL/Prisma.

### Cláusula 3.2 — Paginación y Límites Obligatorios
- Toda consulta que liste registros (`findMany`) expuesta a consumo de API o interfaz de usuario debe incorporar parámetros de paginación (`take`, `skip`, o cursores basados en ID/fecha).
- Ningún endpoint puede devolver colecciones no acotadas hacia el cliente.

### Cláusula 3.3 — Selección Quirúrgica de Campos
- Se prohíbe el uso indiscriminado de `include` para traer árboles enteros de relaciones cuando solo se requieren campos específicos.
- Se debe priorizar el uso de `select` para limitar la transferencia de red y el uso de memoria tanto en la BD como en el servidor Node.js.

### Cláusula 3.4 — Transacciones Breves y Aislamiento de Red
- En bloques `prisma.$transaction`:
  - **PROHIBIDO** incluir llamadas HTTP a pasarelas de pago (MercadoPago), AFIP, webhooks externos, envío de correos o subidas de archivos a Cloudinary/S3 dentro de la transacción de base de datos.
  - La transacción debe contener estrictamente las operaciones de escritura que requieran atomicidad y resolverse en milisegundos para evitar `lock timeouts` y agotamiento del pool de conexiones.

### Cláusula 3.5 — Procesamiento Asíncrono en Background
- Tareas masivas, exportación de reportes voluminosos, sincronizaciones y envíos de notificaciones deben delegarse a workers de fondo mediante colas (**BullMQ**), liberando inmediatamente la transacción y el hilo de la API.

---

## 4. ESTÁNDARES PARA NUEVAS IMPLEMENTACIONES

### Cláusula 4.1 — Backend (NestJS / TypeScript / Prisma)
1. **Arquitectura por Capas**:
   - `Controller`: Manejo de rutas, Swagger, decoradores HTTP y recepción de DTOs. Cero lógica de negocio.
   - `Service`: Lógica de dominio, reglas de negocio, orquestación y validaciones.
   - `Prisma / Repositorio`: Acceso a datos.
2. **Validación de Entrada**: Todo endpoint debe contar con su clase DTO validada mediante decoradores de `class-validator` y transformaciones de `class-transformer`.
3. **Manejo Estricto de Tipos**: Prohibido el uso del tipo `any`. Todos los métodos deben tener tipado explícito de argumentos y de retorno (`Promise<T>`).
4. **Respuestas de Error**: Se deben utilizar las excepciones estándar de NestJS (`NotFoundException`, `BadRequestException`, `ConflictException`, etc.) con mensajes informativos y coherentes.

### Cláusula 4.2 — Frontend (React / Vite / TypeScript / Tailwind / Shadcn)
1. **Desacoplamiento Lógico**: La lógica de negocio y llamadas a API deben vivir en Custom Hooks (`src/hooks/use...ts`). Los componentes deben enfocarse en la presentación e interactividad.
2. **Control de Estado de Carga y Errores**: Todo flujo de petición asíncrona debe contemplar estados explícitos de `isLoading`, `isError`, y feedback visual al usuario (toasts, loaders, placeholders).
3. **Compatibilidad Multi-tenant**: Si el código interactúa con configuraciones de marca o perfiles (`nexus`, `byfesta`), se debe respetar la modularidad sin sobreescribir lógica de otros tenants.

---

## 5. PROTOCOLO DE TRABAJO CON GIT Y RAMAS

### Cláusula 5.1 — Rama Designada de Pruebas (`testing`)
- Todo cambio de desarrollo e integración del agente debe realizarse y comitearse sobre la rama **`testing`**.
- Queda prohibido intentar hacer push directo a `main` o sobreescribir historiales con `git push --force`.

### Cláusula 5.2 — Verificación Previa y Respeto a Hooks
- Antes de comitear o hacer push, el agente debe verificar que:
  1. No existan errores de sintaxis ni de compilación TypeScript (`tsc`).
  2. Las pruebas unitarias pasen satisfactoriamente (tanto en API como en Front, donde los pre-push hooks ejecutan `vitest` / `jest`).
- Si un hook de Git falla, el agente debe corregir el fallo reportado en lugar de usar `--no-verify`.

---

## 6. ACEPTACIÓN Y CUMPLIMIENTO

Al ser invocado, el Agente de IA asume el compromiso vinculante de seguir estas normas punto por punto. El incumplimiento de estas directivas conllevará la invalidación de la respuesta y la reversión inmediata de los cambios mediante control de versiones.
