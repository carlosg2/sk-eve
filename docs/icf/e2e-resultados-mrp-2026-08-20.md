# Resultados E2E del módulo MRP — 75 preguntas del catálogo del agente (2026-08-20)

> Generado por la meta-fábrica. Estado REAL verificado contra el espejo durable (no el status derivado). Fecha: 2026-08-20.

Campaña E2E completa del módulo MRP del agente: 75 preguntas (5 por cada una de las 15 skills del catálogo MRP), ejecutadas contra el MCP ICF real con DeepSeek v4 Flash. Cada turno corre en sesión fresca y su estado real se verifica contra el espejo durable (no el status derivado). Los errores se desglosan en 3 categorías: **errT** = errores reales de tools (action.result con EntityNotFound/BadRequest/ExecutionError del DAB), **errS** = errores de skill (load_skill fallido, skill inexistente), **errF** = turno entero fallido (turn.failed). Las 3 preguntas que dieron timeout en su primer intento se reintentaron y se reporta el resultado del reintento.

<a id="tabla"></a>
| # | Pregunta (abreviada) | Estado real · duración | steps | calls | tokIn | errT | errS | errF |
|---|---|---|---|---|---|---|---|---|
| <a id="fila-1"></a>[1](#pregunta-1) | Valida la sesión del módulo MRP para el usuario MASERP, e…<br>`wrun_01M0ET2BAS9TKGMRSD8Q3XQTJH` | completed · 21 s | 3 | 4 | 67315 | 0 | 0 | 0 |
| <a id="fila-2"></a>[2](#pregunta-2) | ¿Cuál es el calendario de semanas del periodo 8 de 2026 (…<br>`wrun_01M0ET335HQ17DQN42XAT91955` | completed · 10 s | 3 | 2 | 67874 | 0 | 0 | 0 |
| <a id="fila-3"></a>[3](#pregunta-3) | ¿Qué usuario corre el proceso de planeación en ICF y está…<br>`wrun_01M0ET3F842GC38F72EEEQK0RJ` | completed · 14 s | 5 | 6 | 119245 | 0 | 0 | 0 |
| <a id="fila-4"></a>[4](#pregunta-4) | ¿Cuál es la primera semana y el nombre del mes del period…<br>`wrun_01M0ET41BZY3WDXB781JJY53G2` | completed · 3 min | 7 | 8 | 200668 | 0 | 0 | 0 |
| <a id="fila-5"></a>[5](#pregunta-5) | Valida la sesión de planeación y dime qué ejercicio/perio…<br>`wrun_01M0ET9TVFQ4VAA94PXDBE14XS` | completed · 25 s | 5 | 7 | 116028 | 1 | 0 | 0 |
| <a id="fila-6"></a>[6](#pregunta-6) | Desglose del forecast del periodo activo: ventana de 5 se…<br>`wrun_01M0ETASJ2DJHWQSD9F2P5847Z` | completed · 41 s | 5 | 13 | 126444 | 0 | 0 | 0 |
| <a id="fila-7"></a>[7](#pregunta-7) | ¿Cuál es el desglose del forecast S1-S12 del artículo A2502?<br>`wrun_01M0ETC5GWWP3R0N1WTW39VHMM` | completed · 16 s | 4 | 3 | 94858 | 0 | 0 | 0 |
| <a id="fila-8"></a>[8](#pregunta-8) | Dame el inventario semanal de 13 columnas de la familia F…<br>`wrun_01M0ETCQJ5HF2A0DVJB01NN7JS` | completed · 2 min | 9 | 12 | 301837 | 0 | 0 | 0 |
| <a id="fila-9"></a>[9](#pregunta-9) | ¿Cuál es el forecast de venta a 12 semanas agrupado por f…<br>`wrun_01M0ETG2Y9Y6C762RSGEZETGK1` | completed · 57 s | 7 | 6 | 178209 | 0 | 0 | 0 |
| <a id="fila-10"></a>[10](#pregunta-10) | ¿Qué artículo tiene el mayor programa en la semana 1 del …<br>`wrun_01M0EZTQ83AAJVC7D74YN6FDGX` | completed · 14 s | 3 | 2 | 72095 | 0 | 0 | 0 |
| <a id="fila-11"></a>[11](#pregunta-11) | Concentrado de familias del periodo: piezas y kilos a pro…<br>`wrun_01M0ETYS7M988R4RJ61TXGWTM2` | completed · 25 s | 5 | 5 | 116498 | 0 | 0 | 0 |
| <a id="fila-12"></a>[12](#pregunta-12) | ¿Qué familia concentra más piezas en el plan de producció…<br>`wrun_01M0ETZQDH6Q6Z0QX08CJ7QJ1E` | completed · 23 s | 5 | 5 | 120907 | 0 | 0 | 0 |
| <a id="fila-13"></a>[13](#pregunta-13) | Concentrado de producción por familia del mes en curso.<br>`wrun_01M0EV0FXDNHZB6CDP9VS23WN4` | completed · 45 s | 5 | 5 | 122426 | 0 | 0 | 0 |
| <a id="fila-14"></a>[14](#pregunta-14) | ¿Cuántas piezas y kilos hay que producir por familia este…<br>`wrun_01M0EV241535V2T78TG5JW46MY` | completed · 11 s | 3 | 3 | 67077 | 0 | 0 | 0 |
| <a id="fila-15"></a>[15](#pregunta-15) | Dame el concentrado de la familia Frijol Negro del plan d…<br>`wrun_01M0EV2G2PJB9NAN3Q57ARAE0S` | completed · 14 s | 3 | 2 | 67689 | 0 | 0 | 0 |
| <a id="fila-16"></a>[16](#pregunta-16) | ¿Cuál es el programa mensual de producción y la ocupación…<br>`wrun_01M0EV321VGR9P4DVZBM6XSGEN` | completed · 14 s | 3 | 2 | 68774 | 0 | 0 | 0 |
| <a id="fila-17"></a>[17](#pregunta-17) | ¿Cuál es la ocupación de los centros de trabajo esta semana?<br>`wrun_01M0EV3MAY08XNX0CE3B45AXVH` | completed · 28 s | 3 | 2 | 70445 | 0 | 0 | 0 |
| <a id="fila-18"></a>[18](#pregunta-18) | ¿Qué se va a producir esta semana según el plan de produc…<br>`wrun_01M0EV4KGBCWE57E59TETQQ4DJ` | completed · 24 s | 5 | 6 | 124268 | 0 | 0 | 0 |
| <a id="fila-19"></a>[19](#pregunta-19) | ¿Cuál es el programa semanal por centro y su capacidad oc…<br>`wrun_01M0EZV9E3YWKR6W5GXDKV4CMB` | completed · 3 min | 14 | 23 | 451391 | 4 | 0 | 0 |
| <a id="fila-20"></a>[20](#pregunta-20) | Dame el programa de producción por centro de trabajo del …<br>`wrun_01M0EVJ7A1JN4STM2J1X66NB6X` | completed · 2 min | 14 | 19 | 389020 | 2 | 0 | 0 |
| <a id="fila-21"></a>[21](#pregunta-21) | Validación de insumos del plan de producción: ¿qué materi…<br>`wrun_01M0EVNN700EN0QX7NNCJ490RD` | completed · 2 min | 10 | 20 | 318449 | 1 | 0 | 0 |
| <a id="fila-22"></a>[22](#pregunta-22) | ¿Qué materia prima falta para cubrir el plan de producció…<br>`wrun_01M0EVSTBKTTPE04DRK11S4RYJ` | completed · 44 s | 8 | 9 | 227295 | 1 | 0 | 0 |
| <a id="fila-23"></a>[23](#pregunta-23) | Validación de insumos de MASERP para el periodo 8: por ca…<br>`wrun_01M0EVVDBCVV0Y8MAGAAM8B7A8` | completed · 3 min | 13 | 15 | 542792 | 3 | 0 | 0 |
| <a id="fila-24"></a>[24](#pregunta-24) | ¿Qué materiales tienen cobertura insuficiente para producir?<br>`wrun_01M0EW0PPNVW6B0VF932M94MF5` | completed · 55 s | 7 | 7 | 184204 | 1 | 0 | 0 |
| <a id="fila-25"></a>[25](#pregunta-25) | Explosión de materiales del plan: ¿qué insumos de empaque…<br>`wrun_01M0EW2H9CR999A1KWS7QBMBTC` | completed · 4 min | 17 | 27 | 750791 | 2 | 0 | 0 |
| <a id="fila-26"></a>[26](#pregunta-26) | ¿Qué faltante de concentrado tenemos por familia de mater…<br>`wrun_01M0EW9WX7FT18JG6J5P7JQ2M8` | completed · 27 s | 5 | 6 | 123168 | 0 | 0 | 0 |
| <a id="fila-27"></a>[27](#pregunta-27) | ¿Qué nos falta comprar de materia prima e insumos este mes?<br>`wrun_01M0EWAW221B5M4W8CK55TMH4J` | completed · 54 s | 8 | 10 | 279248 | 0 | 0 | 0 |
| <a id="fila-28"></a>[28](#pregunta-28) | ¿Qué faltante de materia prima no tiene ninguna compra o …<br>`wrun_01M0EWCPETY01EZ671B2DS8DPZ` | completed · 28 s | 4 | 5 | 160893 | 0 | 0 | 0 |
| <a id="fila-29"></a>[29](#pregunta-29) | Faltante de insumos de la familia BOLSA para cubrir el plan.<br>`wrun_01M0EWDN8GFV1PXQA0MMERH9PP` | completed · 52 s | 6 | 7 | 152861 | 0 | 0 | 0 |
| <a id="fila-30"></a>[30](#pregunta-30) | ¿Cuál es el faltante de materia prima más grande del plan…<br>`wrun_01M0EWFGSAXMD34CQD6ZKA7SMF` | completed · 52 s | 8 | 12 | 237986 | 1 | 0 | 0 |
| <a id="fila-31"></a>[31](#pregunta-31) | ¿Cuál es el cumplimiento plan vs. real de producción de l…<br>`wrun_01M0EWH9G3J84SV1PH5F3G15XG` | completed · 3 min | 10 | 16 | 423493 | 0 | 0 | 0 |
| <a id="fila-32"></a>[32](#pregunta-32) | ¿Qué tan bien estamos cumpliendo el plan de producción es…<br>`wrun_01M0EWQ067735TB3WP0PXEAD8Z` | completed · 1 min | 13 | 19 | 394647 | 2 | 0 | 0 |
| <a id="fila-33"></a>[33](#pregunta-33) | Compara el forecast de ventas contra las ventas reales de…<br>`wrun_01M0EWS6Z37NTDN98K87KDW6RK` | completed · 2 min | 9 | 17 | 278701 | 0 | 0 | 0 |
| <a id="fila-34"></a>[34](#pregunta-34) | ¿Cuál es el cumplimiento de producción por centro de trab…<br>`wrun_01M0EWXPA2WX6VQE36Q3F5MH1B` | completed · 38 s | 4 | 4 | 102995 | 0 | 0 | 0 |
| <a id="fila-35"></a>[35](#pregunta-35) | Indicadores del periodo: programado vs producido y cumpli…<br>`wrun_01M0EWZ192B8V26H16ERR4J5SX` | completed · 2 min | 10 | 11 | 329733 | 0 | 0 | 0 |
| <a id="fila-36"></a>[36](#pregunta-36) | ¿Qué arribos vienen en las próximas 12 semanas y qué cobe…<br>`wrun_01M0EX2BSR7P0P7M10PCXY2PMJ` | completed · 43 s | 3 | 3 | 111988 | 0 | 0 | 0 |
| <a id="fila-37"></a>[37](#pregunta-37) | ¿Cuándo se debe generar el embarque de la familia Frijol …<br>`wrun_01M0EX3SD9GMJ2B06QHBB9QZJ3` | completed · 1 min | 7 | 7 | 291169 | 1 | 0 | 0 |
| <a id="fila-38"></a>[38](#pregunta-38) | ¿Qué familias tienen cobertura por debajo de su tiempo de…<br>`wrun_01M0EX6AXTY4NGRK502NTN2G0A` | completed · 34 s | 3 | 4 | 99513 | 0 | 0 | 0 |
| <a id="fila-39"></a>[39](#pregunta-39) | Dame los arribos proyectados de la familia Frijol Negro p…<br>`wrun_01M0EX7HDWMM2YEQKV9BWA19H8` | completed · 35 s | 6 | 6 | 150055 | 1 | 0 | 0 |
| <a id="fila-40"></a>[40](#pregunta-40) | ¿Qué familia tiene el mayor volumen de arribos en las pró…<br>`wrun_01M0EX8Q2733GSH4K9NNN43A9H` | completed · 2 min | 3 | 2 | 84802 | 0 | 0 | 0 |
| <a id="fila-41"></a>[41](#pregunta-41) | ¿Cuál es la capacidad y ocupación de los centros de traba…<br>`wrun_01M0EXCK2PT164X9P4C8XCMNKF` | completed · 7 min | 25 | 44 | 1214541 | 4 | 0 | 0 |
| <a id="fila-42"></a>[42](#pregunta-42) | ¿Cuál es la capacidad del centro de trabajo CRIBACF?<br>`wrun_01M0EXS2WE24S5NSBAJ3YHXFB6` | completed · 9 s | 2 | 2 | 48074 | 0 | 0 | 0 |
| <a id="fila-43"></a>[43](#pregunta-43) | ¿Qué estaciones de trabajo tiene el centro CRIBACF y cuál…<br>`wrun_01M0EXSEWZAHFJ4M5C2N9FKDVC` | completed · 22 s | 3 | 4 | 70099 | 0 | 0 | 0 |
| <a id="fila-44"></a>[44](#pregunta-44) | ¿Qué centros de trabajo están sobrecargados esta semana?<br>`wrun_01M0F00D245E7720JW5Y44Z8QX` | error · 2 min | 8 | 13 | 236026 | 2 | 1 | 0 |
| <a id="fila-45"></a>[45](#pregunta-45) | ¿Cuál es la capacidad real del centro PROCESADOS y su car…<br>`wrun_01M0EYM5DW6RKP0HXT9AQBWPH1` | completed · 50 s | 6 | 8 | 158032 | 0 | 0 | 0 |
| <a id="fila-46"></a>[46](#pregunta-46) | ¿Qué tenemos en existencias del almacén C. FRESCO, ordena…<br>`wrun_01M0EYNZJDX1QGJGCD60M2JFMF` | completed · 24 s | 5 | 6 | 165778 | 1 | 0 | 0 |
| <a id="fila-47"></a>[47](#pregunta-47) | ¿Cuánto tenemos de existencias de frijol negro en el alma…<br>`wrun_01M0EYPY1S7YJS890ZZGG33C1F` | completed · 60 s | 6 | 5 | 461339 | 0 | 0 | 0 |
| <a id="fila-48"></a>[48](#pregunta-48) | ¿Cuál es el presupuesto VACA de la semana?<br>`wrun_01M0EYRXS6FETDVVAVYPD7QNH2` | completed · 1 min | 7 | 7 | 205621 | 1 | 0 | 0 |
| <a id="fila-49"></a>[49](#pregunta-49) | ¿Qué artículos de la familia Frijol Negro tienen stock po…<br>`wrun_01M0EYV6X7KB2K4M8WH7EC4KKR` | completed · 2 min | 10 | 15 | 302392 | 4 | 0 | 0 |
| <a id="fila-50"></a>[50](#pregunta-50) | ¿Cuál es el saldo de inventario del artículo A1136?<br>`wrun_01M0EYYKY503KQ1JPBGWXV17JW` | completed · 14 s | 3 | 3 | 68551 | 0 | 0 | 0 |
| <a id="fila-51"></a>[51](#pregunta-51) | ¿Qué prototipos de artículo están en desarrollo en esta e…<br>`wrun_01M0EYZK4NTGDN7K498357PGTH` | completed · 14 s | 3 | 2 | 65745 | 1 | 0 | 0 |
| <a id="fila-52"></a>[52](#pregunta-52) | ¿Tienes información de prototipos de receta o costeo de u…<br>`wrun_01M0EZ055R8W2D9DGB2JH5MC14` | completed · 10 s | 3 | 3 | 63600 | 2 | 0 | 0 |
| <a id="fila-53"></a>[53](#pregunta-53) | ¿Puedes darme la lista de materiales de un prototipo de a…<br>`wrun_01M0EZ0H5XDK41QXJJF041JXVD` | completed · 8 s | 3 | 3 | 64066 | 2 | 0 | 0 |
| <a id="fila-54"></a>[54](#pregunta-54) | ¿Qué artículo prototipo está pendiente de autorizar?<br>`wrun_01M0EZ0X54PPKN5KQ0SDP67M0A` | completed · 8 s | 3 | 3 | 65134 | 2 | 0 | 0 |
| <a id="fila-55"></a>[55](#pregunta-55) | ¿Existe algún prototipo de artículo en el catálogo de la …<br>`wrun_01M0EZ193XER7QF6XEN2CEYXBK` | completed · 6 s | 2 | 1 | 44979 | 0 | 0 | 0 |
| <a id="fila-56"></a>[56](#pregunta-56) | ¿Qué traspasos entre almacenes están programados esta sem…<br>`wrun_01M0EZ1N3RP64D9849M888PKQQ` | completed · 8 s | 2 | 1 | 43952 | 0 | 0 | 0 |
| <a id="fila-57"></a>[57](#pregunta-57) | ¿Cuál es el programa de traspasos de la semana 32?<br>`wrun_01M0EZ215CW59NC86JW9AYJPKP` | completed · 6 s | 2 | 1 | 43943 | 0 | 0 | 0 |
| <a id="fila-58"></a>[58](#pregunta-58) | ¿Qué movimientos de traspaso hay planeados entre almacenes?<br>`wrun_01M0EZ2D7AVV6MYRTE5GW5E7YQ` | completed · 7 s | 2 | 1 | 44892 | 0 | 0 | 0 |
| <a id="fila-59"></a>[59](#pregunta-59) | ¿Cuánto inventario hay disponible para traspasar esta sem…<br>`wrun_01M0EZ2S9TTEKYA1WZHGGQVFAX` | completed · 6 s | 2 | 1 | 43564 | 0 | 0 | 0 |
| <a id="fila-60"></a>[60](#pregunta-60) | ¿Qué almacenes reciben mercancía por traspaso la próxima …<br>`wrun_01M0EZ35AMFJ2V081PJ7WR75E4` | completed · 10 s | 2 | 1 | 45426 | 0 | 0 | 0 |
| <a id="fila-61"></a>[61](#pregunta-61) | Dame el dashboard general de producción del periodo.<br>`wrun_01M0EZ3HCB0K307S92Z1N8VRY2` | completed · 24 s | 5 | 7 | 120069 | 1 | 0 | 0 |
| <a id="fila-62"></a>[62](#pregunta-62) | ¿Cuál es el panorama de producción y ocupación de centros…<br>`wrun_01M0EZ4G2ZA0Y0F8MSMYQSHDN6` | completed · 18 s | 3 | 2 | 66754 | 0 | 0 | 0 |
| <a id="fila-63"></a>[63](#pregunta-63) | Resumen ejecutivo del módulo MRP: producción, ocupación y…<br>`wrun_01M0EZ525W9781AGGT6AVGP0FG` | completed · 38 s | 6 | 9 | 150885 | 1 | 0 | 0 |
| <a id="fila-64"></a>[64](#pregunta-64) | ¿Cómo va la producción del periodo comparada con el plan?<br>`wrun_01M0EZ6EA5KXYR6Q5BMPKP255Y` | completed · 18 s | 3 | 2 | 71695 | 0 | 0 | 0 |
| <a id="fila-65"></a>[65](#pregunta-65) | Dashboard del programa mensual: producción por centro y v…<br>`wrun_01M0EZ70JPB6CTX01AWHV1AHW5` | completed · 25 s | 4 | 4 | 96037 | 0 | 0 | 0 |
| <a id="fila-66"></a>[66](#pregunta-66) | Revisa el stock de seguridad de la familia AJO: ¿tenemos …<br>`wrun_01M0EZ7ZBGN5A2Y94TVMRZ1967` | completed · 36 s | 5 | 7 | 124417 | 0 | 0 | 0 |
| <a id="fila-67"></a>[67](#pregunta-67) | ¿Tenemos materia prima suficiente para cubrir el plan de …<br>`wrun_01M0EZ93Z68WYF3X8H4S37RM7N` | completed · 44 s | 3 | 3 | 99157 | 0 | 0 | 0 |
| <a id="fila-68"></a>[68](#pregunta-68) | ¿Cuál es el cumplimiento plan vs real del periodo?<br>`wrun_01M0EZAH0GCQHG6QB8RWVC3X5R` | completed · 10 s | 2 | 1 | 50003 | 0 | 0 | 0 |
| <a id="fila-69"></a>[69](#pregunta-69) | ¿Cuál es la capacidad de los centros de trabajo y su ocup…<br>`wrun_01M0EZAX44F36KQ08QGHX13XM3` | completed · 3 min | 21 | 36 | 796228 | 1 | 0 | 0 |
| <a id="fila-70"></a>[70](#pregunta-70) | Stock de seguridad por familia: ¿qué familias están por d…<br>`wrun_01M0EZGWHZ0W79GBJP3HCANG58` | completed · 57 s | 4 | 5 | 106630 | 0 | 0 | 0 |
| <a id="fila-71"></a>[71](#pregunta-71) | ¿Qué se va a producir esta semana y qué nos falta de mate…<br>`wrun_01M0EZJQHK07GXZ3Z46SX7DYZS` | completed · 2 min | 10 | 16 | 348512 | 2 | 0 | 0 |
| <a id="fila-72"></a>[72](#pregunta-72) | Dame el panorama MRP completo del periodo: plan de produc…<br>`wrun_01M0EZNXK21Y486F2TY1KBC1CD` | completed · 1 min | 7 | 16 | 223100 | 0 | 0 | 0 |
| <a id="fila-73"></a>[73](#pregunta-73) | ¿Cómo está la planeación de producción del periodo?<br>`wrun_01M0EZRBQHS7TWXR0KM5F47ASA` | completed · 36 s | 4 | 4 | 99774 | 0 | 0 | 0 |
| <a id="fila-74"></a>[74](#pregunta-74) | ¿Qué módulos del MRP puedes consultar para esta empresa?<br>`wrun_01M0EZSHXZ72MQAH5B5S9SNZYK` | completed · 8 s | 1 | 0 | 24849 | 0 | 0 | 0 |
| <a id="fila-75"></a>[75](#pregunta-75) | ¿Cuál es el estado general de la planeación de producción…<br>`wrun_01M0EZSY3XRF3R1WEME0A7PDE2` | completed · 16 s | 4 | 3 | 88806 | 0 | 0 | 0 |

---

<a id="pregunta-1"></a>
## 1. Valida la sesión del módulo MRP para el usuario MASERP, ejercicio 2026, periodo 8: confirma el calendario de semanas y el presupuesto de ventas CONCLUIDO. — 21 s

### Respuesta del agente

**Sesión validada — Usuario `MASERP` · Periodo 2026-08 (Agosto)**

**Usuario:** MASERP (CONSULTOR MASERP) · Empresa **INCF** · Estatus `ALTA` ✓

**Calendario de semanas (Agosto 2026):**
| Semana | Inicio | Fin |
|---|---|---|
| 32 | 2026-08-03 | 2026-08-09 |
| 33 | 2026-08-10 | 2026-08-16 |
| 34 | 2026-08-17 | 2026-08-23 |
| 35 | 2026-08-24 | 2026-08-30 |

Ventana [32..35] · **4 semanas**

**Presupuesto de ventas (ejercicio 2026):** encabezado **ID 76 · Versión 56 · `CONCLUIDO`** ✓

**Sesión lista.** Semanas 32–35, presupuesto CONCLUIDO para operar. ¿Qué módulo ejecuto (forecast, modelado, programa, materiales, arribos, análisis)?

---

| [⬆ top](#fila-1) | `wrun_01M0ET2BAS9TKGMRSD8Q3XQTJH` | **Estado real:** completed · **Duración:** 21 s · **steps:** 3 · **tool calls:** 4 · **tokIn:** 67,315 · **tokOut:** 787 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-2"></a>
## 2. ¿Cuál es el calendario de semanas del periodo 8 de 2026 (primerSemana, semanas y fechas)? — 10 s

### Respuesta del agente

**Calendario de semanas — Periodo 8 de 2026 (Agosto)**
Primera semana: S32 · últimas: S32–S35 · número de semanas: 4

| Semana | Fecha inicio | Fecha fin |
|---|---|---|
| 32 | 03/08/2026 | 09/08/2026 |
| 33 | 10/08/2026 | 16/08/2026 |
| 34 | 17/08/2026 | 23/08/2026 |
| 35 | 24/08/2026 | 30/08/2026 |

Siguiente paso: indicar el usuario de sesión (por omisión MASERP) para ejecutar un módulo sobre este periodo.

---

| [⬆ top](#fila-2) | `wrun_01M0ET335HQ17DQN42XAT91955` | **Estado real:** completed · **Duración:** 10 s · **steps:** 3 · **tool calls:** 2 · **tokIn:** 67,874 · **tokOut:** 646 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-3"></a>
## 3. ¿Qué usuario corre el proceso de planeación en ICF y está activo en la tabla de usuarios? — 14 s

### Respuesta del agente

**El proceso de planeación (MRP/Forecast) lo corre el usuario MASERP, que está activo en ICF.**

| Usuario | Nombre | Empresa | Estatus |
|---|---|---|---|
| **MASERP** | CONSULTOR MASERP | INCF | ALTA |

Es el usuario fijo con el que se calcula la explosión de materiales del módulo de planeación y figura con estatus **ALTA** (activo) en el catálogo de usuarios de **Industrias Campo Fresco**.

---

| [⬆ top](#fila-3) | `wrun_01M0ET3F842GC38F72EEEQK0RJ` | **Estado real:** completed · **Duración:** 14 s · **steps:** 5 · **tool calls:** 6 · **tokIn:** 119,245 · **tokOut:** 859 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-4"></a>
## 4. ¿Cuál es la primera semana y el nombre del mes del periodo vigente de planeación? — 3 min

### Respuesta del agente

**Periodo vigente de planeación — 2026-08 (Agosto)**

| Concepto | Valor |
|---|---|
| Ejercicio–Periodo | 2026-08 |
| Nombre del mes | **Agosto** |
| Primera semana | **Semana 32** (del 03-ago-2026 al 09-ago-2026) |

La ventana del periodo arranca en la semana 32; hoy (19-ago-2026) cae dentro del mismo periodo de planeación.

---

| [⬆ top](#fila-4) | `wrun_01M0ET41BZY3WDXB781JJY53G2` | **Estado real:** completed · **Duración:** 3 min · **steps:** 7 · **tool calls:** 8 · **tokIn:** 200,668 · **tokOut:** 2,801 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-5"></a>
## 5. Valida la sesión de planeación y dime qué ejercicio/periodo tiene el presupuesto de ventas CONCLUIDO. — 25 s

### Respuesta del agente

**Presupuesto de ventas CONCLUIDO — disponible en 2 ejercicios**
Sesión validada: **MASERP** (CONSULTOR MASERP, empresa INCF, estatus ALTA).

| ID | Versión | Estatus | Ejercicio |
|---|---|---|---|
| 74 | 60 | **CONCLUIDO** | **2025** |
| 76 | 56 | **CONCLUIDO** | **2026** |

Ambos ejercicios tienen habilitado el presupuesto de venta consolidado con estatus **CONCLUIDO** (el cierre es por ejercicio, no por periodo). El resto de los registros (SemanaMRP 1–52) están en **PROCESADO** y corresponden a las semanas de corrida de cada ejercicio.

**Siguiente paso:** confirma sobre qué ejercicio quieres operar — el vigente (2026) o el de cierre 2025.

---

| [⬆ top](#fila-5) | `wrun_01M0ET9TVFQ4VAA94PXDBE14XS` | **Estado real:** completed · **Duración:** 25 s · **steps:** 5 · **tool calls:** 7 · **tokIn:** 116,028 · **tokOut:** 1,716 · **errores:** 1 (tools: 1 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-6"></a>
## 6. Desglose del forecast del periodo activo: ventana de 5 semanas con totales por columna y los 10 artículos de mayor programa. — 41 s

### Respuesta del agente

**Desglose de Forecast — Periodo 8**
**Sesión:** MASERP · 2026 · Periodo 8 · Ventana S32–S36 · **Artículos:** 90

**Totales por columna (S = programa · P = plan a producir)**
| Columna | S | P |
|---|---|---|
| S32 | 3,978,128 | 2,867,048 |
| S33 | 2,440,112 | 2,120,442 |
| S34 | 1,973,193 | 1,872,112 |
| S35 | 2,142,893 | 2,104,518 |
| S36 | sin datos | sin datos |

**10 artículos de mayor programa (S32)**
| Artículo | Descripción | S32 | S33 | S34 | S35 | Total Inv. |
|---|---|---|---|---|---|---|
| **A6321** | AUTOSERVICIO | 250,000 | 250,000 | 250,000 | 250,000 | 23,395 |
| A6722 | AUTOSERVICIO | 245,256 | 62,316 | 62,316 | 62,316 | 2,269 |
| A6720 | AUTOSERVICIO | 214,128 | 54,408 | 54,408 | 54,408 | 2,589 |
| A6837 | AUTOSERVICIO | 200,690 | 50,982 | 50,982 | 50,982 | 51,570 |
| A6323 | AUTOSERVICIO | 175,000 | 175,000 | 175,000 | 175,000 | 22,317 |
| A6440 | GOBIERNO | 150,000 | 150,000 | 49,500 | — | 5,980 |
| A4859 | AUTOSERVICIO | 145,848 | 37,062 | 37,062 | 37,062 | 29,880 |
| A6917 | GOBIERNO | 145,800 | — | — | — | 0 |
| A4858 | AUTOSERVICIO | 123,600 | 31,405 | 31,405 | 31,405 | 25,280 |
| A6817 | AUTOSERVICIO | 100,000 | 100,000 | 100,000 | 100,000 | 51,420 |

La semana 36 no trae plan cargado en la corrida actual (se reporta sin datos).

¿Quieres el listado completo o el desglose de un artículo en específico (ej. "desglose de A6722")?

---

| [⬆ top](#fila-6) | `wrun_01M0ETASJ2DJHWQSD9F2P5847Z` | **Estado real:** completed · **Duración:** 41 s · **steps:** 5 · **tool calls:** 13 · **tokIn:** 126,444 · **tokOut:** 3,514 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-7"></a>
## 7. ¿Cuál es el desglose del forecast S1-S12 del artículo A2502? — 16 s

### Respuesta del agente

**Desglose del forecast S1–S12 del artículo A2502 — sin datos**

El artículo **A2502** (`Frijol Media Oreja` · Origen) sí está en el grid de planeación, pero no tiene pronóstico cargado en las semanas S1–S12 (los 12 valores están vacíos en la corrida vigente) — este snapshot solo tiene plan poblado en la ventana S32–S35.

| Contexto del artículo | Valor |
|---|---|
| Artículo | A2502 |
| Familia FC | Frijol Media Oreja · Origen |
| Centro de trabajo | CRIBACF2 |
| Cliente | CP-0014 (AUTOSERVICIO) |
| Pronóstico S1–S12 | Sin datos (semanas en blanco) |

Siguiente paso: si necesitas el pronóstico del artículo, puedo revisar la ventana con datos (S32–S35) o su histórico de versiones.

---

| [⬆ top](#fila-7) | `wrun_01M0ETC5GWWP3R0N1WTW39VHMM` | **Estado real:** completed · **Duración:** 16 s · **steps:** 4 · **tool calls:** 3 · **tokIn:** 94,858 · **tokOut:** 885 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-8"></a>
## 8. Dame el inventario semanal de 13 columnas de la familia Frijol Negro. — 2 min

### Respuesta del agente

**Tema — Inventario semanal de la familia Frijol Negro (proyección 12 semanas)**

**Hallazgo:** El inventario de **Frijol Negro** arranca en **4,977 kg** y cae en déficit profundo desde la semana 1 (−596,298 kg) hasta la semana 8 (−3,860,828 kg); a partir de la semana 9 se recupera y cierra la ventana en **17,552,817 kg**.

**Datos — Frijol Negro (Kg por semana, 13 columnas: renglón + S1–S12):**

| Renglón | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 | S10 | S11 | S12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Inv. Inicial | 4,977 | −596,298 | −1,198,548 | −1,668,222 | −2,098,146 | −2,717,606 | −3,246,217 | −3,860,828 | −264,530 | 3,332,743 | 7,572,640 | 12,230,761 |
| **Inventario final** | **−596,298** | **−1,198,548** | **−1,668,222** | **−2,098,146** | **−2,717,606** | **−3,246,217** | **−3,860,828** | **−264,530** | **3,332,743** | **7,572,640** | **12,230,761** | **17,552,817** |
| Cobertura (semanas) | −0.99 | −1.99 | −2.99 | −3.95 | −4.37 | −6.06 | −6.21 | — | 5.54 | 17.68 | 27.80 | 44.38 |

Lead time: **7 semanas** · Puede confirmarse la corrida/proyección en la ruta de cobertura de materia prima (dato por usuario de planeación).

**Siguiente paso:** Verificar el arribo proyectado de la semana 8 (≈3,596,298 kg) que es el punto donde el déficit se revierte; si no está confirmado, el faltante real de Frijol Negro se mantiene las primeras 7 semanas.

---

| [⬆ top](#fila-8) | `wrun_01M0ETCQJ5HF2A0DVJB01NN7JS` | **Estado real:** completed · **Duración:** 2 min · **steps:** 9 · **tool calls:** 12 · **tokIn:** 301,837 · **tokOut:** 8,446 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-9"></a>
## 9. ¿Cuál es el forecast de venta a 12 semanas agrupado por familia de artículo? — 57 s

### Respuesta del agente

**Forecast de venta a 12 semanas por familia — sesión MASERP (33 familias en catálogo)**
La ventana móvil se captura por semana (S1–S12) por familia de artículo. Las 10 de mayor pronóstico acumulado a 12 semanas:

| Familia | Pronóstico 12 semanas (kg) |
|---|---|
| **Frijol Negro** | 5,935,450 |
| **Frijol Pinto** | 3,074,800 |
| **Lenteja** | 1,068,525 |
| **Maíz Palomero** | 1,062,602 |
| **Mitades claras** | 599,852 |
| **Mitades Negras** | 486,964 |
| **Avena** | 455,463 |
| **Garbanza** | 189,400 |
| **Frijol Media Oreja** | 130,500 |
| **Jamaica** | 83,739 |

Siguiente paso: ¿quieres el desglose semanal completo (S1–S12) de alguna familia, o el listado completo de las 33?

---

| [⬆ top](#fila-9) | `wrun_01M0ETG2Y9Y6C762RSGEZETGK1` | **Estado real:** completed · **Duración:** 57 s · **steps:** 7 · **tool calls:** 6 · **tokIn:** 178,209 · **tokOut:** 5,082 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-10"></a>
## 10. ¿Qué artículo tiene el mayor programa en la semana 1 del forecast del periodo? — 14 s

### Respuesta del agente

**El mayor programa de la semana 1 del periodo lo tiene el artículo A6722** (plan de 242,987 piezas), del programa BEST CHOICE.

**Sesión:** Plan · Periodo 8 · Semana 1 (S32)

| Artículo | Programa | Cliente | Ventas (S32) | Plan Producción (P32) |
|---|---|---|---|---|
| **A6722** | BEST CHOICE | CP-0013 | 245,256 pz | **242,987 pz** |
| A6321 | TRES B | CP-0012 | 250,000 pz | 226,605 pz |
| A6720 | BEST CHOICE | CP-0013 | 214,128 pz | 211,539 pz |

El segundo mayor es **A6321** (226,605 pz), y le sigue **A6720** con 211,539 piezas.

---

| [⬆ top](#fila-10) | `wrun_01M0EZTQ83AAJVC7D74YN6FDGX` | **Estado real:** completed · **Duración:** 14 s · **steps:** 3 · **tool calls:** 2 · **tokIn:** 72,095 · **tokOut:** 858 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-11"></a>
## 11. Concentrado de familias del periodo: piezas y kilos a producir por familia. — 25 s

### Respuesta del agente

**Concentrado de Familias — Julio 2026 (piezas y kilos a producir por familia)**

| Familia | PZ a Producirse | Kilogramos de Uso |
|---|---|---|
| Frijol Pinto | 1,414,708 | 1,112,143 |
| Frijol Negro | 1,359,138 | 1,217,678 |
| Mitades claras | 2,550,948 | 292,136 |
| Mitades Negras | 2,039,282 | 244,714 |
| Lenteja | 1,027,147 | 636,299 |
| Maiz Palomero | 1,001,304 | 498,054 |
| vacio | 718,368 | 1,104 |
| Alverjon | 343,520 | 0 |
| Avena | 297,291 | 63,668 |
| Garbanza | 211,698 | 211,698 |
| Mitades peruanas | 149,824 | 17,979 |
| Jamaica | 129,860 | 119,429 |
| Frijol Media Oreja | 75,700 | 68,130 |
| Entero Negro | 57,045 | 6,845 |
| Frijol Peruano | 14,678 | 13,210 |
| NUEZ | 14,863 | 743 |
| ARANDANO | 11,437 | 1,144 |
| ALMENDRA | 10,432 | 522 |
| CANELA | 6,199 | 310 |
| Ciruela | 3,636 | 436 |
| Revoltura c/gragea | 3,060 | 3,060 |
| Alpiste Simple | 1,410 | 1,410 |
| Haba | 260 | 130 |
| **Total** | **11,441,806** | **4,510,842** |

Siguiente paso: revisar la semana/centro de alguna familia para contrastar contra lo ya producido.

---

| [⬆ top](#fila-11) | `wrun_01M0ETYS7M988R4RJ61TXGWTM2` | **Estado real:** completed · **Duración:** 25 s · **steps:** 5 · **tool calls:** 5 · **tokIn:** 116,498 · **tokOut:** 1,170 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-12"></a>
## 12. ¿Qué familia concentra más piezas en el plan de producción del periodo? — 23 s

### Respuesta del agente

**Mitades claras** es la familia que más piezas concentra en el plan de producción del periodo (2,550,948 piezas, ~22% del total).

**Concentrado de Familias — Periodo 8**
| Familia | PZ A Producirse | Kilogramos de Uso |
|---|---|---|
| **Mitades claras** | 2,550,948 | 292,136 kg |
| Mitades Negras | 2,039,282 | 244,714 kg |
| Frijol Pinto | 1,414,708 | 1,112,143 kg |
| Frijol Negro | 1,359,138 | 1,217,678 kg |
| Lenteja | 1,027,147 | 636,299 kg |
| Maiz Palomero | 1,001,304 | 498,054 kg |
| vacío | 718,368 | 1,104 kg |
| (resto de familias) | 1,306,911 | — |
| **Total** | **11,441,806** | **4,510,842 kg** |

La familia **Mitades claras** lidera por piezas; por peso encabeza **Frijol Negro** (1,217,678 kg), seguida de **Frijol Pinto**.

---

| [⬆ top](#fila-12) | `wrun_01M0ETZQDH6Q6Z0QX08CJ7QJ1E` | **Estado real:** completed · **Duración:** 23 s · **steps:** 5 · **tool calls:** 5 · **tokIn:** 120,907 · **tokOut:** 1,554 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-13"></a>
## 13. Concentrado de producción por familia del mes en curso. — 45 s

### Respuesta del agente

**Concentrado de producción por familia — Octubre 2026 (periodo en curso)**

| Familia | PZ a Producirse | Kilogramos de Uso |
|---|---|---|
| Mitades claras | 2,550,948 | 292,136 |
| Mitades Negras | 2,039,282 | 244,714 |
| Frijol Pinto | 1,414,708 | 1,112,143 |
| Frijol Negro | 1,359,138 | 1,217,678 |
| Maiz Palomero | 1,001,304 | 498,054 |
| Lenteja | 1,027,147 | 636,299 |
| vacio | 718,368 | 1,104 |
| Alverjon | 343,520 | 0 |
| Avena | 297,291 | 63,668 |
| Garbanza | 211,698 | 211,698 |
| Jamaica | 129,860 | 119,429 |
| **Frijol Media Oreja** | 75,700 | 68,130 |
| Entero Negro | 57,045 | 6,845 |
| Mitades peruanas | 149,824 | 17,979 |
| ALMENDRA | 10,432 | 522 |
| ARANDANO | 11,437 | 1,144 |
| NUEZ | 14,863 | 743 |
| CANELA | 6,199 | 310 |
| Alpiste Simple | 1,410 | 1,410 |
| Revoltura c/gragea | 3,060 | 3,060 |
| Ciruela | 3,636 | 436 |
| Frijol Peruano | 14,678 | 13,210 |
| Haba | 260 | 130 |
| **Total** | **11,441,806** | **4,510,842** |

El mes marcha con **11.44 M de piezas** a producir y **4.51 M de kg** de uso de material; las tres mayores familias (Mitades claras, Mitades Negras y Frijol Pinto) concentran ~52% de las piezas.

**Siguiente paso:** si quieres, desgloso el programa por centro de trabajo o comparo lo producido real vs. plan de la semana.

---

| [⬆ top](#fila-13) | `wrun_01M0EV0FXDNHZB6CDP9VS23WN4` | **Estado real:** completed · **Duración:** 45 s · **steps:** 5 · **tool calls:** 5 · **tokIn:** 122,426 · **tokOut:** 3,507 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-14"></a>
## 14. ¿Cuántas piezas y kilos hay que producir por familia este periodo? — 11 s

### Respuesta del agente

**Concentrado de Familias — Piezas y kilos a producir este periodo**

| Familia | PZ A Producirse | Kilogramos de Uso |
|---|---|---|
| Mitades claras | 2,550,948 | 292,136 |
| Mitades Negras | 2,039,282 | 244,714 |
| Frijol Pinto | 1,414,708 | 1,112,143 |
| Frijol Negro | 1,359,138 | 1,217,678 |
| Lenteja | 1,027,147 | 636,299 |
| Maiz Palomero | 1,001,304 | 498,054 |
| vacio | 718,368 | 1,104 |
| Alverjon | 343,520 | 0 |
| Avena | 297,291 | 63,668 |
| Garbanza | 211,698 | 211,698 |
| Mitades peruanas | 149,824 | 17,979 |
| Jamaica | 129,860 | 119,429 |
| Frijol Media Oreja | 75,700 | 68,130 |
| Entero Negro | 57,045 | 6,845 |
| NUEZ | 14,863 | 743 |
| Frijol Peruano | 14,678 | 13,210 |
| ARANDANO | 11,437 | 1,144 |
| ALMENDRA | 10,432 | 522 |
| CANELA | 6,199 | 310 |
| Ciruela | 3,636 | 436 |
| Revoltura c/gragea | 3,060 | 3,060 |
| Alpiste Simple | 1,410 | 1,410 |
| Haba | 260 | 130 |
| **Total** | **11,293,923** | **4,511,555** |

**Siguiente paso:** puedo generar el programa de producción semanal por centro de trabajo si necesitas el detalle operativo.

---

| [⬆ top](#fila-14) | `wrun_01M0EV241535V2T78TG5JW46MY` | **Estado real:** completed · **Duración:** 11 s · **steps:** 3 · **tool calls:** 3 · **tokIn:** 67,077 · **tokOut:** 851 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-15"></a>
## 15. Dame el concentrado de la familia Frijol Negro del plan de producción. — 14 s

### Respuesta del agente

**Concentrado Familia Frijol Negro — Plan de Producción (periodo 2026-07)**
| Familia | PZ A Producirse | Kilogramos de Uso |
|---|---|---|
| **Frijol Negro** | 1,359,138 pz | 1,217,677.56 kg |

La familia **Frijol Negro** programa producir **1,359,138 piezas** con un consumo de **1,217,677.56 kg** en el periodo, el tercer volumen más alto del plan (después de Mitades claras y Mitades Negras).

¿Quieres el desglose por artículo de esta familia o la comparación contra lo ya producido?

---

| [⬆ top](#fila-15) | `wrun_01M0EV2G2PJB9NAN3Q57ARAE0S` | **Estado real:** completed · **Duración:** 14 s · **steps:** 3 · **tool calls:** 2 · **tokIn:** 67,689 · **tokOut:** 507 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-16"></a>
## 16. ¿Cuál es el programa mensual de producción y la ocupación por centro de trabajo? — 14 s

### Respuesta del agente

**Programa Mensual de Producción y Ocupación por Centro de Trabajo — ICF**

| Centro de Trabajo | Forecast de ventas | Piezas programadas | Capacidad Mensual (hrs) | Horas Programadas | Ocupación | Piezas Libres | Días Hábiles | Días Extra |
|---|---|---|---|---|---|---|---|---|
| CRIBACF | 1,457,500 | 1,466,132 | 629.60 | 678.76 | 107.8% | 0 | n/d | n/d |
| CRIBACF2 | 2,400,000 | 2,578,588 | 1,240.13 | 953.97 | 76.9% | 773,485 | n/d | n/d |
| ENTEROS | 36,720 | 36,720 | 266.50 | 30.45 | 11.4% | 284,679 | n/d | n/d |
| ENVCF | 2,027,400 | 1,606,236 | 1,801.15 | 836.58 | 46.4% | 1,851,972 | n/d | n/d |
| JAMAICA | 40,000 | 62,240 | 174.11 | 92.62 | 53.2% | 54,761 | n/d | n/d |
| PAQUETERIA | 67,500 | 16,218 | 132.00 | 11.26 | 8.5% | 173,862 | n/d | n/d |
| PROCESADOS | 3,449,920 | 3,247,685 | 505.21 | 386.63 | 76.5% | 996,065 | n/d | n/d |
| SIN CENTRO | 775,000 | 578,050 | — | — | — | — | — | — |
| **Total** | **10,254,040** | **9,591,869** | **4,749** | **2,990** | **63%** | **4,134,824** | — | — |

**🔴 Centro sobrecargado:** **CRIBACF** con 107.8% de ocupación — programa un 7.8% por encima de su capacidad (necesita ~49 hrs extra de capacidad; el resto de centros va holgado).

**Observación:** la ocupación global es del **63%**, con **CRIBACF2** y **PROCESADOS** como los centros de mayor volumen y mejor carga (77% cada uno). ENTEROS, PAQUETERIA y ENVCF tienen amplia capacidad disponible.

Los días hábiles y extra no están disponibles en la fuente actual.

**Siguiente paso:** si quieres ver el detalle del plan semanal (piezas por artículo) de **CRIBACF** para atender la sobrecarga, dime la semana y lo desgloso.

---

| [⬆ top](#fila-16) | `wrun_01M0EV321VGR9P4DVZBM6XSGEN` | **Estado real:** completed · **Duración:** 14 s · **steps:** 3 · **tool calls:** 2 · **tokIn:** 68,774 · **tokOut:** 1,066 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-17"></a>
## 17. ¿Cuál es la ocupación de los centros de trabajo esta semana? — 28 s

### Respuesta del agente

**Ocupación de los centros de trabajo — Programa Mensual (periodo actual)**

| Centro de Trabajo | Ocupación | % Ocupación | Capacidad (hrs) | Horas Prog. | Piezas Libres |
|---|---|---|---|---|---|
| **CRIBACF** | 1,359,936 pz | **107.8% 🔴** | 629.6 | 678.8 | -106,196 |
| CRIBACF2 | 3,352,073 pz | 76.9% | 1,240.1 | 954.0 | 773,485 |
| ENTEROS | 321,399 pz | 11.4% | 266.5 | 30.4 | 284,679 |
| ENVCF | 3,458,208 pz | 46.4% | 1,801.2 | 836.6 | 1,851,972 |
| JAMAICA | 117,001 pz | 53.2% | 174.1 | 92.6 | 54,761 |
| PAQUETERIA | 190,080 pz | 8.5% | 132.0 | 11.3 | 173,862 |
| PROCESADOS | 4,243,750 pz | 76.5% | 505.2 | 386.6 | 996,065 |
| **Total** | 13,042,447 pz | 63% | 4,749 | 2,990 | 4,134,824 |

🔴 **CRIBACF está sobrecargado** (107.8% de ocupación): programa más de lo que da su capacidad (~48 hrs por arriba) y queda con piezas libres negativas. Los demás centros operan dentro de su capacidad. El centro "SIN CENTRO" no tiene ocupación calculada.

**Siguiente paso:** revisar el programa semanal de CRIBACF para redistribuir horas o ajustar el plan.

---

| [⬆ top](#fila-17) | `wrun_01M0EV3MAY08XNX0CE3B45AXVH` | **Estado real:** completed · **Duración:** 28 s · **steps:** 3 · **tool calls:** 2 · **tokIn:** 70,445 · **tokOut:** 2,145 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-18"></a>
## 18. ¿Qué se va a producir esta semana según el plan de producción? — 24 s

### Respuesta del agente

**Tema — Plan de producción · Semana 9 (23 feb – 1 mar 2026)**

En la semana en curso el plan autorizado contempla **1,626,180 piezas** y **765,919 kg**, distribuidos en 11 líneas activas.

| Familia | Piezas | Kg |
|---|---|---|
| Frijol Negro | 278,450 | 241,497 |
| Mitades claras | 361,000 | 36,120 |
| Mitades Negras | 322,000 | 24,240 |
| Lenteja | 221,100 | 185,550 |
| Frijol Pinto | 190,000 | 143,400 |
| Maíz Palomero | 176,400 | 88,200 |
| Avena | 25,230 | 18,912 |
| Jamaica | 18,000 | 18,000 |
| Alpiste Simple | 5,000 | 5,000 |
| Revoltura c/gragea | 5,000 | 5,000 |
| Sin familia | 24,000 | — |
| **Total** | **1,626,180** | **765,919** |

**Siguiente paso:** las mitades (claras y negras) concentran la mayor cantidad de piezas; si quieres, reviso el detalle por variedad o centro de trabajo para esta semana.

**SPEECH:** Ya lo tengo — esta semana se producen 1.6 millones de piezas, poco más de 765 mil kilos, con Frijol Negro y mitades como los volúmenes más grandes. ¿Quieres que vea el detalle por centro?

---

| [⬆ top](#fila-18) | `wrun_01M0EV4KGBCWE57E59TETQQ4DJ` | **Estado real:** completed · **Duración:** 24 s · **steps:** 5 · **tool calls:** 6 · **tokIn:** 124,268 · **tokOut:** 2,013 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-19"></a>
## 19. ¿Cuál es el programa semanal por centro y su capacidad ocupada? — 3 min

### Respuesta del agente

**Programa de producción por centro — Ejercicio 2026, Periodo 8 — y su capacidad ocupada**

| Centro de Trabajo | A Producir (pzas) | Capacidad Ocupada (pzas) | Capacidad (hrs) |
|---|---|---|---|
| **PROCESADOS** | 3,247,685 | 4,243,750 | 505.21 |
| CRIBACF2 | 2,578,588 | 3,352,073 | 1,240.13 |
| ENVCF | 1,606,236 | 3,458,208 | 1,801.15 |
| CRIBACF | 1,466,132 | 1,359,936 | 629.60 |
| SIN CENTRO | 578,050 | — | — |
| ENTEROS | 36,720 | 321,399 | 266.50 |
| JAMAICA | 62,240 | 117,001 | 174.11 |
| PAQUETERIA | 16,218 | 190,080 | 132.00 |
| **Total** | **9,591,869** | — | — |

**Hallazgo:** **PROCESADOS** es el centro con mayor carga (3.25 M pzas programadas) y concentra la producción de mitades; su capacidad real alcanza 4.24 M piezas / 505 hrs. La capacidad ocupada (piezas) supera lo programado en casi todos los centros, indicando holgura o sobre-programación de ocupación frente a piezas a producir.

Nota: el desglose semanal fin por centro (`Semana 32–35`) no está cargado en la fuente para el periodo vigente; el concentrado disponible es a nivel periodo. ¿Quieres que arme el comparativo semanal por estación en cuanto estén cargadas las semanas?

---

| [⬆ top](#fila-19) | `wrun_01M0EZV9E3YWKR6W5GXDKV4CMB` | **Estado real:** completed · **Duración:** 3 min · **steps:** 14 · **tool calls:** 23 · **tokIn:** 451,391 · **tokOut:** 12,383 · **errores:** 4 (tools: 4 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-20"></a>
## 20. Dame el programa de producción por centro de trabajo del periodo. — 2 min

### Respuesta del agente

**Programa de producción del periodo (2026 · Periodo 8) — concentrado disponible por familia**

El desglose **por centro de trabajo** para el periodo 8 no tiene datos poblados en la fuente actual (el plan semanal por centro aún no está disponible), por lo que presento el **programa mensual concentrado por familia**, que sí registra 11,441,806 piezas a producir.

| Familia | PZ A Producirse | Kilogramos de Uso |
|---|---|---|
| Mitades claras | 2,550,948 | 292,136.47 |
| Mitades Negras | 2,039,282 | 244,713.79 |
| Frijol Pinto | 1,414,708 | 1,112,143.39 |
| Frijol Negro | 1,359,138 | 1,217,677.56 |
| Maiz Palomero | 1,001,304 | 498,053.8 |
| Lenteja | 1,027,147 | 636,299.25 |
| vacio | 718,368 | 1,103.9 |
| Alverjon | 343,520 | 0 |
| Avena | 297,291 | 63,668.4 |
| Garbanza | 211,698 | 211,698 |
| Jamaica | 129,860 | 119,429 |
| Mitades peruanas | 149,824 | 17,978.88 |
| Entero Negro | 57,045 | 6,845.4 |
| Frijol Media Oreja | 75,700 | 68,130 |
| Frijol Peruano | 14,678 | 13,209.75 |
| ARANDANO | 11,437 | 1,143.7 |
| ALMENDRA | 10,432 | 521.6 |
| CANELA | 6,199 | 309.95 |
| Ciruela | 3,636 | 436.32 |
| Revoltura c/gragea | 3,060 | 3,060 |
| Alpiste Simple | 1,410 | 1,410 |
| NUEZ | 14,863 | 743.15 |
| Haba | 260 | 130 |
| **Total** | **11,441,806** | **4,510,842** |

**Siguiente paso:** si necesitas el programa desglosado **por centro de trabajo**, se debe poblar el plan semanal de centros del periodo (la vista aún no registra renglones por centro) para poder entregarlo.

---

| [⬆ top](#fila-20) | `wrun_01M0EVJ7A1JN4STM2J1X66NB6X` | **Estado real:** completed · **Duración:** 2 min · **steps:** 14 · **tool calls:** 19 · **tokIn:** 389,020 · **tokOut:** 8,949 · **errores:** 2 (tools: 2 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-21"></a>
## 21. Validación de insumos del plan de producción: ¿qué materiales no alcanzan para cubrir el plan? — 2 min

### Respuesta del agente

**Validación de insumos — Plan de producción (ejercicio 2026, periodo 7)**

Los materiales que **no alcanzan** para cubrir el plan son los **graneles intermedios** (frijol refrito a granel listo para envase). El resto de insumos (rollo, etiquetas, cinta, cajas y tarima) tiene cobertura completa.

**No cubren el plan:**
| Material | Requerido por el plan | Disponible | Cobertura |
|---|---|---|---|
| Frijol Pinto Refrito Granel 283 g | 43,578 | 0 | 🔴 0% |
| Frijol Bayo Refrito Granel 430 g | 25,000 | 2 | 🔴 ~0% |
| Frijol Refrito Negro c/Beef Tallow Granel | 22,524 | 4,827 | 🔴 21% |

**Sí cubren (empacado):**
| Material | Requerido | Disponible | Cobertura |
|---|---|---|---|
| Etiqueta caja/fardo 4x2 | 24,117 | ~641,000 | 🟢 100% |
| Caja Beef Tallow Somos | 11,018 | 45,976 | 🟢 100% |
| Etiqueta circular naranja | 4,167 | ~328,000 | 🟢 100% |
| Caja Kraft Frijol Refrito 12/430 | 2,083 | ~7,580 | 🟢 100% |
| Rollo playo · Etiqueta térmica · Cinta · Tarima | 4–59 | amplio | 🟢 100% |

El cuello de botella del plan está en **~91,000 unidades de frijol refrito a granel sin inventario** (faltan casi por completo); el material de empaque no es problema.

**Siguiente paso:** validar si esos graneles entran en el programa de producción de las líneas de cocción (debieran producirse y verse cubiertos por su orden de producción, no por almacén). ¿Reviso la cobertura de esos graneles contra su producción programada?

---

| [⬆ top](#fila-21) | `wrun_01M0EVNN700EN0QX7NNCJ490RD` | **Estado real:** completed · **Duración:** 2 min · **steps:** 10 · **tool calls:** 20 · **tokIn:** 318,449 · **tokOut:** 11,244 · **errores:** 1 (tools: 1 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-22"></a>
## 22. ¿Qué materia prima falta para cubrir el plan de producción del periodo? — 44 s

### Respuesta del agente

**No hay materia prima faltante para cubrir el plan de producción — Periodo jul-2026.**

Los reportes de faltante del periodo (materia prima e insumos de producción) terminaron sin desviaciones: el inventario disponible cubre el requerimiento neto del plan de producción.

| Reporte | Artículos faltantes |
|---|---|
| Materia prima (no producidos) | 0 |
| Insumos de producción | 0 |

**Nota:** la pantalla maestra de explosión de materiales (cobertura del plan) presentó un error de cálculo en la corrida; los resultados anteriores provienen de los reportes oficiales de faltante, que sí respondieron correctamente y confirman el abasto.

Puedo revisar el próximo periodo o validar el detalle de cobertura de un centro o familia específica si lo necesitas.

---

| [⬆ top](#fila-22) | `wrun_01M0EVSTBKTTPE04DRK11S4RYJ` | **Estado real:** completed · **Duración:** 44 s · **steps:** 8 · **tool calls:** 9 · **tokIn:** 227,295 · **tokOut:** 3,315 · **errores:** 1 (tools: 1 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-23"></a>
## 23. Validación de insumos de MASERP para el periodo 8: por cada artículo del plan, su lista de materiales con rendimiento, inventario, requerido y cobertura. — 3 min

### Respuesta del agente

## Validación de insumos — plan MASERP · Periodo 8 (Ejercicio 2026)

**Hallazgo:** La explosión de insumos del plan (periodo 8) está materializada para la línea de **refritos / graneles procesados** (4 productos con detalle de lista de materiales). Para el resto del plan (avena, maíz, lenteja, frijol entero, jamaica, etc.) el snapshot no trae renglones de material; y **la cruz de cobertura (inventario vs. requerido) no está calculada en el snapshot** para estos renglones — la corrida no dejó valores de inventario final ni % de cobertura.

### Insumos con requerimiento neto (refritos / granel)

| Producto | Material (insumo) | Rendimiento | Requerido neto | Nota |
|---|---|---|---|---|
| Frijol Bayo Refrito Corina (25,000) | Granel Bayo Refrito Corina | 1.0000 | 25,000 pz | material base |
| | Caja kraft 12 pzas | 0.0833 | 2,083.33 | |
| | Etiqueta circular naranja | 0.1667 | 4,166.67 | |
| | Etiqueta identific. caja/fardo | 0.0833 | 2,083.33 | |
| | Rollo playo 3.5 kg | 0.000439 | 10.96 | |
| | Etiqueta térmica tarimas | 0.000731 | 18.27 | |
| | Cinta transparente 900 m | 0.000093 | 2.32 | |
| Frijol Refrito Negro B. Tallow (40,914) | Granel Refrito Negro B.T. | 1.0000 | 40,914 pz | material base |
| | Caja Beef Tallow | 0.1667 | 6,819.00 | |
| | Etiqueta identific. caja/fardo | 0.3333 | 13,638.00 | |
| | Tarima exportación | 0.000617 | 25.26 | |
| | Rollo playo 3.5 kg | 0.000370 | 15.15 | |
| | Etiqueta térmica tarimas | 0.000617 | 25.26 | |
| Frijol Pinto B. Tallow (39,462) | Granel Refrito Pinto B.T. | 1.0000 | 39,462 pz | material base |
| | Caja Beef Tallow | 0.1667 | 6,577.00 | |
| | Etiqueta identific. caja/fardo | 0.3333 | 13,154.00 | |
| | Tarima exportación | 0.000617 | 24.36 | |
| | Rollo playo 3.5 kg | 0.000370 | 14.62 | |
| | Etiqueta térmica tarimas | 0.000617 | 24.36 | |
| | Cinta transparente 900 m | 0.000046 | 1.83 | |
| Frijol Pinto Tradicional Agui Somos (45,960) | Granel Pinto Tradicional | 1.0000 | 45,960 pz | material base |
| | Caja Beef Tallow | 0.1667 | 7,661.53 | |
| | Etiqueta identific. caja/fardo | 0.3333 | 15,320.00 | |
| | Tarima exportación | 0.000600 | 27.58 | |
| | Rollo playo 3.5 kg | 0.000400 | 18.38 | |
| | Etiqueta térmica tarimas | 0.000617 | 28.37 | |
| | Cinta transparente 900 m | 0.000046 | 2.13 | |

Los ingredientes de fórmula (sal, ajo, levadura, concentrados, aceite, frijol mitad, tintas/solventes) aparecen en el BOM con **requerimiento en cero** en esta corrida.

**Limitación:** la cobertura (inventario disponible vs. requerido, con % y días de alcance) no quedó calculada en el snapshot de MASERP para estos renglones, y el resto de productos del plan no tiene desglose de material en esta corrida. **Siguiente paso:** puedo cruzar cada insumo contra el inventario actual en almacenes de materia prima (vista de inventario) para armar la cobertura por renglón, o revisar la cobertura por material agregado. ¿Procedo?

---

| [⬆ top](#fila-23) | `wrun_01M0EVVDBCVV0Y8MAGAAM8B7A8` | **Estado real:** completed · **Duración:** 3 min · **steps:** 13 · **tool calls:** 15 · **tokIn:** 542,792 · **tokOut:** 14,026 · **errores:** 3 (tools: 3 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-24"></a>
## 24. ¿Qué materiales tienen cobertura insuficiente para producir? — 55 s

### Respuesta del agente

### Cobertura de materiales para producir — INCF (periodo fiscal jul-2026)

**Hallazgo:** el cálculo oficial de faltantes de producción no reporta ningún material con cobertura insuficiente en el periodo.

| Reporte | Materiales con cobertura insuficiente |
|---|---|
| Insumos de producción | 0 |
| Materia prima | 0 |

**Nota:** el desglose fino de explosión del plan (cobertura por material: inventario disponible vs. requerido) **no está disponible** en este momento: la corrida del plan no materializó los niveles de inventario (la vista del usuario devuelve requerimientos pero sin existencias calculadas), por lo que el porcentaje de alcance por material no puede validarse aún.

**Siguiente paso:** conviene **reproductir la corrida de planeación** del periodo para que la explosión calcule las existencias por material y confirmar el resultado de cero faltantes. ¿Quieres que lo valide una vez reprocesada?

---

| [⬆ top](#fila-24) | `wrun_01M0EW0PPNVW6B0VF932M94MF5` | **Estado real:** completed · **Duración:** 55 s · **steps:** 7 · **tool calls:** 7 · **tokIn:** 184,204 · **tokOut:** 4,322 · **errores:** 1 (tools: 1 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-25"></a>
## 25. Explosión de materiales del plan: ¿qué insumos de empaque no alcanzan? — 4 min

### Respuesta del agente

**Explosión de materiales — insumos de empaque del plan (MASERP · 2026 P12): ninguno queda descubierto**

Crucé el requerimiento neto de cada insumo de empaque contra el inventario disponible; todos cubren la demanda del plan con margen amplio.

| Insumo de empaque | Requerido (plan) | Disponible | Cobertura |
|---|---|---|---|
| A5640 Etiqueta identificación caja/fardo | 44,195 pz | 641,792 | ✅ Cubre |
| A6781 Caja Beef Tallow Sonos | 21,058 pz | 45,976 | ✅ Cubre |
| A6732 Etiqueta circular naranja frijol bayo | 4,167 pz | 328,587 | ✅ Cubre |
| A5702 Caja Kraft Corina 12 pzas | 2,083 pz | 7,581 | ✅ Cubre |
| A5221 Etiqueta térmica tarimas | 96 pz | 11,092 | ✅ Cubre |
| A6148 Tarima exportación | 77 pz | 241 | ✅ Cubre |
| A2890 Rollo de playo cal. 80 3.5 kg | 59 kg | 2,437 | ✅ Cubre |
| A5364 Cinta transparente 900 m | 6 m | 340 | ✅ Cubre |

No se detecta faltante de empaque en la corrida del plan; el insumo más holgado a cubrir es la caja (2× sobre requerido) y el más ajustado es la tarima de exportación, aún así con ~3× de margen. Siguiente paso opcional: revisar **caja Beef Tallow Sonos** si el programa de la línea Sonos sube, pues es el empaque con menor excedente relativo frente a su demanda.

---

| [⬆ top](#fila-25) | `wrun_01M0EW2H9CR999A1KWS7QBMBTC` | **Estado real:** completed · **Duración:** 4 min · **steps:** 17 · **tool calls:** 27 · **tokIn:** 750,791 · **tokOut:** 18,520 · **errores:** 2 (tools: 2 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-26"></a>
## 26. ¿Qué faltante de concentrado tenemos por familia de materia prima? — 27 s

### Respuesta del agente

**Faltante de Concentrado por Familia — Periodo 7 / 2026**

No hay familias con faltante de concentrado en este periodo: el plan de producción está corrido (22 familias en producción, 11.4M piezas) y ninguna familia de materia prima queda corta contra la disponibilidad.

| Familia | Inventario Requerido | Disponibilidad ICF | Faltante |
|---|---|---|---|
| *(sin registros)* | — | — | 0 kg |

Las familias con mayor uso programado (todas cubiertas): **Frijol Negro** 1,217,678 kg · **Frijol Pinto** 1,112,143 kg · **Lenteja** 636,299 kg · **Maíz Palomero** 498,054 kg.

Siguiente paso: si quieres validar el detalle por artículo (materia prima o insumos), lo desgloso por SKU.

---

| [⬆ top](#fila-26) | `wrun_01M0EW9WX7FT18JG6J5P7JQ2M8` | **Estado real:** completed · **Duración:** 27 s · **steps:** 5 · **tool calls:** 6 · **tokIn:** 123,168 · **tokOut:** 2,095 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-27"></a>
## 27. ¿Qué nos falta comprar de materia prima e insumos este mes? — 54 s

### Respuesta del agente

**No hay faltante de materia prima ni de insumos en el mes en curso** — con la explosión de materiales corrida para el periodo 7/2026, todo el requerimiento está cubierto por existencias, arribos o trámites en curso.

> **Compra requerida — Materia prima e insumos, periodo 7/2026**
> | Rubro | Artículos con faltante | Cantidad a comprar |
> |---|---|---|
> | **Materia prima** | 0 | 0 |
> | **Insumos de producción** | 0 | 0 |

El cálculo se evaluó contra el inventario disponible y lo que ya está en trámite (arribos y requisiciones), y no arrojó ningún artículo por debajo del requerimiento para el periodo.

**Siguiente paso:** si quieres, reviso el plan de producción de las próximas semanas para anticipar si el abasto correría riesgo en el mes siguiente.

---

| [⬆ top](#fila-27) | `wrun_01M0EWAW221B5M4W8CK55TMH4J` | **Estado real:** completed · **Duración:** 54 s · **steps:** 8 · **tool calls:** 10 · **tokIn:** 279,248 · **tokOut:** 3,958 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-28"></a>
## 28. ¿Qué faltante de materia prima no tiene ninguna compra o traspaso en trámite? — 28 s

### Respuesta del agente

**Faltante de materia prima sin compra ni traspaso en trámite — Periodo 7·2026**

2 artículos de **Frijol Media Oreja** requieren compra urgente; **ninguno tiene** traspaso, préstamo/compra ni arribo en trámite (todo en cero y sin estatus). Total: **45,377 bultos**.

| Artículo | Descripción | Cantidad a comprar (bultos) | Acción en trámite |
|---|---|---|---|
| A6290 | FRIJOL MEDIA OREJA ORIGEN NACIONAL BULTO 60 KG 2024 | 22,689 | Sin compra ni traspaso — compra urgente |
| A5594 | FRIJOL MEDIA OREJA ORIGEN NACIONAL 1A BULTO 60 KG 2021 | 22,688 | Sin compra ni traspaso — compra urgente |

Siguiente paso: generar la solicitud de compra para cubrir ambos faltantes. ¿Avanzo con la requisición?

---

| [⬆ top](#fila-28) | `wrun_01M0EWCPETY01EZ671B2DS8DPZ` | **Estado real:** completed · **Duración:** 28 s · **steps:** 4 · **tool calls:** 5 · **tokIn:** 160,893 · **tokOut:** 1,822 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-29"></a>
## 29. Faltante de insumos de la familia BOLSA para cubrir el plan. — 52 s

### Respuesta del agente

**Faltante de insumos familia BOLSA — 2026 · Periodo 8 (plan MASERP)**

No se detecta faltante: la explosión del plan vigente no registra insumos ni familias con desabasto para cubrir el plan.

| Vista | Familias con faltante > 0 |
|---|---|
| Faltante de concentrado (por familia) | 0 |
| Faltante de insumos de producción | 0 |

La familia **BOLSA** no aparece como faltante en este periodo: la disponibilidad cubre el requerimiento del plan. Si lo necesitas por otra ventana (ej. semanas futuras S36 en adelante), avísame y lo desgloso.

---

| [⬆ top](#fila-29) | `wrun_01M0EWDN8GFV1PXQA0MMERH9PP` | **Estado real:** completed · **Duración:** 52 s · **steps:** 6 · **tool calls:** 7 · **tokIn:** 152,861 · **tokOut:** 4,171 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-30"></a>
## 30. ¿Cuál es el faltante de materia prima más grande del plan y qué artículo lo concentra? — 52 s

### Respuesta del agente

No hay faltante de materia prima en el plan vigente — el plan actual está totalmente cubierto.

**Faltante de materia prima — plan julio 2026 (Ejercicio 2026 / Periodo 7)**
| Indicador | Resultado |
|---|---|
| Posiciones de la explosión revisadas | 156 |
| Artículos con faltante mayor a 0 | 0 |
| Cantidad total a comprar | $0.00 / 0 kg |
| Insumos de producción con faltante | 0 |

La explosión de materiales del usuario de planeación (MASERP) no registra ningún artículo de materia prima con faltante positivo, por lo que no hay un "faltante más grande" ni un artículo que lo concentre en este plan.

**Siguiente paso:** si esperabas un faltante, puedo verificar si la explosión MRP está actualizada o revisar un periodo distinto (por ejemplo, agosto o el cierre de julio) para confirmar si esa posición quedó cubierta por un arribo o compra nueva.

---

| [⬆ top](#fila-30) | `wrun_01M0EWFGSAXMD34CQD6ZKA7SMF` | **Estado real:** completed · **Duración:** 52 s · **steps:** 8 · **tool calls:** 12 · **tokIn:** 237,986 · **tokOut:** 3,370 · **errores:** 1 (tools: 1 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-31"></a>
## 31. ¿Cuál es el cumplimiento plan vs. real de producción de la semana 31? — 3 min

### Respuesta del agente

**Cumplimiento de producción — periodo que contiene la semana 31 (2026, mes 7) — por centro de trabajo**

| Centro de Trabajo | Programado Kg. | Programado Pzs | Producido Kg | Producido Pzs | Cumplimiento |
|---|---|---|---|---|---|
| **PROCESADOS** | 587,943.98 | 5,016,011 | 304,255.2 | 2,698,210 | 53.79% |
| ENVCF | 1,431,547.91 | 2,938,990 | 779,921.4 | 1,566,666 | 53.31% |
| CRIBACF2 | 2,367,662.8 | 2,592,010 | 1,560,911 | 1,706,790 | 65.85% |
| JAMAICA | 118,270 | 118,270 | 79,920 | 79,920 | 67.57% |
| null | 0 | 707,329 | 0 | 0 | 0% |
| PAQUETERIA | 5,417.62 | 69,196 | 7,755.95 | 98,777 | 142.75% |
| **TOTAL** | **4,510,842.31** | **11,441,806** | **2,732,763.55** | **6,150,363** | **53.75%** |

**Siguiente paso:** los centros que concentran la desviación son **PROCESADOS** y **ENVCF** (~53% de avance, más de 1.4M de piezas sin fabricar); **PAQUETERIA** sobreproduce (142%). ¿Reviso el desglose por artículo en alguno de estos centros?

---

| [⬆ top](#fila-31) | `wrun_01M0EWH9G3J84SV1PH5F3G15XG` | **Estado real:** completed · **Duración:** 3 min · **steps:** 10 · **tool calls:** 16 · **tokIn:** 423,493 · **tokOut:** 14,968 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-32"></a>
## 32. ¿Qué tan bien estamos cumpliendo el plan de producción este periodo? — 1 min

### Respuesta del agente

**Cumplimiento del plan de producción — Periodo 8 (ago 2026) · MASERP**

| Centro de Trabajo | Programado Kg | Programado Piezas | Producido Kg | Producido Pzas | Cumplimiento |
|---|---|---|---|---|---|
| CRIBACF2 | 2,367,662.80 | 2,592,010 | 0 | 0 | sin dato |
| ENVCF | 1,431,547.91 | 2,938,990 | 0 | 0 | sin dato |
| PROCESADOS | 587,943.98 | 5,016,011 | 0 | 0 | sin dato |
| JAMAICA | 118,270.00 | 118,270 | 0 | 0 | sin dato |
| PAQUETERIA | 5,417.62 | 69,196 | 0 | 0 | sin dato |
| **TOTAL** | **4,510,842.31** | **11,441,806** | **0** | **0** | sin dato |

El plan de producción del periodo está poblado (≈**11.44 millones de piezas** / **4.51 millones de kg** programados), pero **no hay producción real registrada** en ese rango de fechas en la fuente: el reporte de cumplimiento devuelve 0 piezas producidas en todos los centros, por lo que el % de cumplimiento no puede calcularse todavía.

Siguiente paso: verificar si la producción de la semana ya fue capturada/afectada en el ERP; hasta entonces el indicador se reporta sin dato, no como 0 producido definitivo.

---

| [⬆ top](#fila-32) | `wrun_01M0EWQ067735TB3WP0PXEAD8Z` | **Estado real:** completed · **Duración:** 1 min · **steps:** 13 · **tool calls:** 19 · **tokIn:** 394,647 · **tokOut:** 5,325 · **errores:** 2 (tools: 2 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-33"></a>
## 33. Compara el forecast de ventas contra las ventas reales del periodo. — 2 min

### Respuesta del agente

**Comparativa — Forecast (plan de venta) vs Venta real del periodo (Agosto, 2026-08)**

| Indicador | Valor |
|---|---|
| **Forecast (plan)** · ventana activa S32–S35 | **10,534,326** pz |
| **Venta real embarcada** (agosto) | 59,395,805 |
| Rechazo (agosto) | 1,197,367 |
| **Venta real neta** | **58,198,437** |

El forecast total del periodo asciende a **~10.5 M de piezas programadas en venta**; la venta real neta embarcada del mes es **58.2 M de unidades**. Cumplimiento ≈ **552%** (la venta embarcada excede ampliamente la meta de forecast de la ventana; el excedente se concentra en los artículos de **PROCESADOS** y **ENVCF**).

**Nota de unidad:** el forecast está en piezas programadas y la venta embarcada en unidades del módulo FC; no son directamente homogéneas, por lo que el % es orientativo.

**Siguiente paso:** ¿quieres el desglose por **centro de trabajo** (cumplimiento, participación y días de cobertura) o por **artículo/almacén** para la misma ventana?

---

| [⬆ top](#fila-33) | `wrun_01M0EWS6Z37NTDN98K87KDW6RK` | **Estado real:** completed · **Duración:** 2 min · **steps:** 9 · **tool calls:** 17 · **tokIn:** 278,701 · **tokOut:** 13,133 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-34"></a>
## 34. ¿Cuál es el cumplimiento de producción por centro de trabajo de la semana? — 38 s

### Respuesta del agente

**Cumplimiento de producción por centro de trabajo — periodo 8 (2026)**

La corrida del plan muestra el programado por centro, pero no hay producción real registrada en la fuente para este periodo: el producido es 0 en todos los centros, por lo que el % de cumplimiento no se puede calcular aún.

| Centro de Trabajo | Programado Kg | Programado Piezas | Producido Kg | Producido Piezas | Cumplimiento |
|---|---|---|---|---|---|
| (sin nombre) | 0 | 707,329 | 0 | 0 | — |
| CRIBACF2 | 2,367,662.80 | 2,592,010 | 0 | 0 | — |
| ENTEROS | 0 | 0 | 0 | 0 | 0% |
| ENVCF | 1,431,547.91 | 2,938,990.39 | 0 | 0 | — |
| JAMAICA | 118,270.00 | 118,270 | 0 | 0 | — |
| PAQUETERIA | 5,417.62 | 69,196 | 0 | 0 | — |
| PROCESADOS | 587,943.98 | 5,016,010.80 | 0 | 0 | — |
| **TOTAL** | **4,510,842.31** | **11,441,806.19** | **0** | **0** | **—** |

**Siguiente paso:** revisar si ya se registraron órdenes de producción (`Prod`) del periodo en el ERP; con producción real capturada se calcularían los porcentajes por centro.

---

| [⬆ top](#fila-34) | `wrun_01M0EWXPA2WX6VQE36Q3F5MH1B` | **Estado real:** completed · **Duración:** 38 s · **steps:** 4 · **tool calls:** 4 · **tokIn:** 102,995 · **tokOut:** 1,878 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-35"></a>
## 35. Indicadores del periodo: programado vs producido y cumplimiento por familia. — 2 min

### Respuesta del agente

**Indicadores del periodo 8 (ago 2026) — programado vs producido por familia**
El plan programado es de ~11.44 M pzas (4.51 M kg), pero en el periodo **no hay producción real registrada: todo el producido está en 0**, por lo que el cumplimiento efectivo es 0% para todas las familias. No hay correlación con causa: es una observación de que el avance de producción para el periodo aún no aparece capturado en la corrida.

| Familia | Programado (pzas) | Programado (kg) | Producido (pzas) | Cumplimiento |
|---|---|---:|---:|---:|---:|
| **Mitades claras** | 2,486,948 | 292,136 | 0 | 0% |
| Mitades Negras | 2,039,282 | 245,714 | 0 | 0% |
| **Frijol Pinto** | 1,414,708 | 1,112,143 | 0 | 0% |
| Frijol Negro | 1,359,138 | 1,217,678 | 0 | 0% |
| Lenteja | 1,027,147 | 636,299 | 0 | 0% |
| Maíz Palomero | 1,001,304 | 498,054 | 0 | 0% |
| Sin familia asignada | 718,368 | 1,104 | 0 | 0% |
| Avena | 297,291 | 63,668 | 0 | 0% |
| Alverjón | 343,520 | 0 | 0 | 0% |
| Garbanza | 211,698 | 211,698 | 0 | 0% |
| Jamaica | 121,395 | 118,583 | 0 | 0% |
| Frijol Media Oreja | 75,700 | 68,130 | 0 | 0% |
| Mitades peruanas | 149,824 | 17,979 | 0 | 0% |
| Frijol Peruano | 14,678 | 13,210 | 0 | 0% |
| Arándano | 11,437 | 1,144 | 0 | 0% |
| Alpiste Simple | 1,410 | 1,410 | 0 | 0% |
| Ciruela | 3,636 | 436 | 0 | 0% |
| Nuez | 14,863 | 743 | 0 | 0% |
| Almendra | 10,432 | 522 | 0 | 0% |
| Canela | 6,199 | 310 | 0 | 0% |
| Haba | 260 | 130 | 0 | 0% |
| Entero Negro | 57,045 | 6,845 | 0 | 0% |
| Revoltura c/gragea | 3,060 | 3,060 | 0 | 0% |
| **TOTAL** | **11,441,806** | **4,510,842** | **0** | **0%** |

**Siguiente paso:** si esperabas producción en curso, verifica si las órdenes de producción del periodo fueron afectadas/contadas; el plan está cargado pero no ha visto despacho.

---

| [⬆ top](#fila-35) | `wrun_01M0EWZ192B8V26H16ERR4J5SX` | **Estado real:** completed · **Duración:** 2 min · **steps:** 10 · **tool calls:** 11 · **tokIn:** 329,733 · **tokOut:** 9,043 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-36"></a>
## 36. ¿Qué arribos vienen en las próximas 12 semanas y qué cobertura tenemos por familia? — 43 s

### Respuesta del agente

> **Arribos 12 semanas y cobertura por familia — Materia Prima (plan Forecast CF)**
> **Hallazgo:** No hay **mercancía en tránsito** (arribos confirmados = 0 en toda la ventana). Toda la reposición depende de **embarques sugeridos no confirmados** que recién aterrizan **de la semana 6 en adelante**, por lo que **~14 familias entran a inventario negativo en las semanas 1–7** antes de que lleguen.

**Familias en riesgo (cobertura negativa antes del arribo proyectado):**

| Familia | Inv. Inicial (S1) | Cobertura S1 (sem) | Peor semana | Lead time (sem) |
|---|---|---|---|---|
| **Avena** | 54,700 | -0.03 | -8.8 (S7) | 7 |
| **Frijol Negro** | 4,977 | -0.99 | -6.2 (S7) | 7 |
| **Frijol Pinto** | 172,416 | -0.50 | -5.7 (S7) | 7 |
| **Maíz Palomero** | 238,003 | 1.39 | -0.4 (S7) | 7 |
| Haba | 2,426 | -0.70 | -12.2 (S2) | 5 |
| Almendra | 14 | -0.96 | -6.4 (S5) | 5 |
| Arándano | 21 | -0.97 | -5.7 (S5) | 8 |
| **Alpiste Simple** | 986 | -0.21 | -4.2 (S5) | 7 |
| Chile Ancho Seco | 0 | -1.00 | -1.0 (S1) | 3 |
| Chile Árbol | 0 | -1.00 | -1.0 (S1) | 8 |
| Chile Guajillo | 0 | -1.00 | -1.0 (S1) | 3 |
| Chile Pasilla | 0 | -1.00 | -1.0 (S1) | 3 |
| Frijol Media Oreja | 174 | -0.98 | -1.7 (S2) | 2 |
| Jamaica | 7,548 | -0.54 | -1.9 (S2) | 8 |

**Familias cubiertas durante toda la ventana (mínimas positivas):** Alvejón, Canela, Ciruela, Entero Negro/Rojo, Frijol Peruano (6.1 sem), Garbanza (16.5), Lenteja (1.9), Mitades Claras (2.9), Mitades Negras (10.8), Mitades Peruanas (cubre en S4), Nuez (4.8), Revoltura c/gragea (3.3), Soya Natural/Res, Uva Pasa (repite negativo en S1), Chícharo, Chícharo Mitad.

**Lectura de negocio:** el desabasto no es de faltante estructural sino de **temporización** — los embarques sugeridos se programan para llegar a partir de S6/S8; las semanas previas se sostienen con inventario que ya es insuficiente en los granos voluminosos.

¿Quieres que abra el detalle de una familia específica (ej. **Avena** o **Frijol Negro**) con las 12 semanas completas — Arribos → Consumo → Inventario Final → Cobertura — o que revise los arribos pendientes de compra reales?

---

| [⬆ top](#fila-36) | `wrun_01M0EX2BSR7P0P7M10PCXY2PMJ` | **Estado real:** completed · **Duración:** 43 s · **steps:** 3 · **tool calls:** 3 · **tokIn:** 111,988 · **tokOut:** 4,389 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-37"></a>
## 37. ¿Cuándo se debe generar el embarque de la familia Frijol Negro según la regla de mínimo y máximo? — 1 min

### Respuesta del agente

**Embarque Frijol Negro — regla de mínimo/máximo**

**Hallazgo:** hay que generar el embarque **ahora mismo (semana 1, 8–14 dic)**: el inventario proyectado ya cae por debajo del mínimo de **900,000 piezas** desde la primera semana (cierra en −596,298), así que el sistema sugiere embarques semanales de la S1 a la S5 dimensionados para reponer hasta el máximo de **3,000,000 piezas**. Con tiempo de entrega de **7 semanas**, el primer embarque llegaría alrededor de la **semana 8 (26 ene – 1 feb 2026)**.

| Frijol Negro | S1 (8–14 dic) | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 | S10 | S11 | S12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Inventario inicial | 4,977 | | | | | | | | | | | |
| Forecast | 601,275 | 602,250 | 557,250 | 531,000 | 621,500 | 535,500 | 621,500 | 0 | 601,275 | 428,325 | 440,025 | 395,550 |
| Mercancía en tránsito (arribos) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Solicitud de embarque sugerido | **3,596,298** | **4,198,548** | **4,668,222** | **5,098,146** | **5,717,606** | | | | | | | |
| Arribos proyectados no confirmados | | | | | | | | 3,596,298 | 4,198,548 | 4,668,222 | 5,098,146 | 5,717,606 |
| Inventario final | **−596,298** | −1,198,548 | −1,668,222 | −2,098,146 | −2,717,606 | −3,246,217 | −3,860,828 | −264,530 | 3,332,743 | 7,572,640 | 12,230,761 | 17,552,817 |
| Semanas de cobertura | −0.99 | −1.99 | −2.99 | −3.95 | −4.37 | −6.06 | −6.21 | — | 5.54 | 17.68 | 27.80 | 44.38 |
| Lead time (semanas) | 7 | 7 | 7 | 7 | 7 | 7 | 7 | 7 | 7 | 7 | 7 | 7 |

**Siguiente paso:** dado que la cobertura ya es negativa desde la semana de arranque, el embarque debe surtirse de inmediato para evitar desabasto; el primer embarque de 3,596,298 piezas restaura el inventario hacia el máximo en la semana 8.

---

| [⬆ top](#fila-37) | `wrun_01M0EX3SD9GMJ2B06QHBB9QZJ3` | **Estado real:** completed · **Duración:** 1 min · **steps:** 7 · **tool calls:** 7 · **tokIn:** 291,169 · **tokOut:** 6,978 · **errores:** 1 (tools: 1 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-38"></a>
## 38. ¿Qué familias tienen cobertura por debajo de su tiempo de entrega? — 34 s

### Respuesta del agente

**Hallazgo:** 22 familias tienen cobertura por debajo de su tiempo de entrega — no alcanzan a cubrir el plazo de reposición con el inventario actual. De ellas, 16 ya operan en cobertura **negativa o nula** (riesgo de desabasto inmediato).

**Datos — familias con cobertura < lead time** (cobertura = semanas actuales, lead time = semanas):

**A) Sin cobertura inmediata (≤ 0 semanas):**
| Familia | Cobertura | Lead time |
|---|---|---|
| ALMENDRA | -1 sem | 5 |
| Alpiste Simple | 0 sem | 7 |
| ARANDANO | -1 sem | 8 |
| Avena | 0 sem | 7 |
| CHICHARO MITAD | -1 sem | 7 |
| Chile Ancho Seco | -1 sem | 3 |
| CHILE ARBOL | -1 sem | 8 |
| Chile Guajillo | -1 sem | 3 |
| Chile pasilla | -1 sem | 3 |
| CHILE ARBOL | -1 sem | 8 |
| Frijol Media Oreja | -1 sem | 2 |
| Frijol Negro | -1 sem | 7 |
| Frijol Pinto | -1 sem | 7 |
| Haba | -1 sem | 5 |
| Jamaica | -1 sem | 8 |
| Mitades peruanas | -1 sem | 2 |
| Uva pasa | 0 sem | 5 |

**B) Cobertura positiva pero menor al lead time:**
| Familia | Cobertura | Lead time |
|---|---|---|
| CANELA | 2 sem | 8 |
| Ciruela | 1 sem | 5 |
| Lenteja | 2 sem | 7 |
| Maíz Palomero | 1 sem | 7 |
| Mitades claras | 3 sem | 7 |
| NUEZ | 5 sem | 8 |

**Cobertura SÍ suficiente:** Frijol Peruano, Garbanza, Mitades Negras, Revoltura c/gragea, Soya de Res y Soya Natural (cubren o exceden su lead time).

**Siguiente paso:** el sistema ya generó orden de embarque sugerido para la mayoría de estas (Avena, Frijol Negro, Frijol Pinto, Maíz Palomero, Lenteja, Jamaica…). ¿Reviso el monto de embarque sugerido por familia para priorizar las de mayor faltante?

---

| [⬆ top](#fila-38) | `wrun_01M0EX6AXTY4NGRK502NTN2G0A` | **Estado real:** completed · **Duración:** 34 s · **steps:** 3 · **tool calls:** 4 · **tokIn:** 99,513 · **tokOut:** 3,471 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-39"></a>
## 39. Dame los arribos proyectados de la familia Frijol Negro por semana. — 35 s

### Respuesta del agente

**Arribos proyectados — Familia Frijol Negro (12 semanas)**

| Semana | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 | S10 | S11 | S12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Arribos** | 1,910,325 | 1,938,300 | 1,623,300 | 1,588,050 | 1,981,550 | 1,619,550 | 1,981,550 | 0 | 1,685,325 | 1,307,175 | 1,452,075 | 1,163,790 |

Piezas proyectadas de recepción por semana. Los picos están en **S5 y S7 (1,981,550 pz)**; la semana **S8 no presenta arribos programados**. La familia agrupa 9 artículos. Puedo desglosarlo por artículo o añadir las fechas reales de cada semana si lo requieres.

---

| [⬆ top](#fila-39) | `wrun_01M0EX7HDWMM2YEQKV9BWA19H8` | **Estado real:** completed · **Duración:** 35 s · **steps:** 6 · **tool calls:** 6 · **tokIn:** 150,055 · **tokOut:** 2,955 · **errores:** 1 (tools: 1 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-40"></a>
## 40. ¿Qué familia tiene el mayor volumen de arribos en las próximas 12 semanas? — 2 min

### Respuesta del agente

**La familia con mayor volumen de arribos a 12 semanas es Frijol Negro**, con 18,250,990 piezas proyectadas — más del doble que la segunda.

**Arribos proyectados a 12 semanas — top familias**
| Familia | Total 12 semanas (piezas) |
|---|---|
| **Frijol Negro** | 18,250,990 |
| Frijol Pinto | 6,751,345 |
| Mitades claras | 767,665 |
| Mitades Negras | 669,127 |
| Frijol Media Oreja | 425,250 |
| Jamaica | 132,174 |

**Desglose semanal — Frijol Negro**
| S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 | S10 | S11 | S12 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1,910,325 | 1,938,300 | 1,623,300 | 1,588,050 | 1,981,550 | 1,619,550 | 1,981,550 | 0 | 1,685,325 | 1,307,175 | 1,452,075 | 1,163,790 |

La concentración es fuerte: Frijol Negro y Frijol Pinto juntos suman ~25 millones de piezas, casi todo el volumen de materias primas proyectado. Siguiente paso: revisar si la cobertura de esas dos familias alcanza para sostener el programa sin generar embarques de reorden.

---

| [⬆ top](#fila-40) | `wrun_01M0EX8Q2733GSH4K9NNN43A9H` | **Estado real:** completed · **Duración:** 2 min · **steps:** 3 · **tool calls:** 2 · **tokIn:** 84,802 · **tokOut:** 17,417 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-41"></a>
## 41. ¿Cuál es la capacidad y ocupación de los centros de trabajo esta semana? — 7 min

### Respuesta del agente

He reunido la capacidad real por centro y la carga de la semana en curso (S34, 17–23 ago, ejercicio 2026/8).

**Capacidad y ocupación de centros de trabajo — semana S34 (2026/8)**
| Centro | Capacidad (pzas) | Carga S34 (pzas) | Ocupación |
|---|---|---|---|
| PROCESADOS | 4,243,750 | 888,146 | 20.9% |
| CRIBACF2 | 3,352,073 | 478,360 | 14.3% |
| ENVCF | 3,458,208 | 472,553 | 13.7% |
| PAQUETERIA | 190,080 | 21,983 | 11.6% |
| JAMAICA | 117,001 | 11,070 | 9.5% |
| CRIBACF | 1,359,936 | 0 | 0% |
| ENTEROS | 321,399 | 0 | 0% |
| MAQRG | 800,000 | 0 | 0% |

La corrida activa deja **todos los centros entre 0% y ~21% de ocupación**; el más cargado es PROCESADOS (21%). CAPACIDADES de MINICRIBA, NOCHCRIBA1 y NOCHCRIBA2 no se reportan en la fuente actual (dato no disponible). Ningún centro está sobrecargado esta semana.

**Siguiente paso:** si quieres, te desgloso qué artículos/clientes concentran la carga de PROCESADOS o CRIBACF2.

---

| [⬆ top](#fila-41) | `wrun_01M0EXCK2PT164X9P4C8XCMNKF` | **Estado real:** completed · **Duración:** 7 min · **steps:** 25 · **tool calls:** 44 · **tokIn:** 1,214,541 · **tokOut:** 26,472 · **errores:** 4 (tools: 4 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-42"></a>
## 42. ¿Cuál es la capacidad del centro de trabajo CRIBACF? — 9 s

### Respuesta del agente

**Capacidad del centro CRIBACF — C. FRESCO**

| Centro | Capacidad (horas) | Capacidad (piezas) |
|---|---|---|
| **CRIBACF** | 629.60 hrs | 1,359,936 pz |

Toma de datos: capacidad efectiva del centro en el período actual. **Siguiente paso:** si necesitas el balance de carga (artículos asignados y % de ocupación) de CRIBACF, lo reviso.

---

| [⬆ top](#fila-42) | `wrun_01M0EXS2WE24S5NSBAJ3YHXFB6` | **Estado real:** completed · **Duración:** 9 s · **steps:** 2 · **tool calls:** 2 · **tokIn:** 48,074 · **tokOut:** 335 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-43"></a>
## 43. ¿Qué estaciones de trabajo tiene el centro CRIBACF y cuál es su capacidad? — 22 s

### Respuesta del agente

**Centro CRIBACF (Cribado en Campo Fresco) — estaciones y capacidad**

El centro cuenta con **4 estaciones de trabajo**, todas activas (ALTA), líneas de envasado Platinum Pack con **40 bolsas/min** de velocidad base.

| Estación | Descripción | Bolsas/min | Limpieza (min) | Comida (min) |
|---|---|---|---|---|
| 12 | TECF39 Platinum Pack BRN 567-05-18 | 40 | 60 | 45 |
| 13 | TECF62 Platinum Pack BSF 582-08-18 | 40 | 60 | 45 |
| 14 | TECF40 Platinum Pack BRR 571-05-18 | 40 | 60 | 45 |
| 15 | TECF41 Platinum Pack BRP 569-05-18 | 40 | 60 | 45 |

**Capacidad del centro (por periodo):**
- **629.6 horas** de producción
- **1,359,936 piezas**

Configuración del centro: **12 hrs/día**, eficiencia **90%**, ~**16-17 días hábiles**.

Nota: la **capacidad por estación individual** (ton/hr o piezas/día) no está configurada en el catálogo `EstacionTFC` (viene vacía); la capacidad reportada es a nivel de centro completo. El siguiente paso útil: si necesitas el techo por línea, se puede derivar del ritmo de 40 bolsas/min ajustado por eficiencia.

---

| [⬆ top](#fila-43) | `wrun_01M0EXSEWZAHFJ4M5C2N9FKDVC` | **Estado real:** completed · **Duración:** 22 s · **steps:** 3 · **tool calls:** 4 · **tokIn:** 70,099 · **tokOut:** 1,214 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-44"></a>
## 44. ¿Qué centros de trabajo están sobrecargados esta semana? — 2 min

### Respuesta del agente

**Centro sobrecargado — solo **CRIBACF** supera su capacidad (108% de ocupación).**

El resto de los centros trabaja por debajo del 77% o sin carga relevante.

| Centro de Trabajo | Programado (pz) | Capacidad (hrs) | Ocupación |
|---|---|---|---|
| **CRIBACF** | 1,466,132 | 629.6 | **107.8%** 🔴 |
| CRIBACF2 | 2,578,588 | 1,240.1 | 76.9% |
| PROCESADOS | 3,247,685 | 505.2 | 76.5% |
| JAMAICA | 62,240 | 174.1 | 53.2% |
| ENVCF | 1,606,236 | 1,801.2 | 46.4% |
| ENTEROS | 36,720 | 266.5 | 11.4% |
| PAQUETERIA | 16,218 | 132.0 | 8.5% |

**CRIBACF** requiere 678.8 hrs para su programa contra 629.6 hrs de capacidad — un faltante de ~106,196 pz. Es el único punto crítico de la semana; los demás conservan holgura (el centro más cercano va al 77%).

**Siguiente paso:** revisar en el balanceo de carga qué artículos de **CRIBACF** pueden moverse a **CRIBACF2** (76.9%, aún con 773,485 pz libres).

---

| [⬆ top](#fila-44) | `wrun_01M0F00D245E7720JW5Y44Z8QX` | **Estado real:** error · **Duración:** 2 min · **steps:** 8 · **tool calls:** 13 · **tokIn:** 236,026 · **tokOut:** 6,709 · **errores:** 3 (tools: 2 · skills: 1 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-45"></a>
## 45. ¿Cuál es la capacidad real del centro PROCESADOS y su carga asignada? — 50 s

### Respuesta del agente

**Capacidad real de PROCESADOS y su carga asignada**

Capacidad real del centro (mes): **505.21 hrs · 4,243,750 pzas** — 25 días hábiles, 24 h/día, 100% de eficiencia.

Carga asignada (programa de producción por producir del último balanceo): **3,253,685 piezas** en 23 artículos de frijol refrito → **ocupación ≈ 77%** de la capacidad en piezas (holgura de ~1M de piezas).

**Balance de carga — PROCESADOS (por artículo)**

| Prioridad | Artículo | Descripción | Cliente | Programa | Venta | Producir | Familia |
|---|---|---|---|---|---|---|---|
| 21 | A6508 | FRIJOL PERUANO REFRITO C/SANTO C24 430G | TIENDAS TRES B | REFRITO TRES B | 100,000 | 0 | Mitades peruanas |
| 22 | A6506 | FRIJOL BAYO ENTERO C/SANTO C22 430G | TIENDAS TRES B | REFRITO TRE B | 100,000 | 66,930 | Frijol Pinto |
| 23 | A6501 | FRIJOL BAYO REFRITO SIN GRASA BONAMARK | CADENA OXXO | REFRITO BONAMARK | 27,000 | 7,402 | Mitades claras |
| 25 | A6490 | FRIJOL BAYO REFRITO DURANGO C22 500G | NSAMBLE & LOGÍSTICA | DELTA | 46,000 | 41,996 | Mitades claras |
| 42 | A6379 | FRIJOL PERUANO REFRITO CHEDRAUI C24 400G | TIENDAS CHEDRAUI | REFRITO CHEDRAUI | 30,000 | 0 | Mitades peruanas |
| 58 | A6323 | FRIJOL NEGRO REFRITO C/SANTO C24 430G | TIENDAS TRES B | REFRITO TRES B | 750,000 | 529,000 | Mitades Negras |
| 59 | A6321 | FRIJOL BAYO REFRITO C/SANTO V3 C24 430G | TIENDAS TRES B | REFRITO TRES B | 900,000 | 1,066,265 | Mitades claras |
| 68 | A6124 | FRIJOL NEGRO REFRITO CHEDRAUI V2 C24 400G | TIENDAS CHEDRAUI | CHEDRAUI REFRITO | 190,000 | 260,928 | Mitades Negras |
| 69 | A6122 | FRIJOL BAYO REFRITO CHEDRAUI V2 C24 400G | TIENDAS CHEDRAUI | CHEDRAUI REFRITO | 130,000 | 99,232 | Mitades claras |
| 70 | A6113 | FRIJOL PERUANO REFRITO BONAMARK V2 C24 | CADENA OXXO | TIENDAS BARA | 75,000 | 45,920 | Mitades peruanas |
| 71 | A6111 | FRIJOL BAYO REFRITO CORINA V2 C12 430G | ING. ALIMENTICIOS OCC. | CORINA | 20,000 | 0 | Mitades claras |
| 72 | A6109 | FRIJOL BAYO REFRITO BONAMARK V2 C24 | CADENA OXXO | TIENDAS BARA | 75,000 | 0 | Mitades claras |
| 84 | A6007 | FRIJOL NEGRO REFRITO CORINA V2 C12 430G | ING. ALIMENTICIOS OCC. | CORINA | 20,000 | 4,108 | Mitades Negras |
| 85 | A6005 | FRIJOL NEGRO REFRITO GREAT VALUE V2 | NUEVA WAL MART | REFRITO GV | 160,000 | 196,526 | Mitades Negras |
| 86 | A6003 | FRIJOL BAYO REFRITO GREAT VALUE V2 | NUEVA WAL MART | REFRITO GV | 220,000 | 259,280 | Mitades claras |
| 87 | A5988 | FRIJOL BAYO REFRITO V2 VALLEY FOODS | TIENDAS SORIANA | REFRITO SORIANA | 25,000 | 18,398 | Mitades claras |
| 88 | A5986 | FRIJOL NEGRO REFRITO V2 VALLEY FOODS | TIENDAS SORIANA | REFRITO SORIANA | 25,000 | 12,560 | Mitades Negras |
| 89 | A5982 | FRIJOL BAYO REFRITO V2 BEST CHOICE | TIENDAS SUPER PRECIO | REFRITO BEST | 182,500 | 241,598 | Mitades claras |
| 92 | A5980 | FRIJOL NEGRO REFRITO V2 BEST CHOICE | TIENDAS SUPER PRECIO | REFRITO BEST | 280,000 | 334,986 | Mitades Negras |
| 105 | A5761 | FRIJOL BAYO REFRITO SELEC. CAMPO C24 | MÁS BODEGA | SEVEN ELEVEN | 7,800 | 0 | Mitades claras |
| 106 | A5758 | FRIJOL NEGRO REFRITO SELEC. CAMPO C24 | MÁS BODEGA | SEVEN ELEVEN | 7,800 | 1,512 | Mitades Negras |
| 113 | A5207 | FRIJOL NEGRO REFRITO PUEBLO RICO (AMARILLA) | MACONDGMX | REFRITO DOLLAR | 9,360 | 0 | Mitades Negras |
| 114 | A5204 | FRIJOL BAYO REFRITO PUEBLO RICO C24 | MACONDGMX | REFRITO DOLLAR | 69,460 | 61,044 | Mitades claras |

Nota: la carga corresponde al último balanceo disponible (ejercicio 2025); el plan vigente (2026 · P8) aún no registra balanceo para este centro.

---

| [⬆ top](#fila-45) | `wrun_01M0EYM5DW6RKP0HXT9AQBWPH1` | **Estado real:** completed · **Duración:** 50 s · **steps:** 6 · **tool calls:** 8 · **tokIn:** 158,032 · **tokOut:** 4,455 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-46"></a>
## 46. ¿Qué tenemos en existencias del almacén C. FRESCO, ordenado por disponible? — 24 s

### Respuesta del agente

**Existencias — C. FRESCO (Producto Terminado), ordenado por disponible**

El inventario más alto lo concentra el chícharo, el frijol refrito y el maíz palomero.

| Artículo | Descripción | Disponible |
|---|---|---|
| A6911 | **CHICHARO MITAD WFP EUROPA BULTO 50 KG** | 192,400 kg |
| A6005 | FRIJOL NEGRO REFRITO GREAT VALUE V2 C/24 PZAS 430 GR | 161,850 Pz |
| A6508 | FRIJOL PERUANO REFRITO CAMPO SANTO C/24 PZAS 430 GR | 120,826 Pz |
| A5207 | FRIJOL NEGRO REFRITO PUEBLO RICO C/24 PZAS 430 GR | 74,472 Pz |
| A6387 | MAIZ PALOMERO BUENA TIERRA FARDO 20 PZAS 500 GR | 65,100 Pz |
| A6113 | FRIJOL PERUANO REFRITO BONAMARK V2 C/24 PZAS 430 GR | 63,867 Pz |
| A6003 | FRIJOL BAYO REFRITO GREAT VALUE V2 C/24 PZAS 430 GR | 61,680 Pz |
| A6529 | FRIJOL NEGRO ENTERO EN SALMUERA SOMOS C/6 PZ 283 GR | 52,956 Pz |
| A6837 | FRIJOL NEGRO RANCHO DON SILVESTRE FARDO 10 PZAS 900 GR | 51,570 Pz |
| A6817 | FRIJOL PINTO CAMPO SANTO FARDO 10 PZAS 900 GR | 51,420 Pz |
| A2341 | AVENA HOJUELA CAMPO FRESCO FARDO 40 PZAS 250 GR | 49,880 Pz |
| A2598 | FRIJOL PINTO SALTILLO CRIB. 1A AURRERA FARDO 10 PZAS 900 GR | 49,720 Pz |
| S3847 | JAMAICA FLOR CAMPO FRESCO CAJA C/10 PZAS 1 KG | 48,900 Pz |
| A6379 | FRIJOL PERUANO REFRITO SELECTO BRAND C/24 PZAS 400 GR | 47,325 Pz |
| A2501 | FRIJOL NEGRO BOLA CRIB. AURRERA FARDO 10 PZAS 900 GR | 40,800 Pz |
| A6109 | FRIJOL BAYO REFRITO BONAMARK V2 C/24 PZAS 430 GR | 40,411 Pz |
| A5204 | FRIJOL BAYO REFRITO PUEBLO RICO C/24 PZAS 430 GR | 39,877 Pz |

El listado continúa con ~120 artículos más con saldo; la mayoría del resto presenta existencias bajas o en cero. Puedo ampliarte el siguiente tramo o filtrar por familia (frijoles, chícharo, avena) si lo requieres.

---

| [⬆ top](#fila-46) | `wrun_01M0EYNZJDX1QGJGCD60M2JFMF` | **Estado real:** completed · **Duración:** 24 s · **steps:** 5 · **tool calls:** 6 · **tokIn:** 165,778 · **tokOut:** 1,745 · **errores:** 1 (tools: 1 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-47"></a>
## 47. ¿Cuánto tenemos de existencias de frijol negro en el almacén C. FRESCO? — 60 s

### Respuesta del agente

**Existencias de Frijol Negro — C. FRESCO**

En el almacén **C. FRESCO** el único frijol negro con inventario es el presentado a continuación (los demás frijol negro de ese almacén están en 0):

| Artículo | Descripción | Unidad | Disponible |
|---|---|---|---|
| A1136 | FRIJOL NEGRO BOLA CRIB. 1A CAMPO FRESCO 10 PZAS DE 1 KG | Pz | 1,035 piezas |

Los otros frijol negro del almacén (fardo de 500 g y bulto americano) reportan **0 piezas** disponibles.

---

| [⬆ top](#fila-47) | `wrun_01M0EYPY1S7YJS890ZZGG33C1F` | **Estado real:** completed · **Duración:** 60 s · **steps:** 6 · **tool calls:** 5 · **tokIn:** 461,339 · **tokOut:** 3,660 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-48"></a>
## 48. ¿Cuál es el presupuesto VACA de la semana? — 1 min

### Respuesta del agente

El presupuesto VACA se guarda por semana/columna semanal (S1–S12 de venta, P1–P12 de producir) y necesito saber a cuál te refieres con "la semana" para darte la cifra exacta.

---

| [⬆ top](#fila-48) | `wrun_01M0EYRXS6FETDVVAVYPD7QNH2` | **Estado real:** completed · **Duración:** 1 min · **steps:** 7 · **tool calls:** 7 · **tokIn:** 205,621 · **tokOut:** 5,144 · **errores:** 1 (tools: 1 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-49"></a>
## 49. ¿Qué artículos de la familia Frijol Negro tienen stock por debajo de su mínimo? — 2 min

### Respuesta del agente

**Frijol Negro — stock vs. mínimo**

Los 7 artículos de la familia **Frijol Negro** en el sistema de planeación son producto terminado y **ninguno tiene configurado un stock mínimo** en la fuente de disponibilidad actual: la configuración de stock de seguridad (mín/máx) solo cubre materia prima, y no está publicado el parámetro de planeación por almacén para producto terminado. Por eso no es posible determinar cuáles caen por debajo de su mínimo con los datos disponibles (dato no disponible para el umbral).

Como referencia, el inventario disponible (todas las ubicaciones) de cada uno:

| Artículo | Descripción | Disponible |
|---|---|---|
| **A2501** | FRIJOL NEGRO BOLA CRIB. AURRERA FARDO 10 PZAS 900 GR | 43,888 pz |
| A3408 | FRIJOL NEGRO BOLA CRIB. 1A CAMPO FRESCO (NOM-2015) A-S FARDO 10 PZAS 900 GR | 66,761 pz |
| A6196 | FRIJOL NEGRO BONAMARK FARDO 10 PZAS 900 GR | 6,750 pz |
| A6529 | FRIJOL NEGRO ENTERO EN SALMUERA SOMOS C/6 PZ 283 GR | 54,744 pz |
| A6739 | FRIJOL NEGRO MICHIGAN FARDO 10 PZAS 750 GR | 51,270 pz |
| A6816 | FRIJOL NEGRO CAMPO SANTO FARDO 10 PZAS 900 GR | 35,348 pz |
| A6837 | FRIJOL NEGRO RANCHO DON SILVESTRE FARDO 10 PZAS 900 GR | 52,420 pz |

**Siguiente paso:** si tienes un mínimo por artículo definido (por catálogo o criterio interno p.ej. cobertura en semanas), dime el umbral y te confirmo cuáles quedan por debajo; o reviso la cobertura contra el plan de producción del periodo.

---

| [⬆ top](#fila-49) | `wrun_01M0EYV6X7KB2K4M8WH7EC4KKR` | **Estado real:** completed · **Duración:** 2 min · **steps:** 10 · **tool calls:** 15 · **tokIn:** 302,392 · **tokOut:** 7,869 · **errores:** 4 (tools: 4 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-50"></a>
## 50. ¿Cuál es el saldo de inventario del artículo A1136? — 14 s

### Respuesta del agente

**Saldo de inventario de A1136 (Frijol Negro)** — balance contable del artículo.

| Artículo | Saldo |
|---|---|
| A1136 | 3,895 |

Cálculo: entradas 14,603,257 − salidas 14,599,362. ¿Quieres el desglose por almacén o el disponible actual?

---

| [⬆ top](#fila-50) | `wrun_01M0EYYKY503KQ1JPBGWXV17JW` | **Estado real:** completed · **Duración:** 14 s · **steps:** 3 · **tool calls:** 3 · **tokIn:** 68,551 · **tokOut:** 920 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-51"></a>
## 51. ¿Qué prototipos de artículo están en desarrollo en esta empresa? — 14 s

### Respuesta del agente

**Dato no disponible.**

El módulo de **prototipos de artículo** (fórmulas en desarrollo antes de pasar a producción normal) no está publicado en la fuente de datos de esta empresa; intenté acceder al catálogo y no existe. Solo está disponible el catálogo de artículos ya en producción regular.

**Alternativa útil:** puedo consultarte los **artículos que ya están en producción** del catálogo maestro, o la lista de materiales (BOM) de cualquier artículo activo, si te sirve para el análisis.

---

| [⬆ top](#fila-51) | `wrun_01M0EYZK4NTGDN7K498357PGTH` | **Estado real:** completed · **Duración:** 14 s · **steps:** 3 · **tool calls:** 2 · **tokIn:** 65,745 · **tokOut:** 352 · **errores:** 1 (tools: 1 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-52"></a>
## 52. ¿Tienes información de prototipos de receta o costeo de un artículo nuevo? — 10 s

### Respuesta del agente

**Tema — Prototipos de receta y costeo de artículo nuevo**

La información de prototipos de artículo (lista de materiales de fórmula en desarrollo, su costeo, autorización y seguimiento de avance) **no está disponible** a través de este agente. La funcionalidad de prototipos no se encuentra expuesta en la fuente de datos actual.

Lo que sí registra el sistema es el catálogo de artículos ya en producción normal (`Art`) y sus listas de materiales (`ArtMaterial`), que es un concepto distinto (artículo activo, no prototipo en desarrollo).

Si necesitas, puedo consultar la lista de materiales o el costeo de un **artículo ya dado de alta** en producción.

---

| [⬆ top](#fila-52) | `wrun_01M0EZ055R8W2D9DGB2JH5MC14` | **Estado real:** completed · **Duración:** 10 s · **steps:** 3 · **tool calls:** 3 · **tokIn:** 63,600 · **tokOut:** 431 · **errores:** 2 (tools: 2 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-53"></a>
## 53. ¿Puedes darme la lista de materiales de un prototipo de artículo? — 8 s

### Respuesta del agente

**Tema — Lista de materiales de prototipo de artículo**

Dato no disponible: la información de **prototipos de artículo** (su lista de materiales, costeo, autorización) todavía **no está conectada a este agente** en el ERP. Es un módulo en desarrollo, distinto del catálogo de artículos de producción normal.

Como alternativa, sí puedo darte la **lista de materiales (receta) de un artículo ya en producción (catálogo estándar)**. ¿De qué artículo la necesitas? Indícame el código o nombre y te la consulto.

---

| [⬆ top](#fila-53) | `wrun_01M0EZ0H5XDK41QXJJF041JXVD` | **Estado real:** completed · **Duración:** 8 s · **steps:** 3 · **tool calls:** 3 · **tokIn:** 64,066 · **tokOut:** 369 · **errores:** 2 (tools: 2 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-54"></a>
## 54. ¿Qué artículo prototipo está pendiente de autorizar? — 8 s

### Respuesta del agente

**Prototipos de artículo — Dato no disponible**

La gestión de prototipos (autorización de nuevas fórmulas/recetas, su listado de materiales, costeo y el estatus de aprobación) aún no está disponible a través de este agente en la fuente de datos actual.

Como alternativa, sí puedo consultarte el **catálogo de artículos de producción** (artículos ya activos) con su descripción, existencias o su lista de materiales. ¿Quieres que revise algo de eso?

---

| [⬆ top](#fila-54) | `wrun_01M0EZ0X54PPKN5KQ0SDP67M0A` | **Estado real:** completed · **Duración:** 8 s · **steps:** 3 · **tool calls:** 3 · **tokIn:** 65,134 · **tokOut:** 375 · **errores:** 2 (tools: 2 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-55"></a>
## 55. ¿Existe algún prototipo de artículo en el catálogo de la empresa? — 6 s

### Respuesta del agente

No hay prototipos de artículo disponibles en la fuente actual.

**Dato no disponible**: el catálogo de artículos (Art) corresponde a productos en producción normal, y el módulo de prototipos (prototipo en desarrollo con su lista de materiales, costeo y autorización) **no está publicado** en la fuente de datos de esta empresa desde este asistente.

Si necesitas validar una nueva fórmula/receta, la alternativa es registrarla directamente como artículo de producción vía el catálogo de artículos del ERP.

---

| [⬆ top](#fila-55) | `wrun_01M0EZ193XER7QF6XEN2CEYXBK` | **Estado real:** completed · **Duración:** 6 s · **steps:** 2 · **tool calls:** 1 · **tokIn:** 44,979 · **tokOut:** 250 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-56"></a>
## 56. ¿Qué traspasos entre almacenes están programados esta semana? — 8 s

### Respuesta del agente

**Tema — Traspasos entre almacenes programados esta semana**

Dato no disponible. El módulo de programa de traspasos entre almacenes no está publicado en la fuente de datos actual de Industrias Campo Fresco, por lo que no puedo mostrar los traspasos programados de esta semana.

Si te sirve, sí puedo mostrarte los **movimientos de inventario transaccionales** reales (traspasos ya registrados, ajustes, recepciones) o los **arribos/embarques proyectados** a 12 semanas, que sí están disponibles. ¿Quieres que revise alguno?

---

| [⬆ top](#fila-56) | `wrun_01M0EZ1N3RP64D9849M888PKQQ` | **Estado real:** completed · **Duración:** 8 s · **steps:** 2 · **tool calls:** 1 · **tokIn:** 43,952 · **tokOut:** 366 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-57"></a>
## 57. ¿Cuál es el programa de traspasos de la semana 32? — 6 s

### Respuesta del agente

**Tema — Programa de Traspasos · Semana 32**

El programa de traspasos entre almacenes de la semana 32 no está disponible a través de este agente: ni el programa ni las entidades de traspaso están publicados en la fuente de datos de la empresa (no pude verificar el dato en el ERP).

No intenté reconstruirlo con los movimientos de inventario transaccional porque no es lo mismo que el programa de traspasos. Si necesitas **movimientos de inventario reales** (traspasos ya registrados entre almacenes), puedo consultarlos con la entidad de movimientos de inventario.

**Siguiente paso:** confirma si quieres que revise los movimientos de inventario registrados, o si el programa lo consultas directamente en el portal de planeación.

---

| [⬆ top](#fila-57) | `wrun_01M0EZ215CW59NC86JW9AYJPKP` | **Estado real:** completed · **Duración:** 6 s · **steps:** 2 · **tool calls:** 1 · **tokIn:** 43,943 · **tokOut:** 298 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-58"></a>
## 58. ¿Qué movimientos de traspaso hay planeados entre almacenes? — 7 s

### Respuesta del agente

**Programa de traspasos entre almacenes — No disponible**

Los traspasos programados entre almacenes (el programa semanal de la ruta de traspasos) **no están disponibles** a través de este asistente: las entidades que los respaldan no existen en la fuente de datos de ICF, por lo que no puedo confirmar ni listar esos movimientos planeados.

**Alternativa útil:** puedo mostrarte **movimientos de inventario transaccional reales** (traspasos ya registrados, ajustes y recepciones) desde el encabezado de inventario. ¿Quieres que los consulte?

---

| [⬆ top](#fila-58) | `wrun_01M0EZ2D7AVV6MYRTE5GW5E7YQ` | **Estado real:** completed · **Duración:** 7 s · **steps:** 2 · **tool calls:** 1 · **tokIn:** 44,892 · **tokOut:** 412 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-59"></a>
## 59. ¿Cuánto inventario hay disponible para traspasar esta semana? — 6 s

### Respuesta del agente

**Programa de traspasos entre almacenes — no disponible**

El detalle de inventario disponible para traspasar esta semana no está disponible a través de este agente: el módulo del programa de traspasos no está publicado en la fuente de datos actual.

**Alternativas útiles que sí tengo disponibles:**
- **Disponibilidad por almacén** del inventario transaccional real (qué hay y dónde).
- **Arribos proyectados** a 12 semanas por almacén.

¿Quieres que revise la disponibilidad actual por almacén o los arribos proyectados de la semana?

---

| [⬆ top](#fila-59) | `wrun_01M0EZ2S9TTEKYA1WZHGGQVFAX` | **Estado real:** completed · **Duración:** 6 s · **steps:** 2 · **tool calls:** 1 · **tokIn:** 43,564 · **tokOut:** 308 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-60"></a>
## 60. ¿Qué almacenes reciben mercancía por traspaso la próxima semana? — 10 s

### Respuesta del agente

**Traspasos entre almacenes — Programa semanal**

El programa de traspasos entre almacenes para la próxima semana **no está disponible** a través de esta consulta: la entidad del programa no existe en la fuente de datos de la empresa (verificado en el sistema).

Como alternativa útil, sí tengo cobertura para:
- **Arribos/embarques proyectados** (llegadas de mercancía a 12 semanas) por proveedor.
- **Movimientos de inventario transaccional** ya registrados (encabezado `Inv`).

¿Te interesa revisar alguno de estos dos para localizar la mercancía que esperas recibir?

---

| [⬆ top](#fila-60) | `wrun_01M0EZ35AMFJ2V081PJ7WR75E4` | **Estado real:** completed · **Duración:** 10 s · **steps:** 2 · **tool calls:** 1 · **tokIn:** 45,426 · **tokOut:** 458 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-61"></a>
## 61. Dame el dashboard general de producción del periodo. — 24 s

### Respuesta del agente

**Dashboard general de producción — Periodo 8 (Programa mensual)**
El volumen a producir del periodo asciende a **11,441,806 piezas / 4,510,842 kg**, concentrado en frijoles, mitades y maíz palomero.

| Familia | A producir (piezas) | Kg de uso |
|---|---|---|
| Frijol Negro | 1,359,138 | 1,217,678 |
| Frijol Pinto | 1,414,708 | 1,112,143 |
| Lenteja | 1,027,147 | 636,299 |
| Maíz Palomero | 1,003,304 | 498,054 |
| Mitades claras | 2,550,948 | 292,136 |
| Mitades Negras | 2,039,282 | 244,714 |
| Garbanza | 211,698 | 211,698 |
| Frijol Media Oreja | 75,700 | 68,130 |
| Avena | 297,291 | 63,668 |
| Jamaica | 129,860 | 119,429 |
| Entero Negro | 57,045 | 6,845 |
| Frijol Peruano | 14,678 | 13,210 |
| Mitades peruanas | 149,824 | 17,979 |
| Alverjón | 343,520 | — |
| vacío | 718,368 | 1,104 |
| Arándano | 11,437 | 1,144 |
| Nuez | 14,863 | 743 |
| Almendra | 10,432 | 522 |
| Canela | 6,199 | 310 |
| Ciruela | 3,636 | 436 |
| Alpiste Simple | 1,410 | 1,410 |
| Revoltura c/gragea | 3,060 | 3,060 |
| Haba | 260 | 130 |
| **Total** | **11,441,806** | **4,510,842** |

**Siguiente paso:** revisar el cumplimiento (producido vs programado) por centro o el faltante de materia prima del periodo si quieres validar abasto.

---

| [⬆ top](#fila-61) | `wrun_01M0EZ3HCB0K307S92Z1N8VRY2` | **Estado real:** completed · **Duración:** 24 s · **steps:** 5 · **tool calls:** 7 · **tokIn:** 120,069 · **tokOut:** 1,717 · **errores:** 1 (tools: 1 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-62"></a>
## 62. ¿Cuál es el panorama de producción y ocupación de centros del periodo? — 18 s

### Respuesta del agente

**Panorama de producción y ocupación por centro del periodo**

| Centro | A producir | Ocupación | Capacidad (hrs) | Horas programa | % Ocupación |
|---|---|---|---|---|---|
| **CRIBACF** | 1,466,132 pz | 1,359,936 pz | 630 | 679 | **108%** |
| CRIBACF2 | 2,578,588 pz | 3,352,073 pz | 1,240 | 954 | 77% |
| ENTEROS | 36,720 pz | 321,399 pz | 267 | 30 | 11% |
| ENVCF | 1,606,236 pz | 3,458,208 pz | 1,801 | 837 | 46% |
| JAMAICA | 62,240 pz | 117,001 pz | 174 | 93 | 53% |
| PAQUETERIA | 16,218 pz | 190,080 pz | 132 | 11 | 9% |
| PROCESADOS | 3,247,685 pz | 4,243,750 pz | 505 | 387 | 77% |
| **Total** | 9,591,869 pz | 13,042,447 pz | 4,749 | 2,990 | **63%** |

Hallazgo clave: **CRIBACF está sobrecapacidad (108%)**, con 679 hrs programadas frente a 630 disponibles — es el único centro que excede su capacidad. PROCESADOS y CRIBACF2 operan al 77% y son los de mayor volumen de producción.

**Siguiente paso:** revisar el desglose semanal de **CRIBACF** para identificar dónde se concentra la sobrecarga y proponer balanceo. ¿Lo desgloso?

---

| [⬆ top](#fila-62) | `wrun_01M0EZ4G2ZA0Y0F8MSMYQSHDN6` | **Estado real:** completed · **Duración:** 18 s · **steps:** 3 · **tool calls:** 2 · **tokIn:** 66,754 · **tokOut:** 938 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-63"></a>
## 63. Resumen ejecutivo del módulo MRP: producción, ocupación y KPIs del periodo. — 38 s

### Respuesta del agente

**Tema — Resumen ejecutivo MRP · Periodo 8 2026**

**Plan de producción total:** 11,441,806 piezas · 4,510,842 kg.

**Producción por centro (ocupación = horas programadas vs capacidad):**

| Centro | A producir (pzas) | Ocupación | Lectura |
|---|---|---|---|
| **CRIBACF** | 1,466,132 | **107.8%** | Sobre-cargado (vende 1.46M) |
| CRIBACF2 | 2,578,588 | 76.9% | Sale holgado |
| PROCESADOS | 3,247,685 | 76.5% | Mayor volumen |
| ENVCF | 1,606,236 | 46.4% | Sobra capacidad |
| JAMAICA | 62,240 | 53.2% | Ocupa la mitad |
| ENTEROS | 36,720 | 11.4% | Muy liberado |
| PAQUETERIA | 16,218 | 8.5% | Muy liberado |
| **Total** | **9,591,869** | **63%** | Capacidad 4,749 h |

**Principales familias a producir:**

| Familia | Piezas | Kilos |
|---|---|---|
| **Frijol Negro** | 1,359,138 | 1,217,678 |
| Frijol Pinto | 1,414,708 | 1,112,143 |
| Lenteja | 1,027,147 | 636,299 |
| Maíz Palomero | 1,001,304 | 498,054 |
| Mitades claras | 2,550,948 | 292,136 |
| Mitades Negras | 2,039,282 | 244,714 |

**KPIs del periodo:** venta pronosticada 10,254,040 pzas vs 9,591,869 a producir (−6%). **Cumplimiento de producción: sin órdenes producidas registradas aún** (0 en todos los centros) → trata el periodo como en curso o sin afectar órdenes.

En una línea: el plan va **63% ocupado en promedio, con CRIBACF sobre su capacidad (107.8%)**; el resto de centros tiene holgura, y aún no hay producción real registrada contra el programa.

**Siguiente paso:** si quieres, reviso qué artículo/familia satura **CRIBACF** o el detalle del cumplimiento por día.

---

| [⬆ top](#fila-63) | `wrun_01M0EZ525W9781AGGT6AVGP0FG` | **Estado real:** completed · **Duración:** 38 s · **steps:** 6 · **tool calls:** 9 · **tokIn:** 150,885 · **tokOut:** 3,028 · **errores:** 1 (tools: 1 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-64"></a>
## 64. ¿Cómo va la producción del periodo comparada con el plan? — 18 s

### Respuesta del agente

**Producción del periodo vs. plan — Cumplimiento por centro (Ejercicio 2026 / Periodo 7)**

La producción va al **~54% del plan** en piezas (6,150,363 de 11,441,806). Ningún centro crítico llega al 70%; solo Paquetería rebasa lo programado.

| Centro de Trabajo | Programado Kg | Produccido Kg | Programado Pzas | Producido Pzas | Cumplimiento |
|---|---|---|---|---|---|
| **CRIBACF2** | 2,367,662.80 | 1,560,911 | 2,592,010 | 1,706,790 | 65.85% |
| PROCESADOS | 587,943.98 | 304,255.20 | 5,016,010 | 2,698,210 | 53.79% |
| ENVCF | 1,431,547.91 | 779,921.40 | 2,938,990 | 1,566,666 | 53.31% |
| JAMAICA | 118,270 | 79,920 | 118,270 | 79,920 | 67.57% |
| PAQUETERIA | 5,417.62 | 7,755.95 | 69,196 | 98,777 | 142.75% |
| ENTEROS | 0 | 0 | 0 | 0 | — |
| **TOTAL** | **4,510,842.31** | **2,732,763.55** | **11,441,806** | **6,150,363** | **~54%** |

**Siguiente paso:** puedo desglosar el cumplimiento por artículo (familia/centro) para identificar qué sku están jalando el rezago.

*Nota: el resumen del total es en piezas; en kg el avance es ~61% (2,732,763 de 4,510,842).*

---

| [⬆ top](#fila-64) | `wrun_01M0EZ6EA5KXYR6Q5BMPKP255Y` | **Estado real:** completed · **Duración:** 18 s · **steps:** 3 · **tool calls:** 2 · **tokIn:** 71,695 · **tokOut:** 1,148 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-65"></a>
## 65. Dashboard del programa mensual: producción por centro y venta. — 25 s

### Respuesta del agente

**Programa mensual — Dashboard por centro (Producción y venta)**
Ocupación global del periodo al 63%; un centro supera su capacidad (**CRIBACF al 107.8%**).

| Centro de Trabajo | Forecast de ventas | Piezas programadas | Capacidad Mensual (hrs) | Horas Programadas | Ocupación | Piezas Libres |
|---|---|---|---|---|---|---|
| **CRIBACF** 🔴 | 1,457,500 | 1,466,132 | 629.60 | 678.76 | 107.8% | 0 |
| CRIBACF2 | 2,400,000 | 2,578,588 | 1,240.13 | 953.97 | 76.9% | 774,485 |
| ENTEROS | 36,720 | 36,720 | 266.50 | 30.45 | 11.4% | 284,679 |
| ENVCF | 2,027,400 | 1,606,236 | 1,801.15 | 836.58 | 46.4% | 1,851,972 |
| JAMAICA | 40,000 | 62,240 | 174.11 | 92.62 | 53.2% | 54,761 |
| PAQUETERIA | 67,500 | 16,218 | 132.00 | 11.26 | 8.5% | 173,862 |
| PROCESADOS | 3,449,920 | 3,247,685 | 505.21 | 386.63 | 76.5% | 696,065 |
| SIN CENTRO | 775,000 | 578,050 | — | — | — | — |
| **Total** | **10,254,040** | **9,591,869** | **4,749** | **2,990** | **63%** | — |

*Piezas Libres = Ocupación − programado (mín. 0). Días hábiles/extra no disponibles en la fuente.*

**Alerta:** **CRIBACF** está sobrecargado (107.8%). Con demanda de 1.46 M pzas programa 1.47 M, requiriendo 678.8 hrs vs 629.6 de capacidad (49.2 de tiempo extra).

**Siguiente paso:** puedo desglosar la semana por artículo del plan o revisar la carga detallada de **CRIBACF**.

**SPEECH:** Ya tengo el dashboard — la ocupación global del periodo va al 63%, pero ojo, CRIBACF está sobrecargado al 108 por ciento.

---

| [⬆ top](#fila-65) | `wrun_01M0EZ70JPB6CTX01AWHV1AHW5` | **Estado real:** completed · **Duración:** 25 s · **steps:** 4 · **tool calls:** 4 · **tokIn:** 96,037 · **tokOut:** 1,692 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-66"></a>
## 66. Revisa el stock de seguridad de la familia AJO: ¿tenemos materia prima suficiente? — 36 s

### Respuesta del agente

**Stock de seguridad familia AJO — suficiente pero con margen muy justo**

La familia AJO tiene 2 artículos, y solo uno (**A5461**) tiene parámetro de stock de seguridad. Hay un pequeño excedente frente al mínimo, pero a la mitad del tope ideal.

| Artículo | Descripción | Min (Kg) | Max (Kg) | Disponible (Kg) | Vs. mínimo | Semáforo |
|---|---|---|---|---|---|---|
| **A5461** | AJO MOLIDO NACIONAL BULTO 25 KG | 358 | 716 | 373.07 | 15.07 Kg arriba (+4%) | 🟡 |
| **A0012** | AJO MOLIDO NACIONAL 3A BULTO 10 KG | — | — | 15.00 | sin parámetro | — |

Desglose del disponible de **A5461** (373.07 Kg): 304.40 en **MAT. P. CF** + 68.67 en PROCESADOS. El de **A0012** (15 Kg): 15.00 en REFRITOSMP + trazas en PROCESADOS.

**Lectura:** el artículo con stock de seguridad configurado está 4% por encima del mínimo y al 52% del máximo — no hay faltante, pero el colchón es reducido. El artículo 3A no tiene parámetro de inventario mínimo configurado.

**Siguiente paso:** si el consumo del molido 1A es elevado, conviene reponer hasta acercarse al tope de 716 Kg; para el molido 3A se puede valorar configurar su stock de seguridad, hoy sin parámetro.

---

| [⬆ top](#fila-66) | `wrun_01M0EZ7ZBGN5A2Y94TVMRZ1967` | **Estado real:** completed · **Duración:** 36 s · **steps:** 5 · **tool calls:** 7 · **tokIn:** 124,417 · **tokOut:** 2,051 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-67"></a>
## 67. ¿Tenemos materia prima suficiente para cubrir el plan de producción a 30 días? — 44 s

### Respuesta del agente

## Cobertura de materia prima vs. plan de producción — 30 días

**No hay abasto suficiente.** Con el inventario actual y los arribos ya considerados, **16 de las familias de materia prima quedan en negativo desde la semana 1** del horizonte de 30 días (~4–5 semanas), encabezadas por **Frijol Negro** (−596,298 kg) y **Frijol Pinto** (−172,584 kg). El resto del portafolio relevante solo se cubre parcialmente o con holgura.

### 🔴 Crítico (inventario negativo dentro de 30 días)

| Familia | Inv. final S1 (kg) | Cobertura actual (semanas) | Tiempo de entrega |
|---|---|---|---|
| **Frijol Negro** | −596,298 | −0.99 | 7 sem |
| **Frijol Pinto** | −172,584 | −0.50 | 7 sem |
| **CHICHARO MITAD** | −9,000 | −1.00 | 7 sem |
| **Jamaica** | −8,992 | −0.54 | 8 sem |
| **Frijol Media Oreja** | −8,826 | −0.98 | 2 sem |
| **Mitades peruanas** | −8,254 | −0.87 | 2 sem |
| **Haba** | −5,574 | −0.70 | 5 sem |
| **Avena** | −1,813 | −0.03 | 7 sem |
| **Almendra** | −324 | −0.96 | 5 sem |
| **ARANDANO** | −654 | −0.97 | 8 sem |
| **Alpiste Simple** | −264 | −0.21 | 7 sem |
| **Chile pasilla / Ancho / Guajillo / Árbol** | −540 | −1.00 | 3–8 sem |
| **Uva pasa** | −305 | −0.30 | 5 sem |

### 🟡 Parcial (no alcanzan las 4–5 semanas del horizonte)
**Lenteja** (1.9 sem) · **Maíz Palomero** (1.4 sem) · **Ciruela** (1.5 sem) · **CANELA** (2.3 sem) · **Mitades claras** (2.9 sem) · **Revoltura c/gragea** (3.3 sem).

### 🟢 Cubren 30 días
**Garbanza** (16.5 sem) · **Mitades Negras** (10.8 sem) · **Frijol Peruano** (6.1 sem) · **NUEZ** (4.8 sem) · Alverjón, CHÍCHARO, Entero Negro/Rojo y Soya (sin requerimiento en el periodo).

> Datos del reporte de cobertura de materia prima del plan de producción (12 semanas), corrida del módulo Forecast/Planeación. Los arribos proyectados ya están incluidos; varios de los críticos se recuperan recién a partir de la semana 6.

**Siguiente paso:** el margen de tiempo de entrega en los críticos (7–8 semanas en Frijol Negro y Frijol Pinto) ya supera el horizonte de 30 días, por lo que conviene priorizar esa reposición de inmediato. ¿Genero el detalle de la orden de compra sugerida para Frijol Negro y Frijol Pinto?

---

| [⬆ top](#fila-67) | `wrun_01M0EZ93Z68WYF3X8H4S37RM7N` | **Estado real:** completed · **Duración:** 44 s · **steps:** 3 · **tool calls:** 3 · **tokIn:** 99,157 · **tokOut:** 3,726 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-68"></a>
## 68. ¿Cuál es el cumplimiento plan vs real del periodo? — 10 s

### Respuesta del agente

Para darte el dato exacto, dime a cuál comparación plan vs real te refieres — en el portal MRP hay tres indicadores distintos bajo el mismo menú.

---

| [⬆ top](#fila-68) | `wrun_01M0EZAH0GCQHG6QB8RWVC3X5R` | **Estado real:** completed · **Duración:** 10 s · **steps:** 2 · **tool calls:** 1 · **tokIn:** 50,003 · **tokOut:** 690 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-69"></a>
## 69. ¿Cuál es la capacidad de los centros de trabajo y su ocupación? — 3 min

### Respuesta del agente

**Capacidad de los centros de trabajo y su ocupación** (plan de producción 2026 vs capacidad calculada)

| Centro | Descripción | Capacidad (pzas) | Ocupación (pzas) | % uso |
|---|---|---|---|---|
| **CRIBACF2** | Cribado Campo Fresco 2 | 3,352,073 | 3,691,000 | **110%** |
| JAMAICA | Envasado Jamaica | 117,001 | 110,570 | 95% |
| PROCESADOS | Productos Procesados | 4,243,750 | 3,520,500 | 83% |
| MAQRG | Maquilas RG | 800,000 | 553,000 | 69% |
| PAQUETERIA | Empacado de Frutos Secos | 190,080 | 120,356 | 63% |
| **ENVCF** | Envasado Campo Fresco | 3,458,208 | 2,285,339 | **66%** |
| ENTEROS | Enteros | 321,399 | 0 | 0% |
| CRIBACF | Cribado Campo Fresco | 1,359,936 | — | — |
| MINICRIBA | Mini Criba (Sueca) | n/d | 467,000 | n/d |

Hallazgos clave:
- **CRIBACF2 está sobrecargado (110%)** — demanda total del centro supera la capacidad calculada en ~339 mil piezas; es donde se concentra el riesgo.
- **JAMAICA roza el tope (95%)** con margen casi agotado.
- ENVCF, el centro con más capacidad, queda al 66%: hay holgura disponible.
- CRIBACF y MINICRIBA no tienen capacidad calculada en la corrida actual; para MINICRIBA sí hay plan (467 mil pzas) pero falta el dato de capacidad de referencia, así que el % no es calculable.

¿Quieres que profundice en **CRIBACF2** y detalle qué artículos lo saturan para proponer un rebalanceo hacia **ENVCF** (con holgura)?

---

| [⬆ top](#fila-69) | `wrun_01M0EZAX44F36KQ08QGHX13XM3` | **Estado real:** completed · **Duración:** 3 min · **steps:** 21 · **tool calls:** 36 · **tokIn:** 796,228 · **tokOut:** 14,797 · **errores:** 1 (tools: 1 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-70"></a>
## 70. Stock de seguridad por familia: ¿qué familias están por debajo de su mínimo? — 57 s

### Respuesta del agente

**Stock de seguridad por familia — Familias bajo su mínimo (plan Forecast CF, 2026)**

Son **18 familias** las que están por debajo de su stock mínimo en el snapshot del plan. De ellas, **11 están en cero** y 7 con cobertura parcial.

### Familias por debajo de su mínimo (kg)

| Familia | Stock actual | Mínimo | Cobertura |
|---|---|---|---|
| **Garbanza** | 0 | 240,000 | 🔴 0% |
| **Alverjon** | 0 | 90,000 | 🔴 0% |
| **Ciruela** | 0 | 4,626 | 🔴 0% |
| **Entero Negro** | 0 | 3,536 | 🔴 0% |
| **ALMENDRA** | 0 | 270 | 🔴 0% |
| **CANELA** | 0 | 281 | 🔴 0% |
| **NUEZ** | 0 | 281 | 🔴 0% |
| **ARANDANO** | 0 | 563 | 🔴 0% |
| **Frijol Peruano** | 4,893 | 60,000 | 🔴 8% |
| **Haba** | 1,000 | 27,500 | 🔴 4% |
| **Frijol Negro** | 218,258 | 900,000 | 🔴 24% |
| **Frijol Pinto** | 242,521 | 900,000 | 🔴 27% |
| **Avena** | 44,164 | 180,000 | 🔴 25% |
| **Lenteja** | 191,800 | 360,000 | 🟡 53% |
| **Maiz Palomero** | 343,949 | 390,000 | 🟡 88% |
| **Frijol Media Oreja** | 30,000 | 45,000 | 🟡 67% |
| **Alpiste Simple** | 2,500 | 4,000 | 🟡 63% |
| **Revoltura c/gragea** | 2,500 | 4,000 | 🟡 63% |

**En verde** (cubren su mínimo): Mitades Negras (497% de su mínimo), Mitades claras (307%), Jamaica (218%) y Mitades peruanas (316%). Los frijoles principales (Negro y Pinto) están en ~25% de su mínimo: es la brecha de mayor volumen.

**Nota:** la cobertura se calculó contra el inventario del plan de la familia FC. Familias con mínimo configurado pero **sin artículos en el plan del periodo** (Chile, Soya, Lenteja Roja, Bobina/Bolsa/Caja, Alubia, frijol americano/argentino) no reportan dato verificable en esta fuente, no se asumen en cero. Además, **Alubia** tiene mínimo mayor que máximo (90,000 vs 45,000), un parámetro a revisar.

**Siguiente paso:** priorizar la compra de **Frijol Negro y Frijol Pinto** (mayor brecha en kilos) y verificar los stocks en cero de Garbanza, Alverjon y Ciruela.

---

| [⬆ top](#fila-70) | `wrun_01M0EZGWHZ0W79GBJP3HCANG58` | **Estado real:** completed · **Duración:** 57 s · **steps:** 4 · **tool calls:** 5 · **tokIn:** 106,630 · **tokOut:** 4,823 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-71"></a>
## 71. ¿Qué se va a producir esta semana y qué nos falta de materia prima para cubrirlo? — 2 min

### Respuesta del agente

**Plan de producción de la semana (09, 23-feb al 01-mar-2026) — cobertura de materia prima**

**Qué se producirá esta semana:** ~**1,602,180 piezas / 765,919 kg** en 10 familias, encabezadas por Mitades claras y Mitades Negras.

| Familia | Piezas | Kg |
|---|---|---|
| **Mitades claras** | 361,000 | 36,120 |
| **Mitades Negras** | 322,000 | 24,240 |
| Frijol Negro | 278,450 | 241,497 |
| Lenteja | 221,100 | 185,550 |
| Frijol Pinto | 190,000 | 143,400 |
| Maiz Palomero | 176,400 | 88,200 |
| Avena | 25,230 | 18,912 |
| Jamaica | 18,000 | 18,000 |
| Alpiste Simple | 5,000 | 5,000 |
| Revoltura c/gragea | 5,000 | 5,000 |
| **Total** | **1,602,180** | **765,919** |

**¿Qué nos falta de materia prima para cubrirlo?** No se registran faltantes: ni el reporte de materia prima ni el de insumos de la corrida del periodo arrojan faltantes, y la cobertura proyectada de las familias a producir queda en terreno positivo para la semana 09. Las coberturas más bajas entre las que se producen son **Frijol Negro (~5.5 semanas)** y **Avena (~9.6 semanas)**, ambas por encima de la semana; el resto supera las 12.

> Nota: el desglose fino (explosión de materiales con cobertura por insumo) no está poblado en la fuente actual — la cobertura se verificó a nivel familia (pronóstico vs. inventario). Si quieres validar un artículo o insumo específico del BOM, dime cuál y lo reviso.

---

| [⬆ top](#fila-71) | `wrun_01M0EZJQHK07GXZ3Z46SX7DYZS` | **Estado real:** completed · **Duración:** 2 min · **steps:** 10 · **tool calls:** 16 · **tokIn:** 348,512 · **tokOut:** 8,278 · **errores:** 2 (tools: 2 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-72"></a>
## 72. Dame el panorama MRP completo del periodo: plan de producción, faltantes y capacidad de centros. — 1 min

### Respuesta del agente

**Sesión: MASERP · 2026 · Periodo 7 (Julio) · S27–S31 · Presupuesto CONCLUIDO**

# Panorama MRP — Julio 2026 (S27–S31)

### Resumen ejecutivo
El mes arranca con **10,747,765 piezas programadas** (28,001 pies cúbicos programados en total). **Sin faltantes** de materia prima ni insumos en el periodo. La capacidad de centros está holgada en general, salvo **CRIBACF**, que opera **sobrecargado al 108%** y con horas programadas por arriba de su capacidad.

### Plan de producción semanal (piezas autorizadas)
| Semana | Rango | Piezas programadas |
|---|---|---|
| S27 | 29 jun – 05 jul | 1,944,280 pz |
| S28 | 06 – 12 jul | 1,999,932 pz |
| S29 | 13 – 19 jul | 2,144,643 pz |
| S30 | 20 – 26 jul | 2,325,660 pz |
| S31 | 27 jul – 02 ago | 2,333,250 pz |
| **Total** | | **10,747,765 pz** |

### Plan por familia (top, piezas y kg)
| Familia | Piezas | Kg |
|---|---|---|
| **Frijol Negro** | 2,443,000 pz | 2,176,140 kg |
| **Mitades claras** | 1,815,500 pz | 173,040 kg |
| **Frijol Pinto** | 1,634,220 pz | 1,304,450 kg |
| **Lenteja** | 1,100,900 pz | 737,410 kg |
| **Mitades Negras** | 923,000 pz | 110,760 kg |
| **Maiz Palomero** | 711,340 pz | 354,410 kg |

### Faltantes del periodo
Sin faltantes de **materia prima** ni de **insumos** en Julio 2026 (corrida MASERP, Periodo 7). El plan autorizado está cubierto de materiales.

### Ocupación y capacidad por centro
| Centro de Trabajo | Piezas programadas | Capacidad (hrs) | Horas programadas | Ocupación | Piezas libres |
|---|---|---|---|---|---|
| **CRIBACF** 🔴 | 1,466,132 pz | 629.60 | 678.76 | **108%** | −106,196 pz |
| CRIBACF2 | 2,578,588 pz | 1,240.13 | 953.97 | 77% | 773,485 pz |
| PROCESADOS | 3,247,685 pz | 505.21 | 386.63 | 77% | 996,065 pz |
| ENVCF | 1,606,236 pz | 1,801.15 | 836.58 | 46% | 1,851,972 pz |
| JAMAICA | 62,240 pz | 174.11 | 92.62 | 53% | 54,761 pz |
| ENTEROS | 36,720 pz | 266.50 | 30.45 | 11% | 284,679 pz |
| PAQUETERIA | 16,218 pz | 132.00 | 11.26 | 9% | 173,862 pz |
| **Total** | 9,591,869 pz | 4,749 | 2,990 | 63% | 4,134,824 pz |

### Conclusión y acción
- El mes está **cubierto en material** (cero faltantes) con plan autorizado completo hasta S31.
- Único punto de atención: **CRIBACF sobrecargado (108%)** con 106,196 pzas por encima de su capacidad; conviene revisar su balanceo/semana S30–S31 antes de liberar el siguiente periodo.

> Datos de la corrida del proceso **MASERP** para el Periodo 7 (Julio 2026); plan consolidado de `ForecastPlanProduccion` y capacidad de `WebInicio`.

---

| [⬆ top](#fila-72) | `wrun_01M0EZNXK21Y486F2TY1KBC1CD` | **Estado real:** completed · **Duración:** 1 min · **steps:** 7 · **tool calls:** 16 · **tokIn:** 223,100 · **tokOut:** 5,392 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-73"></a>
## 73. ¿Cómo está la planeación de producción del periodo? — 36 s

### Respuesta del agente

**Planeación de producción (Programa Mensual) — estado por centro de trabajo**

La ocupación global del periodo es de **63%** con **9,591,869 piezas programadas** vs. **13,042,447 de capacidad**, dejando **4,134,824 piezas libres**. Hay **1 centro sobrecargado (CRIBACF al 108%)** que conviene revisar.

| Centro | Forecast venta | Piezas programadas | Capacidad (hrs) | Ocupación | % Ocup. | Piezas libres | Días extra |
|---|---|---|---|---|---|---|---|
| **CRIBACF** 🔴 | 1,457,500 | 1,466,132 | 629.6 | 1,359,936 | **107.8%** | −106,196 | 49.2 |
| CRIBACF2 | 2,400,000 | 2,578,588 | 1,240.1 | 3,352,073 | 76.9% | 773,485 | −286.2 |
| ENTEROS | 36,720 | 36,720 | 266.5 | 321,399 | 11.4% | 284,679 | −236.1 |
| ENVCF | 2,027,400 | 1,606,236 | 1,801.2 | 3,458,208 | 46.4% | 1,851,972 | −964.6 |
| JAMAICA | 40,000 | 62,240 | 174.1 | 117,001 | 53.2% | 54,761 | −81.5 |
| PAQUETERIA | 67,500 | 16,218 | 132.0 | 190,080 | 8.5% | 173,862 | −120.7 |
| PROCESADOS | 3,449,920 | 3,247,685 | 505.2 | 4,243,750 | 76.5% | 996,065 | −118.6 |
| SIN CENTRO | 775,000 | 578,050 | — | — | — | — | — |
| **Total** | **10,254,040** | **9,591,869** | **4,749** | **13,042,447** | **63%** | **4,134,824** | **49** |

**Siguiente paso:** el desborde de **CRIBACF** (necesita ~108% de su capacidad mensual) es el único punto de riesgo; si quieres, reviso el plan semanal de ese centro para ver dónde concentra el exceso.

---

| [⬆ top](#fila-73) | `wrun_01M0EZRBQHS7TWXR0KM5F47ASA` | **Estado real:** completed · **Duración:** 36 s · **steps:** 4 · **tool calls:** 4 · **tokIn:** 99,774 · **tokOut:** 3,047 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-74"></a>
## 74. ¿Qué módulos del MRP puedes consultar para esta empresa? — 8 s

### Respuesta del agente

**Temas del MRP/Forecast de ICF que puedo consultar** con datos en vivo:

| Ruta | Qué responde |
|---|---|
| **Validación de insumos** | Si alcanzan los materiales para producir y el % de cobertura |
| **Concentrado de familias** | Piezas/kilos semanales a producir por familia |
| **Programa de arribos** | Recepciones proyectadas a 12 semanas y cobertura de materia prima |
| **Faltantes de materia** | Faltantes de materia prima/insumos/concentrado por familia |
| **Desglose de forecast** | Forecast y plan de producción semana a semana + venta real embarcada |
| **Indicadores** | Cumplimiento de producción, forecast vs. venta real, eficiencia por centro |
| **Programa mensual** | Situación y avance del plan semanal por centro de trabajo |
| **Inventario semanal** | Saldo de inventario de artículos y presupuesto VACA |
| **Presupuesto VACA** | Disponibilidad y presupuesto de venta de la línea VACA |
| **Modelado de centros** | Capacidad de centros/estaciones y balanceo de carga |
| **Capacidad de centros** | Horas/piezas de capacidad real por centro |
| **Artículos (prototipos)** | Costeo y lista de materiales de artículos en desarrollo |
| **Plan de producción** | Programa de producción semanal por centro y semana |
| **Cumplimiento por artículo/centro** | Indicador de cumplimiento del periodo |

Consultas de solo lectura del portal MRP (desglose, cobertura, explosión de materiales, faltantes, indicadores) están disponibles directamente; las que regeneran el plan no se ejecutan al vuelo.

La sesión fija del módulo es `MASERP` con ejercicio y periodo cargados (plan 2026 · Periodo 8 ya con datos). ¿Sobre cuál de estos temas quieres el detalle?

---

| [⬆ top](#fila-74) | `wrun_01M0EZSHXZ72MQAH5B5S9SNZYK` | **Estado real:** completed · **Duración:** 8 s · **steps:** 1 · **tool calls:** 0 · **tokIn:** 24,849 · **tokOut:** 550 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---

<a id="pregunta-75"></a>
## 75. ¿Cuál es el estado general de la planeación de producción de ICF? — 16 s

### Respuesta del agente

**Planeación de producción ICF — Programa mensual (ocupación general del **63%**)**

La planta opera con capacidad holgada en promedio, pero hay un foco de saturación: **CRIBACF supera su capacidad al 107.8%**, mientras ENVCF queda al 46.4% y PROCESADOS al 76.5%.

| Centro | Venta | A Producir | Ocupación (pzas) | Cap. hrs | Horas prog. | % Ocup. |
|---|---|---|---|---|---|---|
| **CRIBACF** | $1,457,500 | 1,466,132 | 1,359,936 | 629.6 | 678.8 | **107.8%** |
| CRIBACF2 | $2,400,000 | 2,578,588 | 3,352,073 | 1,240.1 | 954.0 | 76.9% |
| ENTEROS | $36,720 | 36,720 | 321,399 | 266.5 | 30.4 | 11.4% |
| ENVCF | $2,027,400 | 1,606,236 | 3,458,208 | 1,801.2 | 836.6 | 46.4% |
| JAMAICA | $40,000 | 62,240 | 117,001 | 174.1 | 92.6 | 53.2% |
| PAQUETERIA | $67,500 | 16,218 | 190,080 | 132.0 | 11.3 | 8.5% |
| PROCESADOS | $3,449,920 | 3,247,685 | 4,243,750 | 505.2 | 386.6 | 76.5% |
| SIN CENTRO | $775,000 | 578,050 | — | — | — | — |
| **Total** | **$10,254,040** | **9,591,869** | **13,042,447** | **4,749** | **2,990** | **63%** |

**Siguiente paso:** revisar la carga de **CRIBACF** (sobrecupación del 7.8%, ~49 horas por encima de su capacidad) para rebalancear hacia CRIBACF2, que tiene 286 horas libres.

Dato base: programa mensual para usuario MASERP. Si quieres el detalle por semana, lo concentro por centro.

---

| [⬆ top](#fila-75) | `wrun_01M0EZSY3XRF3R1WEME0A7PDE2` | **Estado real:** completed · **Duración:** 16 s · **steps:** 4 · **tool calls:** 3 · **tokIn:** 88,806 · **tokOut:** 1,212 · **errores:** 0 (tools: 0 · skills: 0 · turno: 0) · **warnings:** 0 |
|---|---|---|

---
