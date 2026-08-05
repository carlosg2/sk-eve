// Tooltip.Provider (bits-ui) llama setContext fuera de componente en SSR → 500.
// El chat es puramente dinámico; no hay beneficio de SSR aquí.
export const ssr = false;
