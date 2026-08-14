---
type: paper
area: memoria
fase: F5
arxiv_id: "2602.05665"
citado_en_tesis: true
verificado: "2026-08-13"
nota_fabrica: "La tesis cita este ID como 'BEAM (ICLR 2026)'; en realidad es el survey de graph-based agent memory. Ver README §Correcciones."
---

# Graph-based Agent Memory: Taxonomy, Techniques, and Applications

**Autores:** Chang Yang, Chuang Zhou, Yilin Xiao, Su Dong, Luyao Zhuang, Yujing Zhang, Zhu Wang, Zijin Hong, Zheng Yuan, et al.
**arXiv:** [2602.05665](https://arxiv.org/abs/2602.05665) · PDF: https://arxiv.org/pdf/2602.05665

## Resumen

Survey exhaustivo de **memoria de agentes desde la perspectiva de grafos**.
Propone una taxonomía de memoria de agentes: corto vs largo plazo, conocimiento
vs experiencia, no-estructural vs estructural (grafo). Organiza el análisis por el
**ciclo de vida de la memoria**: extracción (transformar datos en contenido),
almacenamiento (organizar), recuperación (soportar razonamiento) y **evolución**
(actualizar contenido — consolidación, supersession, eviction). Compila librerías
open-source, benchmarks y aplicaciones. Repositorio asociado:
github.com/DEEP-PolyU/Awesome-GraphMemory.

## Por qué importa para Sigma

- Es el mapa completo de la capa de datos que la tesis §3.4 describe (Event
  Ledger → semántica → Process Graph): la taxonomía "extracción/almacenamiento/
  recuperación/evolución" es el vocabulario para diseñar el memory graph de F5.
- La fase de **evolución** cubre la consolidación episódica→semántica (nuestra
  fábrica) y la supersession (ADR-010) — las dos operaciones que la tesis marca
  como de mayor valor.
- La distinción **conocimiento vs experiencia** mapea a: declarativo del Twin
  (conocimiento) vs episodios del espejo/learnings (experiencia).

## Takeaways accionables

- Usar la taxonomía como **checklist de diseño** al escribir el plan de F5: no
  diseñar solo recuperación; diseñar también evolución (quién consolida, cuándo
  evicta, cómo supersede).
- El repositorio Awesome-GraphMemory es la curaduría de papers/librerías para no
  reinventar.
- ⚠️ Corrección de fábrica: en la tesis §0/§8 este ID aparece como el benchmark
  "BEAM (ICLR 2026)". Verificado 2026-08-13: el ID es este survey, no BEAM.
  Para evals de memoria del dominio usar LongMemEval/LoCoMo (fichas en
  `benchmarks/`).

## Enlaces

- Abs: https://arxiv.org/abs/2602.05665 · PDF: https://arxiv.org/pdf/2602.05665
- Repo: https://github.com/DEEP-PolyU/Awesome-GraphMemory
