import { listTenants, readRuntime } from "./harness";

/**
 * Loader compartido entre `/studio` (raíz) y `/studio/[...path]` (deep-link).
 * Ambas rutas necesitan exactamente los mismos datos base; el catch-all además
 * agrega el `path` crudo para que el cliente resuelva el deep-link.
 */
export async function loadStudioPageData() {
	const [tenants, runtime] = await Promise.all([listTenants(), readRuntime()]);
	return { tenants, runtime };
}
