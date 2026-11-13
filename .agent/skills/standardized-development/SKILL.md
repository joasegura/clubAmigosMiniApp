---
name: standardized-development
description: Normas de estandarización técnica para nuevas implementaciones en NestJS (API) y React (Frontend) en el ecosistema Nexus, incluyendo validaciones, tipado, manejo de errores y ciclo Git en rama testing.
---

# Skill: Standardized Development

Esta skill unifica los estándares de diseño y desarrollo en el stack tecnológico de Nexus.

## Directivas Backend (NestJS / TypeScript)
- DTOs con validadores estrictos (`class-validator`) para todo payload entrante.
- Documentación Swagger continua con `@ApiProperty()`.
- Controladores delegativos: sin lógica de negocio interna.
- Servicios fuertemente tipados: prohibición de `any`.
- Respuestas HTTP con excepciones estándar (`BadRequestException`, `NotFoundException`, etc.).

## Directivas Frontend (React / Vite / TypeScript / Tailwind)
- Encapsulación de lógica y llamadas a API en Custom Hooks (`use...ts`).
- Componentes desacoplados y enfocados en la UI.
- Feedback visual consistente ante estados asíncronos (`isLoading`, `isError`, notificaciones toast).
- Respeto a perfiles y tematización multitenant (`nexus`, `byfesta`).

## Ciclo de Integración Git
- Todo trabajo se realiza e integra sobre la rama **`testing`**.
- Respetar y validar los pre-push hooks que ejecutan tests automáticos (`vitest` / `jest`).
- No aplicar `--no-verify` bajo ninguna circunstancia.
