# CACHÉ DE CONOCIMIENTO DEL PROYECTO (knowledge/)

> Registro vivo de lo que el agente aprende al trabajar en este proyecto: mapas de módulos, flujos de integración, convenciones no escritas y soluciones a problemas recurrentes.
> **Objetivo**: no re-investigar lo ya descubierto y acelerar integraciones repetitivas.

---

## 📌 Cómo usar este directorio

1. **Antes de cada tarea**: leer este índice y abrir las notas relevantes.
2. **Al terminar una tarea donde se aprendió algo nuevo**: crear o actualizar una nota y registrarla en la tabla de abajo.
3. **Si el aprendizaje es un procedimiento repetible** (ej. "agregar un nuevo proveedor de pagos", "crear un módulo CRUD"), crear una skill en `../skills/<nombre>/SKILL.md` con frontmatter `name` + `description`, en lugar de una nota.
4. **Alcance**:
   - Conocimiento propio de un subproyecto → solo en el `.agent/` de ese subproyecto.
   - Conocimiento transversal (contratos API ↔ Front, multitenant, despliegue) → en el `.agent/` raíz **y** en cada subproyecto afectado.
5. **Mantenimiento**: si una nota queda desactualizada, corregirla (no duplicar). Nunca borrar notas sin autorización del usuario: marcarlas como `> ⚠️ OBSOLETO` con el motivo.

### Formato de cada nota (`knowledge/<tema>.md`)

```markdown
# <Tema>
- **Última verificación**: AAAA-MM-DD
- **Archivos clave**: `ruta/archivo.ts:línea`
## Qué es / cómo funciona
## Pasos para repetirlo (si aplica)
## Trampas conocidas
```

---

## 🗂️ Índice de notas

| Nota | Tipo | Resumen | Última verificación |
|------|------|---------|---------------------|
| [club-amigos-miniapp](club-amigos-miniapp.md) | Transversal | Integración miniapp Club Amigos ↔ Nexus: mapeo, activación en producción, alcance | 2026-11-13 |
| [../skills/public-miniapp-integration](../skills/public-miniapp-integration/SKILL.md) | **Skill** | Conectar cualquier app de clientes finales a Nexus sin exponer secretos | 2026-11-13 |
