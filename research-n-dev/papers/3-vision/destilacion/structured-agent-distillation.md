---
type: paper
area: mejora
fase: meta-fabrica
arxiv_id: "2505.13820"
citado_en_tesis: false
verificado: "2026-08-13"
---

# Structured Agent Distillation for Large Language Model

**Autores:** Jun Liu, Zhenglun Kong, Peiyan Dong, Changdi Yang, Tianqi Li, Hao Tang, Geng Yuan, Wei Niu, Wenbin Zhang, Pu Zhao, Xue Lin, Dong Huang, Yanzhi Wang
**arXiv:** [2505.13820](https://arxiv.org/abs/2505.13820) · PDF: https://arxiv.org/pdf/2505.13820
**AAMAS 2026.**

## Resumen

Los agentes ReAct grandes son caros de operar. La **destilación de agentes**
comprime un agente LLM grande en un modelo estudiante más pequeño preservando
fidelidad de razonamiento y consistencia de acción. A diferencia de la
destilación token-level, segmenta las trayectorias en spans **[REASON]** y
**[ACT]** y aplica pérdidas específicas por segmento para alinear cada
componente con el teacher. En ALFWorld, HotPotQA-ReAct y WebShop supera a
baselines de destilación token-level e imitation learning, logrando compresión
significativa con mínima caída de rendimiento.

## Por qué importa para Sigma — LA LAGUNA

Es el **horizonte de la meta-fábrica**: hoy compila trazas → skills (texto que
el LLM lee); el siguiente nivel es **destilar las trazas → un modelo pequeño
especializado** que ejecute el patrón sin razonar desde cero. Las implicaciones:

- Un modelo destilado por dominio (ej. "consultor CXP", "analista MRP") sería
  más barato y determinista que el LLM grande con skills — un cambio radical de
  la economía del runtime (conecta con FrugalGPT y Topaz).
- La segmentación [REASON]/[ACT] es exactamente lo que nuestra radiografía ya
  separa (reasoning vs tool calls en el espejo `events`) — los datos para
  destilar YA existen.
- La meta-fábrica (tesis) se convierte en "la que destila", no solo "la que
  escribe skills".

## Takeaways accionables

- NO intentar destilar ahora (es entrenamiento de modelos, no es el roadmap);
  pero **preservar la estructura [REASON]/[ACT] en la radiografía** (ya se hace)
  como el dataset de entrenamiento futuro.
- Cuando el volumen de trazas de un patrón madure (ej. cientos de turnos de
  gap-abasto correctos), evaluar la destilación como la evolución natural de ese
  skill — el "graduar" de un skill (tesis §8) tendría una salida más allá del
  texto.
- Leer junto con `mejora/subliminal-distillation.md` (el riesgo de seguridad
  antes de destilar).

## Enlaces

- Abs: https://arxiv.org/abs/2505.13820 · PDF: https://arxiv.org/pdf/2505.13820
