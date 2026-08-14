---
type: paper
area: memoria
fase: F5
arxiv_id: "2606.01138"
citado_en_tesis: false
verificado: "2026-08-13"
---

# memorywire: A Vendor-Neutral Wire Format for Agent Memory Operations

**Autores:** Thamilvendhan Munirathinam
**arXiv:** [2606.01138](https://arxiv.org/abs/2606.01138) · PDF: https://arxiv.org/pdf/2606.01138

## Resumen

Propone un **formato wire vendor-neutral** (JSON-Schema 2020-12) para operaciones
de memoria de agentes: `remember, recall, forget, merge, expire` sobre cuatro
tipos de memoria (semántica, episódica, procedural, emocional). Incluye una
interfaz `MemoryStore`, un router fan-out y un **canal de gobernanza HITL
opcional** que permite a un humano revisar las escrituras antes de que entren al
almacenamiento de largo plazo. Referencia open-source con 5 adaptadores
(sqlite-vec, mem0, Letta, Cognee, pgvector). Hallazgo clave: el campo de
**provenance es el lever más fuerte para recuperar un store envenenado**
(benchmark PurgeBench).

## Por qué importa para Sigma

- El **canal de gobernanza HITL sobre escrituras de memoria** es exactamente la
  separación Fábrica/Runtime de la constitución Sigma §3: el runtime captura
  (anexa al buffer), la fábrica revisa y consolida. memorywire lo formaliza como
  primitiva de producto.
- La conclusión de que la **provenance es la llave de la recuperación ante
  envenenamiento** refuerza OKF v0.2 (`generated`/`verified`/`sources`) y el
  pilar de seguridad de la tesis §4 (ASI06 memory poisoning).
- La estandarización de operaciones (remember/recall/forget/merge/expire) es un
  vocabulario útil para el diseño del memory graph de F5 y del Pattern Engine.

## Takeaways accionables

- Considerar un **canal de aprobación humana para escrituras de memoria**
  (diff-and-approve) cuando F4 introduzca múltiples agentes escribiendo — evita
  el modo de fallo "contradiction persistence" del paper 2606.24535.
- La provenance (quién/cuándo/fuente) no es metadata decorativa: es el control
  de recuperación ante un store envenenado. Al diseñar el TKG, modelar la
  provenance como campo de primera clase (como ya hace OKF v0.2).
- ⚠️ El paper cita PurgeBench (benchmark de recuperación ante memoria envenenada)
  como compañero — localizarlo si se va a red-teamear la memoria en F2.

## Enlaces

- Abs: https://arxiv.org/abs/2606.01138 · PDF: https://arxiv.org/pdf/2606.01138
