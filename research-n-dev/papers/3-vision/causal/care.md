---
type: paper
area: razonamiento
fase: F7
arxiv_id: "2511.16016"
citado_en_tesis: false
verificado: "2026-08-13"
---

# CARE: Turning LLMs Into Causal Reasoning Expert

**Autores:** Juncheng Dong, Yiling Liu, Ahmed Aloui, Vahid Tarokh, David Carlson
**arXiv:** [2511.16016](https://arxiv.org/abs/2511.16016) · PDF: https://arxiv.org/pdf/2511.16016

## Resumen

Los LLM **no identifican relaciones causales**: en causal discovery se apoyan en
el **significado semántico de los nombres de variables** e ignoran los datos
observacionales. Hallazgo sorprendente: **promptear a los LLM con las salidas de
algoritmos de causal discovery clásicos (sus "statistics suficientes") DEGRADA su
rendimiento**. CARE resuelve esto enseñando al LLM (via SFT) a **utilizar
efectivamente las salidas de algoritmos establecidos**: un Qwen2.5-1.5B
fine-tuneado supera a algoritmos clásicos y a LLMs con más de mil veces más
parámetros.

## Por qué importa para Sigma — LA LAGUNA

La visión de la tesis §10/§11 — **"coordinación computable": cadenas causales
ventas→descuentos→margen→liquidez** — requiere modelar causa y efecto en la
operación del ERP. Este paper es la advertencia y la solución:

- **Advertencia**: el agente NO debe "inferir causalidad" de los datos por su
  cuenta — se apoya en nombres de campos y alucina relaciones (el mismo patrón
  que causó el join alucinado de VentaD/Venta en 2026-07-30).
- **Solución**: los cómputos causales deben delegarse a **algoritmos
  deterministas** (causal discovery) y el LLM debe aprender a interpretar sus
  salidas — el patrón "Attested Computation" de OKF (sp-planart.md) es
  exactamente esto: el cómputo lo hace el algoritmo, el LLM lo presenta.
- El Process Graph del TKG (F5) debería poblarse con estructura causal real
  (algoritmos), no con "intuición del LLM".

## Takeaways accionables

- Para el Process Graph: los "qué causa qué" (afectar un gasto → póliza → saldo)
  deben venir de **algoritmos de discovery o reglas verificadas**, nunca de la
  interpretación libre del LLM sobre datos crudos.
- El modelo Attested Computation de OKF ya es el mecanismo; CARE justifica por
  qué el LLM necesita ser entrenado/instruido para usar esas salidas, no solo
  prompteado.
- Si F7 (Pattern Engine cross-client) quiere "patrones causales entre clientes",
  la base debe ser datos + algoritmo, no LLM sobre nombres de variables.

## Enlaces

- Abs: https://arxiv.org/abs/2511.16016 · PDF: https://arxiv.org/pdf/2511.16016
