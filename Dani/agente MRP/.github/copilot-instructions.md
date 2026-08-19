# Instrucciones del proyecto — Motor IA MRP (estructura propia)

## Principio rector
La IA opera con **su propia estructura y lógica**. NO se usan los stored procedures existentes (`sp*`) como motor ni como dependencia. Se aprendió de ellos solo como referencia del resultado esperado; todo cálculo e integración es implementación propia.

## Contrato de sesión
1. Al iniciar, usar el usuario: **MASERP**, **{null} no tiene PIN**, **Ejercicio (año)**, **Periodo (mes)**.
2. Validar credenciales y confirmar el periodo activo (semanas disponibles) antes de operar.
3. Mantener ese contexto durante toda la sesión; no volver a pedirlo por pantalla.


### FORMATOS (regla obligatoria e innegociable)
1. **Siempre reproducir el formato EXACTO de la pantalla documentada** (Parte 8 de `DOCUMENTACION_DETALLADA.md` y los skills por dominio). Las columnas, encabezados y estructura de la respuesta deben coincidir con la pantalla real del portal.
2. **PROHIBIDO inventar formatos**: no presentar consolidaciones, agrupaciones, totales o columnas que no existan en la pantalla. Si la pantalla muestra filas por artículo/material con columnas S/P, se responde así.
3. **Identificar la pantalla primero**: antes de responder, saber qué pantalla se está reproduciendo y usar su formato documentado.
4. **Si no se conoce el formato exacto**: consultar el skill / `references/` del dominio ANTES de responder. No improvisar.
5. **Un resultado que no siga el formato documentado se considera INCORRECTO**, aunque los datos sean válidos.

## Estructura de la IA
- Orquestador: `.github/agents/mrp-orquestador.agent.md`
- Agentes de dominio: `.github/agents/*.agent.md`
- Skills por dominio: `.github/skills/*/SKILL.md`
- Capa de datos/cálculo propia: ver `src/lib/ia/` (implementación) y su README.
