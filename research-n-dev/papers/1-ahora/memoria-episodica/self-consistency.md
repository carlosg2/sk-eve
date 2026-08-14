---
type: paper
area: gobierno
fase: meta-fabrica
arxiv_id: "2203.11171"
citado_en_tesis: false
verificado: "2026-08-13"
---

# Self-Consistency Improves Chain of Thought Reasoning in Language Models

**Autores:** Xuezhi Wang, Jason Wei, Dale Schuurmans, Quoc Le, Ed Chi, Sharan Narang, Aakanksha Chowdhery, Denny Zhou (Google)
**arXiv:** [2203.11171](https://arxiv.org/abs/2203.11171) · PDF: https://arxiv.org/pdf/2203.11171
**ICLR 2023.**

## Resumen

En lugar del greedy decoding del chain-of-thought, **self-consistency** muestrea
un conjunto diverso de rutas de razonamiento y **elige la respuesta más
consistente por marginalización** sobre las rutas muestreadas. La intuición: un
problema complejo admite múltiples formas de pensar que llevan a la misma
respuesta correcta. Mejoras notables: GSM8K +17.9%, SVAMP +11.0%, AQuA +12.2%,
StrategyQA +6.4%, ARC-challenge +3.9%.

## Por qué importa para Sigma — LA LAGUNA

El evaluador de calidad mide **congruencia** (¿varias corridas del mismo caso dan
el mismo valor?) — pero no lo fundamenta. Self-consistency es el fundamento
teórico de esa métrica:

- La "congruencia real" del evaluador (fingerprint de valores extraídos por
  corrida) es self-consistency aplicado a la salida final; este paper explica
  por qué funciona y cómo elegir (marginalización/voto, no promedio de strings).
- Para el agente operativo: cuando la respuesta es crítica (recomendación de
  compra, monto a pagar), muestrear 2-3 rutas y elegir la consistente es una
  verificación barata de exactitud — alternativa al modelo caro.
- Conecta con reward hacking: si el modelo no es self-consistente en un dato,
  la respuesta es menos confiable → señal para escalar a humano (delegación
  cognitiva).

## Takeaways accionables

- El evaluador de calidad debería reportar **self-consistency por invariante**
  (proporción de corridas que coinciden en el valor) — ya es la "congruencia",
  pero anclarla al marco de self-consistency le da el criterio de cuántas
  corridas bastan.
- Para escrituras gateadas de alto valor, un paso opcional de **muestreo de
  verificación** (2 respuestas, si difieren → HITL) es barato y robusto.
- El costo extra de muestrear debe balancearse con FrugalGPT: self-consistency
  con modelo barato puede superar a greedy con modelo caro.

## Enlaces

- Abs: https://arxiv.org/abs/2203.11171 · PDF: https://arxiv.org/pdf/2203.11171
