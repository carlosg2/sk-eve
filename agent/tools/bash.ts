import { disableTool } from "eve/tools";

// Agente de consulta ERP (solo lectura sobre el MCP): el shell no es necesario
// y expone superficie/riesgo. Deshabilita el framework default `bash`.
export default disableTool();
