# REGLA: PRESERVACIÓN DE CÓDIGO Y POLÍTICA DE ELIMINACIÓN

1. **PROHIBICIÓN DE SOBREESCRITURAS DESTRUCTIVAS**:
   - Inspeccionar el archivo completo antes de modificarlo.
   - Preservar variables, métodos, imports y tipos preexistentes.
   - Emplear cambios localizados y quirúrgicos.

2. **CERO ELIMINACIÓN SILENCIOSA DE CÓDIGO**:
   - No eliminar ningún bloque funcional, método, endpoint o archivo sin orden explícita del usuario o mensaje formal de solicitud de autorización previa:
     ```markdown
     > ⚠️ **AVISO Y SOLICITUD DE AUTORIZACIÓN PARA ELIMINACIÓN DE CÓDIGO**
     > - Archivo afectado: `ruta/archivo.ts`
     > - Elemento: `líneas XX-YY`
     > - Motivo técnico: `Justificación`
     > - Impacto: `Evaluación de dependencias`
     > ¿Confirmas la eliminación de este código?
     ```

3. **DEPRECACIÓN ANTES DE SUPRESIÓN**:
   - Si no hay confirmación explícita para borrar, marcar como `@deprecated` manteniendo la compatibilidad hacia atrás.
