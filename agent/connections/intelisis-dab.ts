import { defineMcpClientConnection } from "eve/connections";

// Escrituras al ERP que requieren aprobación humana (HITL). Las lecturas
// (read_records, aggregate_records, describe_entities) se ejecutan sin gate.
// afectar y cambiar_situacion son tools dedicados tipados (custom-tool del DAB);
// se gatean igual porque cambian estado de movimientos en el ERP.
const WRITE_TOOL_RE = /(create|update|delete)_record|execute_entity|afectar|cambiar_situacion/;

export default defineMcpClientConnection({
  url: "https://api2.maserp.mx/icf/mcp",
  description:
    "API universal del ERP Intelisis para Industrias Campo Fresco (ICF). " +
    "Entidades disponibles:\n" +
    "- ArtDisponible (vista): Empresa, Articulo, Almacen, Disponible, Apartado, DispMenosApartado\n" +
    "- ArtDisponibleDesc (vista): Empresa, Articulo, Almacen, Disponible, Descripcion1, Descripcion2, Unidad, Tipo + 9 más\n" +
    "- Compra (tabla): cabecera de OC/recepciones — ID, Mov, MovID, FechaEmision, Proveedor, Importe, Saldo, Estatus, SubModulo, Ejercicio, Periodo + 120 más\n" +
    "- CompraD (tabla): detalle de compras — ID, Renglon, Cantidad, Almacen, Codigo, Precio + 120 más\n" +
    "- Venta (tabla): cabecera de ventas/pedidos — ID, Mov, MovID, FechaEmision, Cliente, Importe, Saldo, Estatus + 265 más\n" +
    "- VentaD (tabla): detalle de ventas — ID, Renglon, Cantidad, Almacen, Codigo, Precio + 130 más\n" +
    "- Inv (tabla): movimientos de inventario — ID, Mov, MovID, FechaEmision, Estatus + 90 más\n" +
    "- Cte (tabla): clientes maestro — Cliente, Nombre, Direccion, RFC, Estatus + 305 más\n" +
    "- Prov (tabla): proveedores maestro — Proveedor, Nombre, Direccion, RFC, Estatus + 135 más\n" +
    "- Art (tabla): artículos maestro — Articulo, Descripcion1, Descripcion2, Grupo, Categoria, Unidad, Estatus + 370 más\n" +
    "- GastoT (tabla): gastos/erogaciones — ID, Mov, MovID, FechaEmision, Importe, Estatus + 110 más\n" +
    "- buscar_registro (SP): búsqueda de texto parcial (LIKE) en cualquier entidad. Params: entidad, campo, termino, modo (CONTIENE|EMPIEZA|TERMINA), primero (max 500), ordenar.",
  // Governance (act gobernado): toda escritura pasa por un approval gate (HITL).
  // El toolName llega cualificado por la conexión (ej. "intelisis-dab__create_record").
  approval: (ctx) => WRITE_TOOL_RE.test(ctx.toolName),
  tools: {
    allow: [
      "describe_entities",
      "read_records",
      "aggregate_records",
      "create_record",
      "update_record",
      "delete_record",
      "execute_entity",
      // Tool universal de búsqueda por texto parcial (LIKE) — read-only
      "buscar_registro",
      // Tools dedicados tipados para transiciones de estatus (HITL-gateados)
      "afectar",
      "cambiar_situacion",
    ],
  },
});
