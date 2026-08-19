---
name: skill-sesion
description: 'Iniciar sesión y configurar el periodo. Usar para: validar usuario (mayúsculas), configurar ejercicio y periodo (por omisión 2026/8, sin PIN), y listar las semanas disponibles del periodo activo antes de operar.'
user-invocable: true
---

# Sesión

> **Antes de operar, leer `skill-nucleo`** (contrato de sesión, calendario, carga inicial, reglas). Este skill aporta lo específico de sesión.

## Qué hacer (al inicio de cada chat)
1. Presentar el **cuestionario de sesión** (formato fijo del núcleo): usuario en MAYÚSCULAS (obligatorio), ejercicio 2026 (lista 2026·2025·2024·2023), periodo 8 (lista 1..12). **Sin PIN.**
2. Validar usuario: `SELECT Usuario, Nombre, DefEmpresa FROM Usuario WHERE Usuario = @usuario`.
3. Leer calendario del periodo (`DIM_TIEMPO_SEMANA`): semanas, primerSemana, nombreMes.
4. Validar presupuesto CONCLUIDO del ejercicio (`VacaPresupuestoVtaCon`).
5. **Carga inicial única** del periodo (núcleo §5) y **persistir `Sesion`** (cache).
6. Confirmar la sesión; no volver a pedirla por pantalla en la misma conversación.

## Formato de salida
```
Usuario: <usuario> · Periodo: <ejercicio>-<periodo> (<nombreMes>)
Semanas: [<primerSemana>..<ultimaSemana>] · Núm.: <n>
Sesión lista. ¿Qué módulo ejecuto (forecast, modelado, programa, materiales, arribos, análisis)?
```

## Reglas
- PIN nunca por la conversación (por terminal). Sesión sin PIN con usuario hardcodeado si se confirma (ej. `MASERP`).
- No operar sin periodo confirmado (presupuesto + semanas).
- Cache de sesión: se recarga solo si cambia ejercicio/periodo.
