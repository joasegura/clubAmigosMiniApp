---
name: code-preservation-and-integrity
description: Garantiza la inmutabilidad y preservación del código existente, previniendo sobreescrituras destructivas y regulando la eliminación de código exclusivamente bajo autorización explícita del usuario.
---

# Skill: Code Preservation and Integrity

Esta skill instruye al agente sobre cómo proteger el código preexistente y gestionar solicitudes de eliminación o sustitución de código.

## Principios Fundamentales

1. **Lectura Completa Previa**:
   - Antes de modificar un archivo, inspecciona su estructura completa para no omitir importaciones, tipos o comentarios preexistentes.

2. **Edición Quirúrgica**:
   - Utiliza herramientas de reemplazo localizado (`replace_file_content`).
   - Nunca reescribas un archivo completo para cambiar solo una porción de código.

3. **Política Estricta de Eliminación de Código**:
   - Queda prohibido eliminar código silenciosamente.
   - Si se requiere eliminar una función, clase, endpoint o archivo que no fue explícitamente ordenado por el usuario, el agente debe emitir el mensaje formal de autorización:

```markdown
> ⚠️ **AVISO Y SOLICITUD DE AUTORIZACIÓN PARA ELIMINACIÓN DE CÓDIGO**
>
> - **Archivo afectado**: `ruta/archivo.ts`
> - **Líneas / Elemento**: `líneas XX-YY` (`nombreElemento`)
> - **Motivo**: `Razón técnica del reemplazo o refactorización.`
> - **Impacto**: `Evaluación de dependencias en el proyecto.`
> 
> *¿Confirmas la eliminación de este código?*
```

4. **Deprecación por Defecto**:
   - Si no se cuenta con autorización explícita para borrar, utiliza `@deprecated` y preserva la firma original.
