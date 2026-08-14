---
type: paper
area: aprendizaje
fase: meta-fabrica
arxiv_id: "2303.11366"
citado_en_tesis: false
verificado: "2026-08-13"
---

# Reflexion: Language Agents with Verbal Reinforcement Learning

**Autores:** Noah Shinn, Federico Cassano, Edward Berman, Ashwin Gopinath, Karthik Narasimhan, Shunyu Yao
**arXiv:** [2303.11366](https://arxiv.org/abs/2303.11366) · PDF: https://arxiv.org/pdf/2303.11366
**NeurIPS 2023.**

## Resumen

Refuerza agentes **sin actualizar pesos**: mediante **feedback lingüístico
(verbal RL)**, el agente reflexiona verbalmente sobre las señales de feedback de
la tarea y mantiene **texto reflexivo en un buffer de memoria episódica** para
mejorar decisiones en intentos posteriores. Alcanza 91% pass@1 en HumanEval
(superando el 80% de GPT-4). Flexible a tipos de feedback (escalares o
lenguaje libre) y fuentes (externas o simuladas).

## Por qué importa para Sigma

- Es el **modelo científico del ciclo de self-improvement de la tesis**: el
  buffer `state/learnings.md` + hook `memory.ts` ES un buffer de reflexión
  episódica, y la promoción de la fábrica convierte esas reflexiones en
  conocimiento reutilizable (skills/twin) — exactamente el loop
  feedback → reflexión → mejora de Reflexion, con la separación de poderes de la
  constitución.
- Valida la decisión de inyectar el buffer de learnings en el prompt de la
  próxima sesión (agent/instructions/memory.ts): la memoria de reflexiones
  mejora el siguiente intento sin fine-tuning.
- La flexibilidad de señales (errores de tool, warnings del inspector, métricas
  de radiografía) es lo que nuestra meta-fábrica ya consume.

## Takeaways accionables

- Formalizar el buffer de learnings como "reflexiones episódicas" y medir su
  impacto como hace Reflexion (baseline vs con-reflexión): el protocolo de
  pruebas ya tiene antes/después.
- El evaluador de calidad (eval-calidad) es la "señal de feedback" que debería
  disparar la reflexión: un invariante fallido genera el learning que se
  promueve (esto ya está descrito en protocolo-pruebas §6 — el puente con
  promote-learnings).
- La reflexión "verbal" (no pesos) es la razón de por qué NO apostar a memoria
  en pesos del modelo (tesis §11, anti-roadmap).

## Enlaces

- Abs: https://arxiv.org/abs/2303.11366 · PDF: https://arxiv.org/pdf/2303.11366
