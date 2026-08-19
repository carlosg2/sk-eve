---
name: skill-modelado
description: 'Modelar centros de trabajo. Usar para: asignar artículos a centros, configurar estaciones y capacidades, balancear la carga entre centros y validar el balanceo. Pantalla: Modelado de Centros.'
user-invocable: true
---
# Modelado de Centros

> **Antes de operar, leer `skill-nucleo`** (sesión, calendario, carga inicial, reglas). Detalle de esquemas en `references/modelado-datos.md`.
> **Implementación de consultas: `references/consultas-modelado.md`** (bases/estaciones JSON, lista de centros, balance).

> **Lectura mínima (mapa petición → sección): leer SOLO la sección indicada, NO el archivo completo.**

| Petición | Sección en `consultas-modelado.md` |
|---|---|
| Bases/estaciones por centro | §1 |
| Centros de trabajo activos | §2 |
| Balance de carga | §3 |


## Modelado de Centros
- **Vista:** tarjetas por centro con artículos; **drag & drop** para mover artículos entre centros.
- **Configuración de estación:** `Estación` · `Descripción` · `Capacidad Diaria | Kg.` · `Capacidad Mensual` · `Capacidad tn/Hora` · `Turnos` · `Horas Turno` · `Bolsas/min` · tiempos.
- **Acciones:** guardar balanceo, mover artículo.

## Cadena de alimentación (orden)
`Art`/`VacaPresupuestoVtaConD` → asignación → `ArtCentroTemp`.
`CentroFC`/`EstacionTFC` → bases → `CentroFCTemp`/`EstacionTFCTemp` → (guardar balanceo) → `ArtCentroTemp`.
- La **asignación de centros** se hace en la carga inicial (paso 3 del núcleo).

## Procedimiento
1. Cargar centros (`CentroFC`) y estaciones (`EstacionTFC`).
2. Cargar asignación actual (`ArtCentroTemp` por usuario).
3. Calcular capacidad real por centro/estación: días hábiles × horas/día × eficiencia; turnos; bolsas/min.
4. Calcular carga/ocupación actual por centro.
5. **Balancear:** proponer mover artículos de centros sobrecargados → centros con holgura.
6. Validar (ocupación ≤ 100%) y persistir en transacción.

## Reglas específicas
- Propuestas de balanceo se presentan al humano antes de aplicar.
- NO usar procedimientos del sistema — cálculo propio.
