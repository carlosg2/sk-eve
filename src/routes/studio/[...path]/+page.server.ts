import type { PageServerLoad } from "./$types";
import { loadStudioPageData } from "$lib/server/studio/page-load";

export const load: PageServerLoad = async ({ params }) => {
	const data = await loadStudioPageData();
	return { ...data, deepLinkPath: params.path };
};
