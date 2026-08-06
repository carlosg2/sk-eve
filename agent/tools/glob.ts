import { disableTool } from "eve/tools";

// Agente de consulta ERP (solo lectura sobre el MCP): no necesita buscar
// archivos en el workspace. Deshabilita el framework default `glob`.
export default disableTool();
