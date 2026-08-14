---
type: paper
area: delegacion
fase: F6
arxiv_id: "2602.11865"
citado_en_tesis: false
verificado: "2026-08-13"
---

# Intelligent AI Delegation

**Autores:** Nenad Tomašev, Matija Franklin, Simon Osindero (Google DeepMind)
**arXiv:** [2602.11865](https://arxiv.org/abs/2602.11865) · PDF: https://arxiv.org/pdf/2602.11865

## Resumen

Para metas ambiciosas, los agentes deben **descomponer problemas y delegar
sub-componentes a otros agentes y a humanos**, adaptándose a cambios y a fallos
inesperados. Propone un framework adaptativo de delegación: una secuencia de
decisiones de asignación de tareas que incorpora **transferencia de autoridad,
responsabilidad y accountability**, especificaciones claras de roles y límites,
claridad de intención, y mecanismos para establecer **confianza** entre las
partes. Aplica tanto a delegadores humanos como IA en redes de delegación
complejas — dirigido al "agentic web" emergente.

## Por qué importa para Sigma — LA LAGUNA

El Agent Inbox, la escalada a humanos y el ladder de autonomía L0-L4 de la tesis
(F6, §9) asumen la delegación **sin una teoría de cuándo y cómo delegar**. Este
paper es esa teoría:

- La **transferencia de autoridad con accountability** es exactamente lo que
  falta formalizar entre los agentes pares con contrato de §3.2 (Task/Message/
  Artifact): delegar no es solo pasar una tarea, es transferir autoridad con
  responsabilidad rastreable.
- El "cuándo delegar a humano" (escalar en el ladder) pasa de regla ad-hoc a
  decisión de diseño con mecanismos de trust explícitos.
- Conecta con el **DRI humano por agente** (§7): la delegación necesita saber a
  quién rinde cuentas cada delegado.

## Takeaways accionables

- Diseñar la misión spec (P-1) con los componentes de delegación de este paper:
  asignación, autoridad, límites, intención, trust — no solo steps.
- El escalamiento HITL (subir de L1 a L3) debe incluir la **transferencia de
  accountability**: quién responde si el agente actuó mal dentro de su
  autorización (conecta con `delegacion/authenticated-delegation.md`).
- Para F4: al definir contratos entre agentes, modelar la delegación como
  autoridad transferida con límites, no como "llamada a otro agente".

## Enlaces

- Abs: https://arxiv.org/abs/2602.11865 · PDF: https://arxiv.org/pdf/2602.11865
