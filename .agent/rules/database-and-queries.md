# REGLA: EJECUCIÓN SEGURA DE CONSULTAS A BASE DE DATOS (QUERIES)

> Toda interacción con la base de datos (Prisma ORM o SQL directo) debe someterse a las siguientes restricciones:

1. **PROHIBICIÓN N+1**:
   - Nunca ejecutar consultas de lectura o escritura dentro de bucles (`for`, `forEach`, `map`).
   - Usar agregaciones, joins o consultas con operador `in: [ids]`.

2. **PAGINACIÓN OBLIGATORIA**:
   - Todo `findMany` en servicios o controladores DEBE requerir `take` y `skip`.
   - Límite máximo admitido: 100 registros por query.

3. **MINIMIZACIÓN DE DATOS**:
   - Favorecer `select` con campos estrictamente requeridos antes que `include` masivos.

4. **TRANSACCIONES ULTRA CORTAS**:
   - `prisma.$transaction` no debe superar los 300ms de ejecución.
   - Prohibido invocar servicios externos de red (AFIP, MercadoPago, emails, almacenamiento S3/Cloudinary) dentro de la transacción.

5. **DELEGACIÓN A COLAS (BullMQ)**:
   - Procesamiento batch o de larga duración debe ser encolado como job de fondo.
