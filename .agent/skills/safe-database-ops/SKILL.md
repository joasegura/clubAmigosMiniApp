---
name: safe-database-ops
description: Directrices obligatorias para interactuar con la base de datos (Prisma ORM), evitando sobrecargas, bloqueos, problemas N+1 y saturación del pool de conexiones.
---

# Skill: Safe Database Operations (Prisma ORM)

Esta skill define el comportamiento obligatorio para cualquier agente que diseñe o modifique consultas de base de datos en el backend de Nexus.

## Directivas Principales

1. **Erradicación de N+1 Queries**:
   - Nunca iterar colecciones y hacer `await this.prisma...` dentro de un bucle.
   - Usar `include` controlado o `where: { id: { in: ids } }`.

2. **Límites y Paginación**:
   - Todo `findMany` debe llevar `take` y `skip` o paginación por cursor.
   - Establecer siempre un límite superior de seguridad (máximo 100 registros por página).

3. **Optimización con `select`**:
   - Solo pedir las columnas necesarias en lugar de traer modelos completos con relaciones anidadas innecesarias.

4. **Transacciones Atómicas y Rápidas (`$transaction`)**:
   - La transacción solo debe contener operaciones de base de datos.
   - Cero llamadas a APIs externas (AFIP, MercadoPago, S3, nodemailer, etc.) dentro del bloque transaccional.

5. **Delegación a Colas en Background**:
   - Operaciones pesadas, reportes masivos o sincronizaciones periódicas deben encolarse mediante **BullMQ**.
