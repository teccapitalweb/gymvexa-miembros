# Progreso + Rachas — diseño detallado (App de Miembros Gymvexa)

> **Tipo:** Diseño de documento. **NO** construye features ni toca código/reglas/backend/deploy.
> Define **qué mostrar** (progreso + racha de asistencia), **de dónde salen los datos**
> (la decisión clave de permisos: abrir reglas vs. endpoint del backend), **cómo se ve
> en la app** (Quiet Neon, SVG, sin emojis), un **plan por fases**, y los
> **prerrequisitos**. El objetivo es enganchar al socio (estilo Duolingo/Hevy): que vea
> su avance y su racha y quiera no romperla.

---

## 0. Lo que YA existe (cotejado en el repo)

| Pieza | Dónde | Estado para este diseño |
|---|---|---|
| **Asistencias** (insumo de rachas) | `gyms/{gymId}/asistencias`, las crea el **backend** en el check-in (`POST /api/socios/checkin`) — ver `src/stores/checkin.js:1-12` y `src/services/backend.js:295-361`. Hace **toggle** entrada/salida (`tipo`, `duracionMinutos`). | El dato existe. **Pero el socio NO lo puede leer hoy** (ver siguiente fila). |
| **Reglas de `asistencias`** | `C:\dev\gymteck\firestore.rules:118-122` → `read: if isStaff(gymId)`. | **Solo-staff.** El socio (claim `role:"socio"`) **no** puede leer la colección directamente. Este es el reto central de §2. |
| **`totalVisitas`** (contador) | Ficha del socio `gyms/{gymId}/socios/{socioId}`; se pinta en `src/views/PerfilView.vue:62` (`d.totalVisitas ?? 0`). | **Legible HOY por el socio**: la regla de la ficha permite lectura propia — `firestore.rules:89` (`isStaff(gymId) || isSocioDe(gymId, socioId)`). El socio ya la consume vía `onSnapshot` en `src/stores/socio.js:191-206`. |
| **`ultimaVisita`** | Ficha del socio (mismo doc que arriba). | Legible HOY por el socio (misma regla). Útil como "última vez que viniste", **no** basta para una racha (ver §1). |
| **Precedente: lectura propia por `socioId`** | `membresias` y `transacciones` ya abren lectura al socio acotada a lo suyo — `firestore.rules:109-111` y `180-182` (`esSocioDelGym(gymId) && resource.data.socioId == request.auth.token.socioId`). | **Patrón exacto** que reutilizaríamos si optamos por abrir reglas en `asistencias` (Opción A, §2). |
| **Precedente: backend calcula y devuelve resumen** | Endpoint de cumpleaños `obtenerCumpleanosHoy()` — `src/services/backend.js:379-415` (el backend lee con Admin SDK lo que las reglas no dejan leer al cliente y devuelve solo el resultado). | **Patrón exacto** que reutilizaríamos para un endpoint de progreso/racha (Opción B, §2). |
| **El socio NUNCA escribe Firestore** | Todo pasa por backend con Admin SDK (claim `role:"socio"`). El check-in lo confirma: `checkin.js:1-12`. | Cualquier dato nuevo (Fase 3, "cumplir rutina") debe escribirlo el backend, no el cliente. |
| **Rutina activa** | `localStorage['gv-rutina-activa']` — `src/views/RutinasView.vue:10`. Trae los días programados. | **Solo en el dispositivo.** Sirve para la racha de "cumplir rutina" (Fase 3), pero hoy no hay registro de qué días entrenó vs. su plan. |
| **Idioma visual** | Quiet Neon: `card`, `stat`, `kicker`, `metric`, `chip`, `chip--{tono}` — ver `PerfilView.vue:57-78`. Barra de progreso de membresía ya existe en `InicioView.vue:40-49`. | Reutilizamos estas clases; la "racha" es una pieza visual nueva en el mismo lenguaje. |

> ⚠️ **Honestidad sobre el esquema de `asistencias`:** los campos exactos del doc
> (`socioId`, `fecha` `YYYY-MM-DD`, `entradaHora`, `salidaHora`, `tipo`…) los escribe el
> **backend** (`C:\dev\gymvexa-backend`), no este repo, así que aquí no se pueden citar
> línea a línea. El diseño asume `socioId` + una **fecha de día** (`fecha` `YYYY-MM-DD`)
> por documento; **confirmar el esquema real en el backend es un prerrequisito** (§5).

---

## 1. QUÉ MOSTRAR

### 1.1 Definición de RACHA (la pieza estrella)

Para enganchar, la racha debe ser **fácil de entender**, **fácil de mantener viva** y
**difícil de romper por accidente**. Hay dos granularidades posibles; recomendamos la
**semanal** como racha principal y la diaria como dato secundario.

**🔥 Racha principal — semanas consecutivas cumpliendo tu meta (RECOMENDADA).**
- **Definición:** una semana "cuenta" si el socio asistió **≥ N días** esa semana
  (lun–dom). Racha = nº de semanas consecutivas que cumplen, contando hacia atrás desde
  la semana actual.
- **Meta N:** por defecto **3 días/semana**. Si hay rutina activa (`gv-rutina-activa`),
  N = nº de días programados de su plan; si no, N = 3.
- **Por qué semanal:** nadie entrena 7 días seguidos; una racha diaria estricta se rompe
  el primer día de descanso y desmotiva. La semanal premia la **constancia real** y
  tolera los días de descanso (que son parte de entrenar bien).
- **Tolerancia / semana en curso:** la semana actual está "en progreso" hasta el domingo;
  no rompe la racha hasta que termina incumplida. Mostramos "vas 2/3 esta semana".

**🔥 Racha secundaria — días seguidos asistiendo (estilo Hevy/Duolingo, opcional).**
- **Definición:** nº de días consecutivos con al menos una asistencia, contando hacia
  atrás desde hoy (o ayer, con tolerancia de 1 día para no castigar el descanso de hoy).
- Más "adictiva" visualmente pero más frágil. La dejamos como dato/medalla, no como la
  racha que define el héroe de la pantalla.

> **Regla de oro:** la racha se calcula **solo de asistencias reales** (`fecha` por día).
> No inventamos datos. Un día con entrada y salida = un día asistido.

### 1.2 PROGRESO — el panel de métricas

Separadas por **lo que se puede mostrar HOY** vs. **lo que requiere leer asistencias**:

**Disponible HOY sin tocar permisos** (solo con la ficha que el socio ya lee):
- **Total de visitas** — `totalVisitas` (ya se muestra en Perfil, `PerfilView.vue:62`).
- **Última visita** — `ultimaVisita` ("Entrenaste hace 2 días").

**Requiere leer las asistencias del socio** (Opción A o B de §2):
- **Racha actual** (🔥 semanas o días, §1.1) — el gancho.
- **Racha más larga** (récord histórico) — "Tu mejor racha: 9 semanas".
- **Visitas este mes** / **esta semana** — "8 visitas en junio".
- **Días entrenados** (total de días distintos) — base del heatmap.
- **Promedio por semana** (últimas 4–8 semanas) — "Promedio: 3.2 días/sem".
- **Mejor día/hora** (opcional, de `entradaHora`) — "Sueles venir los martes".

### 1.3 Calendario / heatmap y logros (Fase 2)

- **Heatmap estilo GitHub:** cuadrícula de las últimas ~12–16 semanas; cada celda = un
  día, intensidad por asistencia (0/1; o por duración si está). Refuerza la racha de un
  vistazo y motiva a "llenar la cuadrícula".
- **Logros / hitos** (medallas desbloqueables, sin inflar datos):
  - Visitas: **10 / 25 / 50 / 100 / 250** visitas.
  - Racha: **🔥 4, 8, 12 semanas** (o **7, 14, 30 días** si usamos la diaria).
  - Constancia: **"Mes perfecto"** (cumpliste meta las 4 semanas del mes).
  - Primeros pasos: **"Primer check-in"**, **"Primera semana completa"**.
- Los logros se **derivan** de las mismas métricas (no necesitan colección nueva en
  Fase 2): se calculan al vuelo desde asistencias + `totalVisitas`. Persistir el momento
  de desbloqueo (para notificar "¡acabas de desbloquear…!") sería un extra de fase futura.

### 1.4 Lo que NO se puede mostrar hoy (sé honesto)

- **"Cumpliste tu rutina"** (entrenaste justo los días/grupos de tu plan): hoy **no hay
  registro** de qué entrenó el socio, solo de que **asistió**. Asistir ≠ seguir la rutina.
  Esto es **Fase 3** y requiere datos nuevos (§4).
- **Progreso de fuerza/peso levantado** (PRs estilo Hevy): no hay logging de series/peso.
  Fuera de alcance de este documento.

---

## 2. DE DÓNDE SALEN LOS DATOS — el reto de permisos

El progreso real (racha, visitas/mes, heatmap) sale de **las asistencias del socio**, que
hoy son **solo-staff** (`firestore.rules:118-122`). Hay dos caminos. **Recomendamos B
(endpoint del backend)** para el resumen, con A como posible complemento solo si luego
queremos un heatmap "en vivo".

### Opción A — Abrir lectura de SUS asistencias al socio (reglas de Firestore)

Añadir a `match /asistencias/{asistenciaId}` una cláusula de lectura propia, calcando el
patrón ya probado en `membresias`/`transacciones` (`firestore.rules:109-111`, `180-182`):

```
// PROPUESTA (NO aplicar aún): lectura propia del socio, acotada a lo suyo.
allow read: if isStaff(gymId)
            || (esSocioDelGym(gymId)
                && resource.data.socioId == request.auth.token.socioId);
```

- **Pros:** sin código de backend; la app lee/escucha en vivo (heatmap reactivo);
  consistente con el precedente del proyecto.
- **Contras / cuidados:**
  - `resource.data.socioId` aplica a `get` de **un doc**; para **listar** ("dame mis
    asistencias del mes") se necesita una **query con `where('socioId','==', miSocioId)`**
    y Firestore exige que la query esté **filtrada por ese mismo campo** para pasar las
    reglas. Hay que **verificar que el doc de asistencia guarda `socioId`** (prerrequisito,
    §5) — si la asistencia se identifica por otro campo, la regla no protege bien.
  - Posible **índice compuesto** (`socioId` + `fecha`) para rangos por fecha → un
    `failed-precondition` ya está contemplado en el manejo de errores (`socio.js:238-241`).
  - Expone el **documento completo** de asistencia al socio (lo que haya ahí), no solo
    lo que queremos mostrar. Menos control de superficie.

### Opción B — Endpoint de resumen en el backend (RECOMENDADA para Fase 1)

Un endpoint nuevo, p. ej. `GET /api/socios/progreso`, autenticado por **ID token** (como
todos los demás: `vincular`, `checkin`, `cumpleanos-hoy`). El backend toma `gymId`/`socioId`
del **claim**, lee las asistencias con **Admin SDK** (sin tocar reglas), **calcula** racha,
récord, visitas/mes, días entrenados y (opcional) el array para el heatmap, y devuelve un
**resumen compacto**. Es exactamente el patrón de `obtenerCumpleanosHoy()`
(`backend.js:379-415`).

Respuesta propuesta (forma, no implementación):
```json
{
  "ok": true,
  "rachaSemanas": 3,
  "rachaRecordSemanas": 9,
  "metaSemanal": 3,
  "estaSemana": { "asistidos": 2, "meta": 3 },
  "totalVisitas": 128,
  "visitasMes": 8,
  "visitasSemana": 2,
  "diasEntrenados": 96,
  "ultimaVisita": "2026-06-23",
  "heatmap": [ { "fecha": "2026-06-23", "v": 1 }, ... ],   // opcional
  "logros": ["100_visitas", "racha_8_semanas"]            // opcional
}
```

- **Pros:** **más seguro** (la app nunca lee la colección cruda; el backend controla la
  superficie exacta); la **lógica de racha vive en un solo lugar** (no se duplica entre
  cliente y reglas); robusto a cambios de esquema; degrada en silencio como el de
  cumpleaños. La fórmula de racha (semanas, meta, tolerancia) puede evolucionar sin tocar
  la app ni las reglas.
- **Contras:** requiere trabajo en `C:\dev\gymvexa-backend` (no es solo-app); no es
  reactivo en vivo (es un fetch puntual al abrir la pantalla — perfectamente aceptable,
  es un resumen que cambia una vez al día).

### Recomendación

- **Fase 1 → Opción B (endpoint).** La racha y el progreso son un **resumen calculado**;
  centralizar la fórmula en el backend es más limpio y seguro, y reutiliza un patrón que
  ya existe en el repo (cumpleaños). La app solo añade un `obtenerProgreso()` en
  `services/backend.js` y una vista que lo pinta.
- **Heatmap (Fase 2):** puede venir **dentro del mismo endpoint** (array `heatmap`). Solo
  si más adelante queremos un calendario **reactivo en vivo** consideraríamos **además**
  la Opción A (abrir reglas) para escuchar asistencias en tiempo real. No es necesario al
  inicio.

---

## 3. CÓMO SE VE EN LA APP

### 3.1 Dónde vive — recomendación

- **Vista nueva `/progreso`** (con su entrada en `BottomNav`/`MenuDrawer` y ruta
  `requiereSocio` en `router/index.js`). Es el "lugar" del avance: racha grande, métricas,
  heatmap y logros. Le da espacio para crecer (Fases 2–3).
- **Gancho en el Inicio:** una **tarjeta-resumen de racha** en `InicioView.vue` ("🔥 3
  semanas — vas 2/3 esta semana", botón "Ver progreso"). Es lo primero que el socio ve al
  abrir la app: el recordatorio que sostiene el hábito (estilo Duolingo). El número de
  visitas en **Perfil** se queda como está.

> Resumen: **Inicio engancha (mini-racha) → `/progreso` profundiza.**

### 3.2 Elementos visuales (Quiet Neon · SVG · sin emojis en UI)

- **Héroe de racha:** número grande (`metric`) con un **ícono de fuego en SVG** (degradado
  neón) que "se aviva" con la racha (más alta = más glow). Subtítulo: "semanas seguidas".
  El concepto de fuego se dibuja en SVG (nada de emoji 🔥 en la UI; aquí en el doc sí).
  Estado apagado/gris cuando la racha es 0 ("Empieza tu racha esta semana").
- **Anillo "esta semana":** anillo de progreso SVG `asistidos/meta` (2/3) — refuerza la
  acción inmediata: "te falta 1 para mantener la racha".
- **Tira de métricas:** reutiliza `.stats` + `.stat` + `.kicker` + `.metric`
  (`PerfilView.vue:59-67`): Visitas mes · Récord · Días entrenados · Promedio/sem.
- **Heatmap (Fase 2):** cuadrícula SVG/CSS-grid de celdas redondeadas; intensidad por
  tono neón; etiquetas de mes discretas. Sin librerías pesadas.
- **Logros (Fase 2):** chips/medallas (`.chip`, `.chip--{tono}`) con ícono SVG;
  desbloqueadas a color, bloqueadas en gris con candado.
- **Estados vacíos:** sin asistencias aún → mensaje cálido + CTA a `/checkin`
  ("Haz tu primer check-in para empezar tu racha").

---

## 4. PLAN POR FASES

### Fase 1 — Racha de asistencia + progreso básico (máximo valor, mínimo riesgo)
- **Backend (`C:\dev\gymvexa-backend`):** endpoint `GET /api/socios/progreso` que lee
  asistencias por Admin SDK y devuelve el resumen (§2 Opción B): racha semanal, récord,
  visitas mes/semana, días entrenados, última visita, meta.
- **App (este repo):**
  - `services/backend.js`: `obtenerProgreso()` (calca el patrón de `obtenerCumpleanosHoy`,
    `backend.js:379-415`; degrada a `null` si falla).
  - `stores/` (o un composable): estado de progreso.
  - Vista **`/progreso`** + ruta `requiereSocio` (`router/index.js`) + entrada en nav.
  - Héroe de racha + anillo "esta semana" + tira de métricas.
  - **Gancho en `InicioView.vue`:** mini-tarjeta de racha.
- **Reglas Firestore:** **sin cambios** (el backend lee, no el cliente).

### Fase 2 — Heatmap + logros/hitos
- **Backend:** ampliar el endpoint para incluir `heatmap[]` (últimas ~16 semanas) y/o
  `logros[]` desbloqueados (derivados; sin colección nueva).
- **App:** componente heatmap (SVG/grid) y sección de medallas en `/progreso`.
- **Reglas:** sin cambios. *(Opcional: si se quisiera heatmap reactivo en vivo, abrir
  lectura propia de `asistencias` — §2 Opción A — en `firestore.rules:118-122`.)*

### Fase 3 — Racha de "cumplir tu rutina" (la compleja; requiere datos nuevos)
- **Necesita registrar qué días entrenó vs. su plan** (`gv-rutina-activa`). Hoy solo
  sabemos que **asistió**, no qué hizo. Opciones de captura:
  - Botón "marcar entrenamiento hecho" en `/rutinas` → **el backend** persiste un registro
    (p. ej. `gyms/{gymId}/socios/{socioId}/entrenamientos` o similar). **El socio no
    escribe Firestore** (`checkin.js:1-12`), así que va por endpoint nuevo
    (`POST /api/socios/entrenamiento`).
  - Alternativa ligera: inferir "cumplió" si asistió en los días programados del plan
    (menos preciso; no confirma que hizo la rutina).
- **App:** UI para marcar día hecho; segunda racha ("cumpliste tu plan 4 semanas") en
  `/progreso`.
- **Reglas:** nueva colección de entrenamientos → nuevas reglas (lectura propia del socio,
  escritura solo backend). Es el mayor cambio de los tres.

### Tabla: dónde toca cada fase

| Fase | App (este repo) | Backend (`gymvexa-backend`) | Reglas (`gymteck/firestore.rules`) |
|---|---|---|---|
| **1** | ✅ vista + nav + héroe + gancho Inicio | ✅ `GET /api/socios/progreso` | ➖ sin cambios |
| **2** | ✅ heatmap + logros | ✅ ampliar payload | ➖ (➕ opcional si heatmap en vivo) |
| **3** | ✅ marcar entrenamiento + 2ª racha | ✅ `POST /api/socios/entrenamiento` | ➕ nueva colección entrenamientos |

---

## 5. PRERREQUISITOS (no construir aún)

1. **Confirmar el esquema real de `asistencias`** en `C:\dev\gymvexa-backend`: ¿guarda
   `socioId`? ¿hay un campo de **día** (`fecha` `YYYY-MM-DD`) o solo timestamp? ¿una
   asistencia = un día, o entrada/salida son docs separados? **Bloquea** tanto el cálculo
   de racha como la Opción A. (Aquí no se puede citar: lo escribe el backend, no este repo.)
2. **Decidir A vs. B** (recomendado: **B / endpoint** para Fase 1). Si fuera A, preparar
   la cláusula de `firestore.rules:118-122` calcando `membresias`/`transacciones`
   (`firestore.rules:109-111`) y prever **índice compuesto** `socioId`+`fecha`.
3. **Definir la fórmula de racha y la meta** con el negocio: ¿semanal (recomendado) o
   diaria? ¿meta = 3 fija, o = días del plan `gv-rutina-activa`? ¿tolerancia de la semana
   en curso? Esto fija el contrato del endpoint.
4. **Backend Fase 1:** crear `GET /api/socios/progreso` (auth por ID token, `gymId`/
   `socioId` del claim, Admin SDK). Define el JSON de §2 como contrato app↔backend.
5. **Confirmar `ultimaVisita`/`totalVisitas`** como nombres reales de campo en la ficha
   (`totalVisitas` ya verificado en `PerfilView.vue:62`; `ultimaVisita` a confirmar).
6. **Fase 3 (cuando aplique):** acordar el modelo de "entrenamiento hecho" (colección,
   reglas, endpoint de escritura) — el cambio más grande; **no** es prerrequisito de Fase 1.

---

## 6. Resumen ejecutivo

- **Qué mostrar:** una **racha de asistencia** como héroe (recomendado: **semanas
  consecutivas cumpliendo meta**, meta 3/sem o los días del plan), más **progreso**
  (visitas total/mes/semana, racha actual, récord, días entrenados), y en Fase 2 un
  **heatmap** estilo GitHub y **logros/hitos**. Honesto: "cumplir la rutina" (no solo
  asistir) es Fase 3 y necesita datos nuevos.
- **De dónde salen los datos:** de las **asistencias** del socio, hoy **solo-staff**
  (`firestore.rules:118-122`). Dos caminos: **(A)** abrir lectura propia en reglas (calca
  `membresias`/`transacciones`, `firestore.rules:109-111`) o **(B)** un **endpoint de
  resumen en el backend** (calca cumpleaños, `backend.js:379-415`). **Recomendado: B**
  para Fase 1 (más seguro, una sola fuente de la fórmula). `totalVisitas`/`ultimaVisita`
  ya son legibles por el socio HOY (`PerfilView.vue:62`, `socio.js:191-206`).
- **Cómo se ve:** **vista nueva `/progreso`** (racha grande en SVG-fuego, anillo "esta
  semana", métricas, heatmap, logros — Quiet Neon, sin emojis) + **gancho de mini-racha en
  el Inicio**.
- **Fases:** **1)** racha + progreso vía endpoint (app + backend, sin tocar reglas); **2)**
  heatmap + logros (ampliar endpoint); **3)** racha de "cumplir rutina" (datos nuevos:
  endpoint de escritura + colección + reglas).
- **Prerrequisitos:** confirmar esquema de `asistencias` en el backend, decidir A vs. B,
  fijar la fórmula/meta de racha, y crear el endpoint de progreso. **Nada de esto se
  construye aún.**
