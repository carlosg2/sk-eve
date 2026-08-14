---
type: paper
area: memoria
fase: F6
arxiv_id: "2601.23014"
citado_en_tesis: false
verificado: "2026-08-13"
---

# Mem-T: Densifying Rewards for Long-Horizon Memory Agents

**Autores:** Yanwei Yue, Boci Peng, Xuanbo Fan, Jiaxin Guo, Qiankun Li, Yan Zhang
**arXiv:** [2601.23014](https://arxiv.org/abs/2601.23014) · PDF: https://arxiv.org/pdf/2601.23014

## Resumen

Los agentes de memoria (que gestionan endógenamente procesamiento, almacenamiento
y recuperación, a diferencia de pipelines fijos) sufren de recompensas escasas en
horizontes largos. Mem-T introduce **MoT-GRPO**, un framework de RL guiado por
árboles que convierte el feedback terminal escaso en supervisión densa
step-wise vía backpropagación de árboles de operaciones de memoria y crédito
hindsight. Resultado: supera a A-Mem y Mem0 hasta 14.92% y reduce tokens de
inferencia ~24.45% frente a GAM, en una frontera Pareto exactitud-eficiencia.

## Por qué importa para Sigma

- Introduce la idea de **entrenar la política de memoria** (cuándo recordar,
  cuándo consolidar, cuándo olvidar) con RL en lugar de reglas fijas. Para Sigma,
  hoy la política de consolidación es la fábrica (humana); Mem-T muestra un
  horizonte donde el runtime aprende a gestionar memoria con feedback del
  evaluador de calidad (tesis §8).
- La **densificación de recompensa** es análoga a convertir nuestra radiografía
  (métricas por turno) en señal de entrenamiento.
- La comparación explícita con A-Mem/Mem0 sitúa el estado del arte 2026.

## Takeaways accionables

- Mantener en la radiografía las métricas que permitirían algún día entrenar la
  política de memoria: cuándo la inyección episódica ayudó (menos calls/errores)
  vs cuándo estorbó (más tokens sin ganancia). La tabla `prompt_injections` ya
  registra el insumo.
- No implementar RL de memoria ahora (ADR-004: conceptos sí, implementación
  pesada no) — pero documentar qué señal necesitaría.

## Enlaces

- Abs: https://arxiv.org/abs/2601.23014 · PDF: https://arxiv.org/pdf/2601.23014
