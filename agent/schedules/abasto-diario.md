---
cron: "*/25 * * * *"
---

# Reporte diario de abasto — ICF

Ejecuta con datos REALES del ERP, **usuario `CGARZA`** (el usuario con la
corrida de explosión cargada en la fuente) y el ejercicio/periodo **vigentes**
(derívalos de la fecha de hoy). NUNCA inventes cifras; si un dato no está
disponible, decláralo ("dato no disponible").

## Periodo

Usa el **vigente** (año y mes de hoy). **Única excepción**: si el periodo vigente
devuelve vacío en gasto Y en OC pendientes (periodo aún sin movimientos cargados),
repite la `read_parallel` **UNA sola vez** con el periodo **anterior** (mes − 1) y
titula el reporte con ese periodo (`último periodo con datos`). No más de esa caída.

## Plan de ejecución (EXACTO — 2 llamadas, +1 solo en el fallback)

1. `load_skill("gap-abasto")` — solo para cargar el método.
2. **UNA** llamada `read_parallel` con las **4 operaciones** siguientes:
   - `faltante_materia_prima` y `faltante_insumos` (args: `Usuario: "CGARZA"`,
     ejercicio/periodo vigentes) → tabla de decisión de compra.
   - `aggregate_records(Compra, sum Importe, groupby: ["Proveedor"],
     filter: "Ejercicio eq <año> and Periodo eq <mes> and Mov eq 'Orden Compra' and Estatus eq 'PENDIENTE'",
     orderby: "desc", first: 5)` → **OC pendientes** (pipeline).
   - `aggregate_records(Compra, sum Importe,
     filter: "Ejercicio eq <año> and Periodo eq <mes>")` → **gasto total del
     periodo** (sin groupby ni first).

**NO hagas más de estas 2 llamadas** (+1 del fallback). Si un resultado sale vacío
o con error: repórtalo en una línea y termina — **NO pruebes variantes** de
periodo/usuario, **NO repitas** una llamada con el mismo input, **NO leas
archivos** del skill ni del sandbox, **NO explores**. El resultado vacío es un
resultado válido.

## Formato del reporte
- **Título**: `Reporte diario de abasto — <fecha> · Periodo <ejercicio>/<mes>`
- **Resumen ejecutivo** (máx 3 líneas): gasto del periodo, total crítico a
  comprar, los 2-3 artículos prioritarios, y si el pipeline de OC pendientes
  cubre o agrava el faltante.
- **Tabla de decisión de compra** (Artículo | Descripción | Cantidad a comprar |
  Diagnóstico/urgencia), ordenada por cantidad descendente, separando Materia prima e
  Insumos. Si no hay faltantes, dilo explícitamente.
- **Gasto del periodo**: total y top proveedores.
- **OC pendientes del periodo**: cantidad de documentos, monto total y top proveedores.
- **Acción recomendada para hoy** (1-2 líneas): qué comprar primero y a qué proveedor
  urgir.
