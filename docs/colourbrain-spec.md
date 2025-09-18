## ColourBrain Twitch — Especificación funcional y técnica (v0.1)

### Objetivo
Adaptación del juego ColourBrain para directo en Twitch con 3 interfaces:
- Jugadores (`player-app`)
- Presentador (`presenter-app`)
- Escena OBS/Marcador (`board-app` a 1920x1080)

Backend único en PHP + MySQL que orquesta la partida y emite eventos en tiempo real.

---

## 1) Roles y responsabilidades

- **Jugadores**: seleccionan 1..11 colores por turno y envían su respuesta. Tras enviar o al llegar el tiempo a 0, su UI queda bloqueada hasta el siguiente turno.
- **Presentador**: inicia partida, lanza turnos, controla el temporizador, revela la respuesta correcta y avanza al siguiente turno. Puede reiniciar la partida (acción destructiva con confirmación).
- **OBS/Marcador**: composición 1920x1080 que muestra nombres de equipos, puntuaciones, número de turno, pregunta, temporizador, respuestas de jugadores al finalizar el tiempo y la respuesta correcta cuando el presentador la revele. Destaca quién/es han ganado el turno.

---

## 2) Mecánica del juego

- Los jugadores parten con 0 puntos.
- El número de equipos es fijo: 4. Los nombres pueden editarse en cualquier momento desde la interfaz del presentador.
- Cada jugador dispone de 11 cartas (colores) con las opciones definidas en `colors`.
- Flujo por turno (detallado):
  0) Estado inicial tras “Iniciar partida”: `current_turn=0`, `phase='idle'`, `additional_points` conservado o 0, `correct_answer_shown=0`, `turn_end_at=null`; UI de OBS sin pregunta, sin respuestas y sin solución; marcador a 0s.
  1) El presentador pulsa “Iniciar turno” → el backend incrementa `current_turn` (N → N+1), selecciona aleatoriamente una pregunta con `asked=0` y `turn_id=0`, marca esa pregunta como usada (`asked=1`, `turn_id=current_turn`) y fija `turn_end_at = now + 90s`.
  2) La pregunta aparece para todos (OBS muestra texto y pista `requiredColorsCount`). El botón “Enviar” en jugadores está deshabilitado hasta seleccionar ≥1 color.
  3) Cada envío bloquea la UI del jugador para el turno actual. Solo se admite una respuesta por jugador por turno (idempotencia).
  4) Al llegar el temporizador a 0, el backend deja de aceptar respuestas (bloqueo). OBS muestra las respuestas de cada equipo. En el presentador se habilita el botón “Mostrar respuesta correcta”.
  5) El presentador pulsa “Mostrar respuesta correcta” → OBS revela la solución correcta y se resaltan los acertantes. Se recalculan y aplican puntos: cada acertante suma `1 + additional_points`. Si no hay acertantes, `additional_points = additional_points + 1`; si los hay, `additional_points = 0`.
  6) El presentador pulsa “Siguiente pregunta” (o “Iniciar turno” de nuevo) para el siguiente turno. Si no quedan preguntas con `asked=0`, se muestra FIN DE LA PARTIDA en OBS.
- Puntuación:
  - Valor del bote del turno = `1 + additional_points`.
  - Si nadie acierta, `additional_points = additional_points + 1` y nadie suma puntos.
  - Si hay uno o más acertantes, cada acertante recibe `1 + additional_points` puntos y `additional_points` se resetea a `0`.
- Persistencia de preguntas:
  - Al mostrarse una pregunta (al iniciar el turno), se marca `asked=1` y `turn_id=<turno>` en `questions`. Las con `asked=1` y `turn_id != 0` no vuelven a salir en la partida actual.
- Validación de respuesta:
  - Comparar `color_ids` del jugador contra `correctColorIds` de la pregunta tras ordenar ascendente ambos arrays de IDs numéricos. Igualdad exacta => acierto.
  - Pista visible en OBS: la pregunta muestra entre paréntesis el número de colores de la solución (por ejemplo "(4)"). Este valor se expone como `requiredColorsCount`.

---

## 3) Modelo de datos (MySQL)

Tablas existentes (resumen):
- `colors(id, name, hex_value)`
- `players(id, name, points)`
- `questions(id, text, correctColorIds, asked, turn_id)`
- `answers(id, player_id, color_ids, question_id, turn_id)`
- `game_state(id, current_turn, additional_points, correct_answer_shown, previous_points)`

Mejoras propuestas (no destructivas):
- `answers`: índice único lógico `(player_id, turn_id)` para evitar múltiples envíos; en backend se aplicará idempotencia. Si no se puede añadir restricción, el backend rechazará segundas respuestas.
- `game_state`: añadir `phase ENUM('idle','question','reveal','intermission')` y `turn_end_at DATETIME NULL`. Alternativa: mantener en memoria y persistir solo `turn_end_at`.
- `questions`: índice para filtrar rápido `asked=0 OR turn_id=0`.

Estados clave en `game_state`:
- `current_turn`: contador 1..N de la partida.
- `additional_points`: bote acumulado.
- `correct_answer_shown`: flag de si se reveló la solución en el turno actual.
- `turn_end_at`: instante ISO del fin de turno (autoridad del tiempo).
- `phase`: fase del ciclo del turno.

---

## 4) Máquina de estados (turno)

- `idle` → `question` (acción: “Iniciar turno”). Efectos: `current_turn = current_turn + 1`, seleccionar pregunta aleatoria con `asked=0` y `turn_id=0`, marcarla `asked=1, turn_id=current_turn`, `turn_end_at = now + 60s`, `correct_answer_shown=0`.
- `question` → (llega timeout) → habilitar “Mostrar respuesta correcta” en presentador y mostrar respuestas en OBS. La fase puede permanecer `question` hasta revelar o alternarse a un subestado de bloqueo.
- `question` → `reveal` (acción del presentador: “Mostrar respuesta correcta”). Efectos: revelar solución, calcular acertantes y aplicar puntos; si no hay acertantes, incrementar `additional_points`, si hay, resetearlo a 0.
- `reveal` → `idle` o `question` (acción: “Siguiente turno”). Si no quedan preguntas con `asked=0`, pasar a `idle` y mostrar FIN DE LA PARTIDA.

Reglas:
- Durante `question`: aceptar 0..1 respuesta por jugador; al llegar `turn_end_at` no se aceptan más.
- Paso a `reveal`: congelar recepción de respuestas si no se había alcanzado el tiempo.

---

## 5) Backend (PHP + MySQL)

- Lenguaje/versión: PHP 8.2+.
- Framework sugerido: Slim 4 (routing ligero) + PDO. Alternativa: Laravel si se prefiere ecosistema completo.
- Tiempo real: Server-Sent Events (SSE) sobre endpoint `/api/events/stream`. Los clientes calculan el countdown local a partir de `turn_end_at`; el backend es la autoridad del fin.
- Seguridad:
  - Sin autenticación ni rate limiting (entorno controlado).
  - CORS abierto a las aplicaciones del entorno si fuese necesario.
  - Validación y saneamiento de entrada.
- Concurrencia y consistencia:
  - Uso de transacciones para cierre de turno y reparto de puntos.
  - Idempotencia: reenviar “mostrar respuesta” o “siguiente turno” no debe duplicar efectos.

### 5.1 Endpoints REST (propuestos)

- `GET /api/colors` → lista de colores.
- `GET /api/players` → lista de jugadores (id, name, points).
- `GET /api/state` → snapshot: `phase, current_turn, additional_points, correct_answer_shown, turn_end_at, turn_duration_seconds, active_question`.
  - `active_question` devuelve `{ id, text, requiredColorsCount }` (no incluye `correctColorIds`).
- `GET /api/answers/current` → respuestas agregadas del turno actual (para OBS/presenter tras timeout).
- `POST /api/player/answer` → body: `{ playerId: number, colorIds: number[] }`.
  - Devuelve `200` con `{ accepted: true, ignored: false }` si se registra la primera respuesta del jugador en el turno.
  - Devuelve `200` con `{ accepted: false, ignored: true, reason: 'duplicate'|'timeout' }` si ya había respondido o si llegó tarde. No se modifica el estado.
- `PATCH /api/players/:id` → body: `{ name: string }`. Renombra equipo. Devuelve el jugador actualizado y emite SSE `players_updated`.
- `POST /api/presenter/start-game` → inicializa partida (turno=0, bote=0). Efectos:
  - `game_state.current_turn = 0`, `phase='idle'`, `correct_answer_shown=0`, `turn_end_at=null`.
  - `players.points = 0` para todos los jugadores.
  - `questions.asked = 0` y `questions.turn_id = 0` para todas las preguntas.
  - (Opcional) vaciar `answers` de la partida anterior.
- `POST /api/presenter/start-turn` → incrementa turno, selecciona y marca pregunta, fija `turn_end_at = now + TURN_DURATION_SECONDS`, `phase='question'`. Si no quedan preguntas (`asked=0` inexistente), devuelve 409 y se mantiene en `idle` (UI: “FIN DE LA PARTIDA”).
- `POST /api/presenter/show-correct` → `phase='reveal'`, calcula acertantes y aplica reparto (cada acertante recibe `1 + additional_points`; si nadie acierta, `additional_points++`; si alguien acierta, `additional_points=0`).
- `POST /api/presenter/next-turn` → aplica puntos, incrementa turno, resetea flags y arranca nuevo turno o pasa a `idle` si no hay preguntas.
- `POST /api/presenter/reset-game` → resetea puntuaciones, estado, respuestas y flags. Requiere confirmación desde la UI.

Notas:
- Selección de pregunta: `SELECT * FROM questions WHERE (asked=0 OR turn_id=0) ORDER BY RAND() LIMIT 1` evitando las ya usadas.
- Comparación de respuestas: convertir `color_ids` y `correctColorIds` a arrays de enteros ordenados y comparar.

### 5.2 SSE — Eventos

Endpoint: `GET /api/events/stream` (SSE, `text/event-stream`)

Eventos emitidos:
- `state` — snapshot periódico al conectar y en cambios relevantes.
- `turn_started` — `{ turn, question: { id, text, requiredColorsCount }, turnEndAt, turnDurationSeconds, additionalPoints }`
- `answers_locked` — cuando `turn_end_at` alcanzado.
- `answers_updated` — opcional, conteo o payload anonimizado durante el turno (sin revelar quién).
- `correct_revealed` — `{ correctColorIds: number[] }`
- `scores_updated` — `{ players: {id, points}[] }`
- `players_updated` — `{ players: {id, name, points}[] }` tras renombrar equipos.
- `turn_finished` — al finalizar reparto y antes del siguiente turno.

---

## 6) Contratos Frontend (TypeScript)

Tipos compartidos (equivalentes):
- `Color { id: number; name: string; hexValue: string }`
- `Player { id: number; name: string; points: number }`
- `Question { id: number; text: string; correctColorIds: number[]; asked: boolean; turnId: number }`
- `GameState { phase: 'idle'|'question'|'reveal'|'intermission'; currentTurn: number; additionalPoints: number; correctAnswerShown: boolean; turnEndAt?: string; activeQuestion?: Pick<Question,'id'|'text'> }`
- `PlayerAnswer { playerId: number; colorIds: number[]; questionId: number; turnId: number }`
- `SseEvent<T> { type: string; payload: T }`

---

## 7) Flujos por interfaz

### 7.1 Player-app
- Suscribirse a SSE para `state/turn_started/answers_locked/correct_revealed/scores_updated`.
- Mostrar `activeQuestion` y countdown local a `turnEndAt`.
- Habilitar selección de colores; `Enviar` activo si `colorIds.length >= 1`.
- Enviar respuesta una única vez. Tras enviar, UI bloqueada. Si llega timeout antes de enviar, bloquear.
- Mostrar feedback “Respuesta enviada” o “Sin respuesta a tiempo”.

### 7.2 Presenter-app
- Panel con: estado, turno, pregunta actual, control de tiempo (solo lectura), bote, botón “Mostrar respuesta correcta” y “Siguiente turno”, además de “Reiniciar partida”.
- Vista de respuestas por jugador tras timeout (cuando el temporizador llega a 0). El botón “Mostrar respuesta correcta” permanece deshabilitado hasta entonces.
- Confirmación modal al reiniciar.

### 7.3 Board-app (OBS 1920x1080)
- Layout y composición:
  - Temporizador grande, muy legible, ubicado en la parte superior o inferior del lienzo.
  - Tarjeta central con la pregunta del turno. Encima, más pequeño, el texto "Turno N".
  - La pregunta incluye la pista en paréntesis con `requiredColorsCount`, por ejemplo: "(4)".
  - En las cuatro esquinas: cada equipo con su nombre, puntuación en dos dígitos, y una fila de tarjetitas con los colores de su respuesta cuando corresponda.
  - Si un equipo no responde, su fila de tarjetitas queda vacía (no mostrar marcador de texto).
  - El bote (`additional_points`) puede mostrarse en la cabecera junto al temporizador o al número de turno.
- Estados visuales:
  - `idle`: ocultar pregunta, soluciones y respuestas; temporizador a 0.
  - `question`: mostrar pregunta y temporizador; ocultar soluciones y respuestas de jugadores.
  - Timeout alcanzado: mostrar las respuestas de cada equipo; aún no mostrar la solución hasta que el presentador lo indique.
  - `reveal`: bajo la pregunta, mostrar las tarjetitas de la respuesta correcta y resaltar al/los ganadores del turno.
  - Si no quedan preguntas: mostrar mensaje de FIN DE LA PARTIDA.

---

## 8) Reglas de puntuación (detalladas)

- Sea `bote = additional_points`. Por defecto `bote=0` al inicio.
- Si en un turno no hay ningún acertante: `bote = bote + 1` y no se suman puntos a nadie.
- Si hay uno o varios acertantes: cada acertante recibe `1 + bote` puntos y `bote` pasa a `0`.

---

## 9) Temporizador y autoridad del tiempo

- Autoridad: backend fija `turn_end_at` (UTC). Los clientes calculan el countdown localmente.
- Al alcanzar `turn_end_at`, el backend:
  - Cierra ventana de recepción de respuestas.
  - Emite `answers_locked`.
- Resiliencia: si un cliente se reconecta, lee `GET /api/state` y recalcula el countdown.

---

## 10) Seguridad y sesiones

- Sin autenticación ni protección por contraseña: entorno controlado.
- Los jugadores se identifican por `playerId` (URL parametrizada o selección inicial en su app).
- Limitar a una respuesta por jugador y turno. Envíos duplicados o tardíos se ignoran y la API responde `200 { accepted: false, ignored: true, reason }`.
- No se aplicará rate limiting.

---

## 11) Errores y borde

- Jugador duplica envío: devolver 409/200 idempotente sin cambiar el registro original.
- Jugador intenta enviar tras timeout: 423 Locked.
- Sin preguntas disponibles: `start-turn` devuelve 409 y se mantiene en `idle`.
- Reconexión SSE: soportar reintentos con `Last-Event-ID` opcional.

---

## 12) Deploy y configuración

- Variables: `DB_*`, `CORS_ORIGINS`, `TURN_DURATION_SECONDS` (por defecto 90).
- Build Angular 20 en `board-app`, `player-app`, `presenter-app` (servir estáticos con Nginx/Apache u hostear aparte). Backend PHP en hosting compatible.

---

## 13) Decisiones confirmadas

- Reparto del bote: cada acertante recibe `1 + additional_points`; no se divide.
- Duración del turno: fija en 90s, configurable por `TURN_DURATION_SECONDS`.
- Equipos: 4 fijos; nombres editables desde el presentador y reflejados en OBS.
- Reset de partida: vacía `answers`, pone `players.points=0`, `questions.asked=0` y `turn_id=0`, y reinicia `game_state`.
- Sin rate limit ni autenticación de interfaces.
- Envíos duplicados o tardíos: ignorados (API responde `200 { accepted:false, ignored:true }`).
- Colores: fijos según la tabla `colors`.

---

## 14) Consideraciones de implementación (arquitectura)

- **Capas**: Controllers (HTTP), Services (dominio), Repositories (DB), DTOs/Models.
- **Servicios Angular**: servicios de datos (HTTP) que devuelven Observables, y servicios de estado (SSE + RxJS) por app. Componentes presentacionales sin lógica de negocio.
- **Complejidad por función**: mantener < 15; preferir composición y funciones puras.
- **Comentarios**: JSDoc/PHPDoc para funciones públicas.
- **Testing**: unit tests de servicios de dominio (comparación de respuestas, reparto de puntos, selección de preguntas).

---

Changelog
- v0.1: Documento inicial a revisar y completar con tus respuestas a las dudas.
