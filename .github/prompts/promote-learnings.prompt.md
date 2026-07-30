---
mode: agent
description: >
  Dispara la meta-fábrica: compila el buffer de aprendizajes en las capas de
  capacidad del stack y vacía el buffer. La lógica vive en el skill promote-learnings.
---

# /promote-learnings

Carga y ejecuta el skill **[promote-learnings](../skills/promote-learnings/SKILL.md)**
sobre el buffer `company-twin/companies/<tenant>/state/learnings.md`
(default `joyarock-300326`, salvo que el usuario indique otro tenant).

Sigue su protocolo (§4) al pie de la letra: clasificar cada aprendizaje a su capa de
capacidad, compilar al hogar canónico (OKF para Twin/Kernel), actualizar `index.md`/`log.md`,
validar con `npm run check`, y vaciar el buffer. No dupliques la lógica aquí — el skill es la
fuente única.
