---
type: paper
area: proceso
fase: F3
arxiv_id: "2311.08795"
citado_en_tesis: false
verificado: "2026-08-13"
---

# Advancements and Challenges in Object-Centric Process Mining: A Systematic Literature Review

**Autores:** Alessandro Berti, Marco Montali, Wil M. P. van der Aalst
**arXiv:** [2311.08795](https://arxiv.org/abs/2311.08795) · PDF: https://arxiv.org/pdf/2311.08795

## Resumen

Revisión sistemática del **process mining object-centric (OCPM)**, nacido como
respuesta a las limitaciones del process mining tradicional para analizar datos
de sistemas de información como CRM y ERP. Ataca los problemas de
**deficiency, convergence y divergence** de los event logs clásicos (un evento
pertenece a múltiples objetos/casos: una factura ligada a una OC y a una compra).
Documenta el estado del arte, la trayectoria histórica y los retos de adopción
real.

## Por qué importa para Sigma

- Es la base académica del **Process Graph** del Company Twin (arquitectura §1.1,
  glosario §2): el proceso del ERP no es una secuencia lineal de un caso sino una
  red de objetos interrelacionados — el OCPM modela exactamente eso
  (eventos ligados a múltiples objetos: OC ↔ recepción ↔ factura ↔ CXP).
- Valida la tesis de mercado (context-stack §9, Celonis): el Process Graph no
  sale solo de datos crudos; necesita el contexto de negocio (reglas, KPIs) —
  el papel del Company Twin.
- La terminología (object-centric event log, variantes, divergencias) es el
  vocabulario correcto para el Process Execution Graph de
  `inteligencia-consultora.md` (§4.2) y para el análisis de procesos del cliente.

## Takeaways accionables

- Al diseñar el Process Graph de F5, adoptar el modelo OCPM (objetos y eventos
  multi-caso) en vez de logs por caso único — los documentos ERP de Intelisis
  (Compra/CompraD, Venta/VentaD) son naturalmente object-centric.
- El Pattern Engine (F7) puede usar las **variantes y divergencias** del OCPM
  como features de los patrones entre clientes.
- La SLR (37 resultados en arXiv bajo "object-centric process mining") es el
  punto de partida para profundizar si se construye la capa de proceso.

## Enlaces

- Abs: https://arxiv.org/abs/2311.08795 · PDF: https://arxiv.org/pdf/2311.08795
