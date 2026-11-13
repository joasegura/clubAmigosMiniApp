# MANUAL DE ESTANDARIZACIÓN TÉCNICA Y PROTOCOLO DE DESARROLLO

> **Destinatario**: Agentes Autónomos de Inteligencia Artificial y Desarrolladores del Ecosistema Nexus.
> **Objetivo**: Estandarizar código, blindar la base de datos contra saturaciones, erradicar sobreescrituras no intencionadas y regular las eliminaciones de código.

---

## ÍNDICE RÁPIDO

1. [Prevención de Sobrecarga en Base de Datos](#1-prevención-de-sobrecarga-en-base-de-datos)
2. [Preservación e Inmutabilidad de Código Existente](#2-preservación-e-inmutabilidad-de-código-existente)
3. [Protocolo Obligatorio para Eliminación de Código](#3-protocolo-obligatorio-para-eliminación-de-código)
4. [Estandarización de Nuevas Implementaciones](#4-estandarización-de-nuevas-implementaciones)
5. [Checklist Operativo para el Agente](#5-checklist-operativo-para-el-agente)

---

## 1. PREVENCIÓN DE SOBRECARGA EN BASE DE DATOS

La persistencia de datos en Nexus se gestiona a través de **Prisma ORM**. Las siguientes reglas son de cumplimiento estricto para evitar degradación del pool de conexiones, bloqueos de tablas y consumo desmedido de memoria:

### 1.1 Prohibición de Consultas N+1

❌ **INCORRECTO (Sobrecarga la BD con N queries secuenciales):**
```typescript
// NUNCA hacer esto:
const products = await this.prisma.product.findMany({ where: { companyId } });
for (const product of products) {
  // Query individual por cada producto en la lista -> Mata el pool
  const stock = await this.prisma.stock.findUnique({ where: { productId: product.id } });
  product.currentStock = stock?.quantity ?? 0;
}
```

✅ **CORRECTO (Una única consulta optimizada o agregación por lote):**
```typescript
const products = await this.prisma.product.findMany({
  where: { companyId },
  select: {
    id: true,
    name: true,
    price: true,
    stock: {
      select: { quantity: true },
    },
  },
  take: 50, // Paginado siempre
});
```

---

### 1.2 Paginación Obligatoria en Listados

Ningún endpoint ni servicio debe ejecutar `findMany` sin limitar los registros devueltos.

```typescript
// Siempre requerir take y skip o cursor
async findAll(companyId: string, paginationDto: PaginationDto) {
  const { page = 1, limit = 20, search } = paginationDto;
  const skip = (page - 1) * limit;
  const take = Math.min(limit, 100); // Límite de seguridad máximo de 100

  const whereClause: Prisma.ProductWhereInput = {
    companyId,
    ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
  };

  const [total, data] = await Promise.all([
    this.prisma.product.count({ where: whereClause }),
    this.prisma.product.findMany({
      where: whereClause,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    data,
    meta: {
      total,
      page,
      limit: take,
      totalPages: Math.ceil(total / take),
    },
  };
}
```

---

### 1.3 Bloqueos y Transacciones Efímeras (`$transaction`)

Las transacciones de Prisma sostienen conexiones abiertas y bloqueos de filas. 

* **REGLA**: Una transacción no debe durar más de 200-300 ms.
* **PROHIBICIÓN**: Nunca invoques servicios HTTP externos (MercadoPago, AFIP, WhatsApp API, AWS S3, Cloudinary, Mailer) dentro de un `$transaction`.

❌ **INCORRECTO:**
```typescript
await this.prisma.$transaction(async (tx) => {
  const order = await tx.order.create({ data: orderData });
  // LLAMADA EXTERNA DE RED DENTRO DE LA TX (PUEDE TARDAR 5 SEGUNDOS):
  const afipResponse = await this.afipService.createVoucher(order);
  await tx.order.update({ where: { id: order.id }, data: { cae: afipResponse.cae } });
});
```

✅ **CORRECTO:**
```typescript
// 1. Guardar en estado PENDIENTE dentro de una TX corta
const order = await this.prisma.$transaction(async (tx) => {
  return tx.order.create({ data: { ...orderData, status: 'PROCESSING' } });
});

// 2. Llamada externa FUERA de la transacción de BD
try {
  const afipResponse = await this.afipService.createVoucher(order);
  
  // 3. Actualizar resultado
  await this.prisma.order.update({
    where: { id: order.id },
    data: { cae: afipResponse.cae, status: 'APPROVED' },
  });
} catch (error) {
  await this.prisma.order.update({
    where: { id: order.id },
    data: { status: 'FAILED', errorLog: error.message },
  });
  throw error;
}
```

---

### 1.4 Uso de Índices y Filtros Compuestos

Si añades una condición de filtro recurrente en `where`, verifica que el campo cuente con índice en `schema.prisma`:
- Consultas por inquilino/empresa: siempre `companyId` o índices compuestos `@@index([companyId, status])`.
- Nunca aplicar funciones de transformación sobre columnas indexadas en el query si eso invalida el uso del índice.

---

## 2. PRESERVACIÓN E INMUTABILIDAD DE CÓDIGO EXISTENTE

### 2.1 Principio de Modificación Quirúrgica
- **Prohibido**: Reescribir archivos completos para aplicar un ajuste en una sola función o propiedad.
- **Acción requerida**: Identificar el bloque específico a modificar mediante rango de líneas y reemplazar únicamente lo necesario (`replace_file_content`).

### 2.2 Preservación de Contratos y Retrocompatibilidad
- No cambies nombres de endpoints existentes ni modifiques los parámetros de DTOs ya en producción a menos que sea una solicitud explícita de migración.
- Si un método de servicio es consumido por otros módulos, sus argumentos y tipos de retorno no deben romperse. Si se requiere una nueva firma, añade parámetros opcionales o un nuevo método especializado.

### 2.3 Reutilización antes de Creación
- Antes de crear una función de formateo de fechas, cálculo de totales, parseo de moneda o componente visual (modal, input, tabla), inspecciona el directorio `shared`, `common`, `utils` y componentes UI existentes para evitar duplicación de lógica.

---

## 3. PROTOCOLO OBLIGATORIO PARA ELIMINACIÓN DE CÓDIGO

El agente **TIENE PROHIBIDO** eliminar código existente de forma implícita o automática.

### 3.1 Cuándo se permite eliminar código
1. El usuario solicitó **explícitamente** la eliminación en su prompt (ejemplo: *"elimina la función X y borra el archivo Y"*).
2. O bien, el agente propone una refactorización que requiere remover código obsoleto y **emite un mensaje explícito previo solicitando autorización**.

### 3.2 Formato Obligatorio del Mensaje de Eliminación
Antes de ejecutar la eliminación de cualquier bloque de código no trivial, el agente debe presentar en el chat el siguiente bloque de aviso destacado:

```markdown
> ⚠️ **AVISO Y SOLICITUD DE AUTORIZACIÓN PARA ELIMINACIÓN DE CÓDIGO**
>
> - **Archivo afectado**: `ruta/al/archivo.ts`
> - **Líneas / Elemento a remover**: `líneas 120-155` (`metodoObsoleto()`)
> - **Motivo técnico**: `Sustituido por el nuevo servicio X que optimiza la carga de datos.`
> - **Impacto verificado**: `Se auditó el proyecto y no existen dependencias activas hacia este método.`
> 
> *¿Deseas que proceda con la eliminación de este código o prefieres mantenerlo marcado como @deprecated?*
```

### 3.3 Regla por Defecto: Deprecación en lugar de Supresión
Si no se cuenta con autorización expresa del usuario o la eliminación generaría riesgo de romper flujos no testeados, el agente debe mantener la función original marcada con la anotación `@deprecated`:

```typescript
/**
 * @deprecated Utilizar `newOptimizedMethod()` en su lugar.
 * Este método se mantiene por compatibilidad hacia atrás.
 */
oldMethod(): void {
  // lógica original preservada
}
```

---

## 4. ESTANDARIZACIÓN DE NUEVAS IMPLEMENTACIONES

### 4.1 Backend (NestJS 11 + TypeScript)
1. **DTOs de Entrada**:
   - Cada endpoint POST/PUT/PATCH debe recibir un DTO.
   - Usar decoradores: `@IsString()`, `@IsOptional()`, `@IsNumber()`, `@Min()`, `@IsEnum()`, etc.
   - Declarar DTOs con `@ApiProperty()` para documentación Swagger continua.
2. **Controladores Limpios**:
   - Los controladores solo inyectan el servicio, extraen el usuario/tenant de la sesión (`@Req()`, `@CurrentUser()`) y devuelven el resultado del servicio.
3. **Servicios Robustos y Tipados**:
   - Manejar transacciones con cuidado.
   - Lanzar excepciones semánticas: `new NotFoundException('Producto no encontrado')`.

### 4.2 Frontend (React 19 + Vite + Tailwind)
1. **Custom Hooks**:
   - Encapsular llamadas a endpoints con Axios y manejo de estado en hooks dedicados (ej. `useShipping.ts`, `useProducts.ts`).
2. **Diseño Visual Coherente**:
   - Utilizar componentes de `@radix-ui` y componentes existentes en `src/components/ui/`.
   - No introducir bibliotecas de UI redundantes.
3. **Manejo de Errores en UI**:
   - Presentar mensajes amigables al usuario final mediante el sistema de notificaciones/toasts existente.

---

## 5. CHECKLIST OPERATIVO PARA EL AGENTE

Antes de dar por concluida cualquier tarea:

- [ ] ¿Leí e inspeccioné el archivo antes de modificarlo para no perder lógica preexistente?
- [ ] ¿Mis consultas a la base de datos están libres de bucles N+1 y utilizan paginación/`select`?
- [ ] ¿Hay transacciones `$transaction`? Si es así, ¿se evitaron llamadas de red externas adentro?
- [ ] ¿Se eliminó código? Si la respuesta es SÍ, ¿se solicitó y obtuvo autorización explícita del usuario con el mensaje formal de aviso?
- [ ] ¿Compila TypeScript sin errores (`tsc`)?
- [ ] ¿Pasan las pruebas automáticas del proyecto?
- [ ] ¿Los commits se encuentran en la rama de integración **`testing`**?
