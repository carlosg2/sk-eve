import type { PageServerLoad } from "./$types";
import { loadStudioPageData } from "$lib/server/studio/page-load";

export const load: PageServerLoad = async () => {
	return loadStudioPageData();
};
