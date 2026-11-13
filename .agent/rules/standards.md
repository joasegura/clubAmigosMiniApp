# REGLA: ESTÁNDARES TÉCNICOS Y FLUJO GIT

1. **BACKEND (NestJS / TypeScript)**:
   - DTOs obligatorios con decoradores de validación (`class-validator`).
   - Retornos fuertemente tipados, prohibición de `any`.
   - Controladores delegativos; la lógica pertenece a los servicios.
   - Excepciones semánticas (`NotFoundException`, `BadRequestException`, etc.).

2. **FRONTEND (React / Vite)**:
   - Lógica de negocio y llamadas a API encapsuladas en Custom Hooks.
   - Manejo explícito de feedback asíncrono (`isLoading`, `isError`, toasts).
   - Respeto a temas y multitenant (`nexus`, `byfesta`).

3. **CONTROL DE VERSIONES (GIT)**:
   - Todo trabajo se realiza en la rama **`testing`**.
   - No forzar pushes con `--no-verify`. Los pre-push hooks deben validar las pruebas unitarias.
