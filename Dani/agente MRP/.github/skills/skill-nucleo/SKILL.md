---
name: skill-nucleo
description: 'Núcleo común del Motor IA MRP. Usar SIEMPRE antes de cualquier dominio: sesión (usuario/ejercicio/periodo, sin PIN), calendario, conexión a la base, tablas compartidas, carga inicial única al arranque y reglas globales. Los demás skills referencian este núcleo en lugar de duplicarlo.'
user-invocable: true
---

# Núcleo común (Motor IA MRP)

Lo común a **todos** los dominios. Los skills de dominio **referencian este núcleo** en lugar de repetirlo.

## 1. Contrato de sesión (SIN PIN)
- **Al inicio de cada chat nuevo** el orquestador presenta el cuestionario de sesión (formato fijo):
  ```
  Usuario  : [__________]  -> obligatorio, en MAYÚSCULAS
  Ejercicio: [ 2026 ]      -> lista: 2026 · 2025 · 2024 · 2023 (por omisión 2026)
  Periodo  : [ 8 ]         -> lista: 1..12 (por omisión 8)
  Sin PIN (el PIN se maneja por terminal, nunca por la conversación)
  ```
- **Carga inicial ÚNICA al arranque** (al confirmar la sesión): validar usuario, calendario y presupuesto CONCLUIDO, y **guardar en el estado** `Sesion`. Las peticiones posteriores leen ese estado **sin re-validar** (cache de sesión); solo se recarga si cambia ejercicio/periodo.
- **Estructura propia de sesión:**
  ```ts
  interface Sesion {
    usuario: string;                    // ej. 'MASERP' (mayúsculas)
    periodo: { ejercicio: number; periodo: number; primerSemana: number;
               semanas: Semana[]; numSemanas: number; nombreMes: string };
    presupuesto: { id: number; version: number; estatus: 'CONCLUIDO' };
    modo: 'plan' | 'historico';
  }
  ```
- **Lectura condicional:** sesión ya validada + petición de SOLO lectura -> el agente de dominio **NO re-lee este núcleo** (la sesión está en contexto). Releer núcleo SOLO para: iniciar sesión, generar/escribir, o necesitar fechas/calendario.

## 2. Conexión a la base (solo lectura)
- `sqlcmd -S DROLDANS -d Intelisis5000 -E -C` (o MCP `mssqlmcp/*` si está disponible) — **solo lectura**, implementación propia.
- NUNCA ejecutar `sp*`/`fn*` como motor; solo como referencia del resultado esperado.

## 3. Tablas compartidas
| Tabla | Columnas | Uso |
|---|---|---|
| `Art` | `Articulo, Descripcion1, FamArtCF, GramajeFC, Factorstock, SeProduce, Grupo, CentroDef` | Catálogo |
| `ArtFamFC` | `Familia, TiempoEntrega, StockMinimo, StockMaximo` | Familias |
| `DIM_TIEMPO_SEMANA` | `AÑO, MES, SEMANA, FECHAINICIO, FECHAFIN` | Semanas del periodo |
| `VacaPresupuestoVtaCon` | `ID, Ejercicio, Version, Estatus` | Presupuesto maestro (CONCLUIDO) |
| `VacaPresupuestoVtaConD` | `ID, Articulo, Concepto, Cliente, Programa, S1..S54` | Presupuesto detalle |
| `ResumenPlaneacionCF` | `Articulo, CtTrabajo, S1..S54, Producir, Kg, FamiliaCF, Venta, TotalInv` | Planeación (forecast/programa/materiales/analisis) |
| `Usuario` | `Usuario, Nombre, DefEmpresa` | Login |

## 4. Calendario del periodo
```sql
SELECT AÑO, MES, SEMANA, FECHAINICIO, FECHAFIN FROM DIM_TIEMPO_SEMANA
WHERE AÑO = @ejercicio AND MES = @periodo ORDER BY SEMANA
```
-> `PrimerSemana = MIN(SEMANA)`, `NumeroSemanas = COUNT(*)`, `NombreMes`.

## 5. Carga inicial del periodo (única, con check de idempotencia)
1. **Validar insumos:** presupuesto CONCLUIDO (`VacaPresupuestoVtaCon`), calendario y centros.
2. **¿Ya cargado?** ¿Existe `ResumenPlaneacionCF`/`ArtCentroTemp` para usuario/periodo?
3. **¿Cambió el presupuesto?** Comparar `Version`/`FechaUltimaModificacion` vs última carga registrada (auditoría).
4. **Decidir:** existe y no cambió -> NO regenerar; no existe o cambió -> regenerar solo lo afectado.

Pasos (si se genera): calendario 12S -> bases por defecto de centros -> artículos->centro default -> balanceo -> forecast 54S (`ResumenPlaneacionCF`) -> forecast 12S (familias/artículos) -> arribos Vaca. Garantías: idempotente · transacción con rollback · auditable.

## 6. Reglas globales
- NO usar `sp*`/`fn*` (solo referencia). Consultas propias.
- Escritura en transacción con rollback. **Situaciones/autorizaciones: la IA propone, el humano confirma.**
- Respuestas en **tablas limpias** con formato GFM (cabecero + `|---|---|`, misma cantidad de `|`).
- Resultado > 20 filas: entregar totales y ofrecer filtro antes de volcar.
- Regla FORMATOS: reproducir el formato EXACTO de la pantalla (definido en cada skill); prohibido inventar columnas.
