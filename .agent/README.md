# PROTOCOLO Y SISTEMA DE REGLAS PARA AGENTES DE IA (.agent)

Este directorio contiene las directivas operativas obligatorias, términos y condiciones de desarrollo, y skills de ejecución para cualquier Agente de Inteligencia Artificial que opere sobre el ecosistema **Nexus** (`atom-crm-api`, `atom-crm-front`, `freqar`).

---

## 📌 Estructura del Directorio

```text
.agent/
├── README.md                                  # Índice general del sistema de reglas para agentes
├── TERMINOS_Y_CONDICIONES_AGENT.md            # Términos, responsabilidades y marco contractual de operación del agente
├── REGLAS_DE_DESARROLLO_Y_ESTANDARIZACION.md   # Estándares técnicos de código, base de datos y preservación
└── skills/
    ├── safe-database-ops/                     # Skill: Prevención de saturación y sobrecarga en Base de Datos
    │   └── SKILL.md
    ├── code-preservation-and-integrity/       # Skill: Integridad de código y política de eliminación bajo autorización
    │   └── SKILL.md
    └── standardized-development/              # Skill: Estándares de desarrollo para NestJS y React
        └── SKILL.md
```

---

## ⚠️ Mandatos de Cumplimiento Innegociable

1. **Lectura Obligatoria**: Antes de proponer o aplicar cambios en el código, el agente debe interiorizar y respetar los `TERMINOS_Y_CONDICIONES_AGENT.md` y `REGLAS_DE_DESARROLLO_Y_ESTANDARIZACION.md`.
2. **Preservación de Código Existente**: Prohibido sobreescribir lógica funcional existente sin análisis de impacto. Las ediciones deben ser atómicas y quirúrgicas.
3. **Eliminación Solo Bajo Autorización**: Ningún archivo, función, endpoint o modelo puede eliminarse sin previo mensaje explícito y autorización del usuario.
4. **Protección de Base de Datos**: Cero consultas N+1, paginación obligatoria en colecciones, transacciones cortas sin llamadas HTTP externas, y uso de colas (BullMQ) para tareas pesadas.
5. **Entorno de Trabajo Git**: Los cambios deben validarse contra tests antes de ser comiteados y subidos a la rama `testing`.
6. **Caché de Conocimiento (`knowledge/`)**: Antes de cada tarea, consultar `knowledge/INDEX.md`. Todo aprendizaje nuevo (mapa de módulos, flujo de integración, convención, solución a un problema recurrente) debe registrarse en `knowledge/`, y todo procedimiento repetible como skill en `skills/<nombre>/SKILL.md`, para acelerar integraciones futuras.
