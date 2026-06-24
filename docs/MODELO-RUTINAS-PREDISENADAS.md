# Rutinas prediseñadas — diseño detallado (App de Miembros Gymvexa)

> **Tipo:** Diseño de documento. **NO** construye features ni toca código/reglas/vistas.
> Detalla la **primera pieza concreta** del plan de fitness: un set de **rutinas
> prediseñadas** que el gym ofrece a sus socios (listas para seguir), más los
> **ejercicios faltantes** en el catálogo, la **estructura de datos**, el **flujo del
> socio**, y los **prerrequisitos/coordinación** entre repos.
>
> **Contexto (ver [`MODELO-FITNESS-APP.md`](./MODELO-FITNESS-APP.md)):**
> - El **catálogo de ejercicios** ya existe en el panel (`C:\dev\gymteck`):
>   `gyms/{gymId}/ejercicios`, **48 ejercicios** sembrados en
>   `src/data/ejerciciosBase.js` con id determinista `base_<baseKey>` e import
>   idempotente. **Hoy `read` es solo-staff** → el socio aún no lo puede leer.
> - **Catálogo cotejado en este diseño** (los 48 `baseKey` reales se usan abajo).
> - Britney trabaja en este repo y tiene `MaterialView` ("Rutinas y material",
>   placeholder) → **dónde vive "Rutinas" es punto a coordinar** (§6).

---

## 1. El set de rutinas prediseñadas

8 rutinas que cubren las estructuras más populares (Full Body, Upper/Lower, PPL) y los
3 objetivos clásicos (hipertrofia, definición, fuerza). **Válidas para hombres y
mujeres**; las de enfoque glúteo/pierna están etiquetadas pero abiertas a cualquiera.

Notación: `Ejercicio  series × reps` · descanso sugerido por bloque. `AMRAP` = todas
las que puedas con buena técnica. Todos los ejercicios referencian el catálogo por
`baseKey` (✅ ya existe · ➕ propuesto a agregar, ver §2).

### R1 — Full Body Principiante · 3 días · general
**Para quién:** quien empieza desde cero. **Nivel:** principiante · **Objetivo:** general
· **Días/sem:** 3 (lun/mié/vie) · descanso 60–90 s.

- **Día A:** Sentadilla goblet ➕ 3×12 · Press de pecho en máquina ✅ 3×12 · Jalón al
  pecho en polea ✅ 3×12 · Press de hombro con mancuernas ✅ 2×12 · Plancha ✅ 3×30 s
- **Día B:** Prensa de pierna ✅ 3×12 · Press inclinado con mancuernas ✅ 3×12 · Remo
  sentado en polea ✅ 3×12 · Curl con mancuernas alterno ✅ 2×12 · Extensión de tríceps
  en polea ✅ 2×12 · Crunch abdominal ✅ 3×15
- **Día C:** Peso muerto rumano ✅ 3×10 · Press de banca con barra ✅ 3×10 · Remo con
  mancuerna a una mano ✅ 3×12 · Elevaciones laterales ✅ 2×15 · Elevación de talones de
  pie ✅ 3×15

### R2 — Full Body Glúteo & Pierna · 3 días · general (enfoque glúteo)
**Para quién:** quien quiere priorizar glúteo/pierna (orientada a mujeres, abierta a
todos). **Nivel:** principiante · **Objetivo:** general/hipertrofia · **Días/sem:** 3.

- **Día A (glúteo dominante):** Hip thrust ✅ 4×12 · Sentadilla con barra ✅ 3×10 · Peso
  muerto rumano ✅ 3×10 · Abducción de cadera en máquina ✅ 3×15 · Plancha ✅ 3×30 s
- **Día B (tren superior):** Jalón al pecho en polea ✅ 3×12 · Press de hombro con
  mancuernas ✅ 3×12 · Remo sentado en polea ✅ 3×12 · Curl con mancuernas alterno ✅
  2×12 · Extensión de tríceps en polea ✅ 2×12
- **Día C (pierna/glúteo):** Sentadilla búlgara ✅ 3×12 · Zancadas ✅ 3×12 · Puente de
  glúteo ✅ 3×15 · Curl femoral tumbado ✅ 3×12 · Patada de glúteo en polea ✅ 3×15 ·
  Elevación de talones sentado ✅ 3×15

### R3 — Upper/Lower · 4 días · intermedio
**Nivel:** intermedio · **Objetivo:** hipertrofia/general · **Días/sem:** 4
(lun upper / mar lower / jue upper / vie lower) · descanso 90–120 s.

- **Upper A:** Press de banca con barra ✅ 4×8 · Remo con barra ✅ 4×8 · Press militar
  con barra ✅ 3×10 · Jalón al pecho en polea ✅ 3×10 · Curl con barra ✅ 3×12 · Extensión
  de tríceps en polea ✅ 3×12
- **Lower A:** Sentadilla con barra ✅ 4×8 · Peso muerto rumano ✅ 3×10 · Prensa de
  pierna ✅ 3×12 · Curl femoral sentado ✅ 3×12 · Elevación de talones de pie ✅ 4×15 ·
  Plancha ✅ 3×40 s
- **Upper B:** Press inclinado con mancuernas ✅ 4×10 · Remo con mancuerna a una mano ✅
  3×10 · Elevaciones laterales ✅ 4×15 · Dominadas ✅ 3×AMRAP · Face pull ➕ 3×15 · Curl
  martillo ✅ 3×12 · Press francés ✅ 3×12
- **Lower B:** Peso muerto convencional ✅ 4×6 · Sentadilla búlgara ✅ 3×12 · Hip thrust
  ✅ 4×12 · Extensión de cuádriceps ✅ 3×15 · Hiperextensiones ➕ 3×12 · Giro ruso ✅ 3×20

### R4 — Push / Pull / Legs · 3 días · intermedio
**Nivel:** intermedio · **Objetivo:** hipertrofia · **Días/sem:** 3 (una vuelta/semana)
· descanso 90–120 s.

- **Push (empuje):** Press de banca con barra ✅ 4×8 · Press de hombro con mancuernas ✅
  3×10 · Press inclinado con mancuernas ✅ 3×10 · Elevaciones laterales ✅ 3×15 ·
  Extensión de tríceps en polea ✅ 3×12 · Press francés ✅ 3×12
- **Pull (jalón):** Peso muerto convencional ✅ 4×6 · Dominadas ✅ 3×AMRAP · Remo con
  barra ✅ 4×8 · Jalón al pecho en polea ✅ 3×10 · Face pull ➕ 3×15 · Curl con barra ✅
  3×12 · Curl martillo ✅ 3×12
- **Legs (pierna):** Sentadilla con barra ✅ 4×8 · Prensa de pierna ✅ 3×12 · Peso muerto
  rumano ✅ 3×10 · Extensión de cuádriceps ✅ 3×15 · Curl femoral tumbado ✅ 3×12 ·
  Elevación de talones de pie ✅ 4×15

### R5 — Push / Pull / Legs · 6 días · avanzado
**Nivel:** avanzado · **Objetivo:** hipertrofia · **Días/sem:** 6 (PPL ×2 con variación
A/B). Días Push A / Pull A / Legs A = los de **R4**; añade variación B:

- **Push B (hombro/volumen):** Press militar con barra ✅ 4×8 · Press de pecho en
  máquina ✅ 4×12 · Aperturas con mancuerna ✅ 3×15 · Elevaciones laterales ✅ 4×15 ·
  Press cerrado con barra ✅ 3×10 · Fondos en banco ✅ 3×12
- **Pull B:** Remo sentado en polea ✅ 4×10 · Remo con mancuerna a una mano ✅ 3×10 ·
  Jalón al pecho en polea ✅ 4×12 · Pájaros (deltoide posterior) ✅ 3×15 · Curl en banco
  predicador ✅ 3×12 · Curl con mancuernas alterno ✅ 3×12
- **Legs B (glúteo/femoral):** Peso muerto rumano ✅ 4×8 · Hip thrust ✅ 4×12 · Sentadilla
  búlgara ✅ 3×12 · Curl femoral sentado ✅ 3×15 · Abducción de cadera en máquina ✅ 3×15
  · Elevación de talones sentado ✅ 4×20

### R6 — Fuerza · 3 días · intermedio/avanzado
**Para quién:** quien busca fuerza en los básicos. **Objetivo:** fuerza · **Días/sem:** 3
· **reps bajas, descanso largo 2–3 min.**

- **Día 1:** Sentadilla con barra ✅ 5×5 · Press de banca con barra ✅ 5×5 · Remo con
  barra ✅ 5×5
- **Día 2:** Peso muerto convencional ✅ 5×3 · Press militar con barra ✅ 5×5 · Dominadas
  ✅ 4×6
- **Día 3:** Sentadilla con barra ✅ 4×6 · Press de banca con barra ✅ 4×6 · Peso muerto
  rumano ✅ 4×6 · Fondos en paralelas ✅ 3×8

### R7 — Hipertrofia (músculo) · 4 días · Upper/Lower volumen
**Objetivo:** hipertrofia · **Días/sem:** 4 · reps 8–15, descanso 60–90 s, más
aislamiento.

- **Upper A:** Press inclinado con mancuernas ✅ 4×10 · Remo sentado en polea ✅ 4×12 ·
  Press de pecho en máquina ✅ 3×12 · Jalón al pecho en polea ✅ 3×12 · Elevaciones
  laterales ✅ 4×15 · Curl con barra ✅ 3×12 · Extensión de tríceps en polea ✅ 3×15
- **Lower A:** Prensa de pierna ✅ 4×12 · Peso muerto rumano ✅ 4×10 · Extensión de
  cuádriceps ✅ 3×15 · Curl femoral sentado ✅ 3×15 · Hip thrust ✅ 3×12 · Elevación de
  talones de pie ✅ 4×20
- **Upper B:** Press de banca con barra ✅ 4×8 · Remo con barra ✅ 4×10 · Press de hombro
  con mancuernas ✅ 3×12 · Dominadas ✅ 3×AMRAP · Aperturas con mancuerna ✅ 3×15 · Curl
  martillo ✅ 3×12 · Press francés ✅ 3×15
- **Lower B:** Sentadilla con barra ✅ 4×10 · Sentadilla búlgara ✅ 3×12 · Curl femoral
  tumbado ✅ 3×15 · Abducción de cadera en máquina ✅ 3×15 · Elevación de talones sentado
  ✅ 4×20 · Plancha ✅ 3×45 s

### R8 — Definición / Pérdida de grasa · 4 días · full body + cardio
**Objetivo:** perdida_grasa · **Días/sem:** 4 · circuitos, **descanso corto 45–60 s**,
reps 12–20, cardio al cierre.

- **Día 1:** Sentadilla con barra ✅ 3×15 · Press de banca con barra ✅ 3×15 · Remo
  sentado en polea ✅ 3×15 · Press de hombro con mancuernas ✅ 3×15 · Plancha ✅ 3×40 s ·
  Caminadora ✅ 15 min
- **Día 2:** Peso muerto rumano ✅ 3×15 · Jalón al pecho en polea ✅ 3×15 · Press
  inclinado con mancuernas ✅ 3×15 · Zancadas ✅ 3×12 · Giro ruso ✅ 3×20 · Cuerda para
  saltar ✅ 10 min
- **Día 3:** Prensa de pierna ✅ 3×15 · Press de pecho en máquina ✅ 3×15 · Remo con
  mancuerna a una mano ✅ 3×12 · Elevaciones laterales ✅ 3×15 · Crunch abdominal ✅ 3×20
  · Bicicleta estática ✅ 15 min
- **Día 4 (glúteo + cardio):** Hip thrust ✅ 3×15 · Sentadilla búlgara ✅ 3×12 ·
  Abducción de cadera en máquina ✅ 3×20 · Puente de glúteo ✅ 3×20 · Remo ergómetro ✅
  12 min · Burpees ➕ 3×12 *(opcional)*

> **Resumen de cobertura:** las 8 rutinas se construyen casi por completo con los **48
> ejercicios existentes**. Solo introducen **4 movimientos nuevos** (➕): *Sentadilla
> goblet, Face pull, Hiperextensiones, Burpees*. Sin ellos, las rutinas siguen siendo
> armables sustituyendo (p. ej. goblet → sentadilla con barra; face pull → pájaros), así
> que **ninguna rutina queda bloqueada**; los ➕ solo elevan la calidad/variedad.

---

## 2. Cotejo con el catálogo y ejercicios faltantes

**Catálogo cotejado:** sí se pudo leer la semilla real del panel
(`C:\dev\gymteck\src\data\ejerciciosBase.js`, 48 ejercicios). Todos los ejercicios
marcados ✅ arriba existen con estos `baseKey` (muestra): `press_banca_barra`,
`press_inclinado_mancuernas`, `aperturas_mancuerna`, `press_pecho_maquina`,
`fondos_paralelas`, `dominadas`, `jalon_pecho_polea`, `remo_barra`,
`remo_mancuerna_unilateral`, `remo_sentado_polea`, `peso_muerto_convencional`,
`press_militar_barra`, `press_hombro_mancuernas`, `elevaciones_laterales`,
`pajaros_deltoide_posterior`, `curl_barra`, `curl_mancuernas_alterno`, `curl_martillo`,
`curl_predicador`, `extension_triceps_polea`, `press_frances`, `fondos_banco`,
`press_cerrado_barra`, `sentadilla_barra`, `prensa_pierna`, `extension_cuadriceps`,
`sentadilla_bulgara`, `zancadas`, `peso_muerto_rumano`, `curl_femoral_tumbado`,
`curl_femoral_sentado`, `hip_thrust`, `puente_gluteo`, `patada_gluteo_polea`,
`abduccion_cadera_maquina`, `elevacion_talones_pie`, `elevacion_talones_sentado`,
`plancha`, `crunch_abdominal`, `giro_ruso`, `caminadora`, `bicicleta_estatica`,
`remo_ergometro`, `cuerda_saltar`, … (el catálogo cubre 12 grupos musculares).

### 2.1 Ejercicios a AGREGAR al catálogo del panel (semilla `ejerciciosBase.js`)

Para servir las rutinas con su mejor versión, proponer estos `baseKey` nuevos
(formato igual a la semilla: `nombre`, `grupoMuscular`, `grupoMuscularSecundario?`,
`tipo`, `equipo`):

| baseKey | nombre | grupoMuscular | sec. | tipo / equipo | Ejecución corta | Usado en |
|---|---|---|---|---|---|---|
| `sentadilla_goblet` | Sentadilla goblet | cuadriceps | gluteo | fuerza / mancuerna | Sujeta una mancuerna/kettlebell al pecho; baja con el torso erguido y sube. Ideal para principiantes. | R1 |
| `face_pull` | Face pull (jalón a la cara) | hombro | espalda | fuerza / polea | Polea a la altura de la cara con cuerda; jala hacia la frente abriendo los codos. Salud del hombro/postura. | R3, R4 |
| `hiperextensiones` | Hiperextensiones (extensión lumbar) | femoral | gluteo | peso_corporal / maquina | En banco romano, baja el torso y sube hasta alinear; trabaja zona lumbar, glúteo y femoral. | R3 |
| `burpees` | Burpees | cardio | core | cardio / ninguno | Sentadilla→plancha→flexión→salto. Acondicionamiento metabólico para definición. *(opcional)* | R8 |

> **Nota de mapeo de grupo muscular:** la lista cerrada del modelo
> (`MODELO-RUTINAS.md §1`) **no tiene "espalda baja/lumbar" ni "trapecio"**. Para
> `hiperextensiones` se mapea a `femoral`+sec `gluteo` (cadena posterior); si se
> prefiere, podría ir a `espalda`. Es una decisión menor a confirmar con quien cure el
> catálogo. `face_pull` se ancla en `hombro` (deltoide posterior) con sec `espalda`.

### 2.2 Adiciones opcionales (nice-to-have, NO usadas por las 8 rutinas)

No hacen falta para este set, pero enriquecerían variantes futuras: *Encogimientos de
hombros (shrugs)* (trapecio→`espalda`), *Mountain climbers / escaladores*
(`core`/`cardio`), *Peso muerto sumo* (`femoral`/`gluteo`), *Curl de bíceps en polea*
(`biceps`), *Sentadilla hack* (`cuadriceps`). Se dejan anotados; **no** se proponen para
la primera tanda para mantener el alcance chico.

---

## 3. Estructura de datos de las rutinas prediseñadas

### 3.1 Dónde viven — **recomendación: set GLOBAL curado, como archivo de datos en la app**

| Opción | Pros | Contras | Veredicto |
|---|---|---|---|
| **A) Archivo de datos en la app** (`src/data/rutinasPredisenadas.js`) | Cero infra, cero reglas, instantáneo, versionado en git. Mismo patrón que `ejerciciosBase.js` del panel. | Actualizar = deploy de la app; no editable por no-devs. | **✅ Recomendado para v1.** Curado, pequeño (~8 rutinas) y estático. |
| **B) Colección global Firestore** (`rutinasPredisenadas/{id}` raíz) | Editable sin deploy; legible por todos los gyms. | Requiere **reglas cross-tenant** (fuera de `gyms/{gymId}`), índices y lecturas. Más superficie. | Solo si luego se quiere editar sin deploy. |
| **C) Por gym** (`gyms/{gymId}/rutinas`, plantillas del modelo) | Cada gym personaliza. | Requiere CRUD de rutinas en el panel (hoy NO existe) + reglas. Más trabajo. | Futuro: el gym crea las suyas **además** del set global. |

> **Conclusión:** empezar con **(A)** — un set global curado por ustedes que **todos los
> gyms ofrecen**, idéntico en filosofía a la semilla de ejercicios. Cuando el panel tenga
> CRUD de rutinas (modelo `gyms/{gymId}/rutinas`), las prediseñadas y las del gym
> **coexisten** (mismas estructuras), y si algún día se quieren editar sin deploy, se
> promueven a la opción (B).

### 3.2 Forma de cada rutina (auto-contenida para VER sin leer Firestore)

```js
// src/data/rutinasPredisenadas.js  (propuesto; NO creado aún)
{
  id: 'full-body-principiante-3d',      // estable (slug)
  nombre: 'Full Body Principiante',
  nivel: 'principiante',                 // principiante | intermedio | avanzado
  objetivo: 'general',                   // general | hipertrofia | fuerza | perdida_grasa
  diasPorSemana: 3,
  enfoque: ['gluteo','pierna']?,         // opcional, para filtros/badges
  descripcion: 'Cuerpo completo, ideal para empezar.',
  dias: [
    {
      nombre: 'Día A',
      ejercicios: [
        {
          baseKey: 'sentadilla_goblet',  // ← enlaza con el catálogo (ver §3.3)
          ejercicioNombre: 'Sentadilla goblet',   // SNAPSHOT para mostrar sin Firestore
          grupoMuscular: 'cuadriceps',            // SNAPSHOT (ícono/filtro por músculo)
          orden: 1,
          seriesObjetivo: 3,
          repsObjetivo: '12',            // string: admite '8-12', 'AMRAP', '30 seg'
          descansoSeg: 75,
          notas: ''                      // opcional
        },
        // ...
      ]
    },
    // ... más días
  ]
}
```

Es **coherente con `MODELO-RUTINAS.md §3`** (array embebido `dias[].ejercicios[]`,
`repsObjetivo` string, snapshots de nombre/grupo). Diferencia: la prediseñada usa
**`baseKey`** (estable y global) en vez del `ejercicioId` por-gym; el `ejercicioId` real
es **derivable**: `ejercicioId = "base_" + baseKey` (id determinista del import).

### 3.3 Conexión con el catálogo de ejercicios del panel

- **Para VER la rutina** (lista, días, series×reps): **no se necesita Firestore** — los
  snapshots `ejercicioNombre`/`grupoMuscular` viven en el propio archivo de datos.
- **Para el DETALLE/DEMO de un ejercicio** (descripción, futura imagen/video): se lee
  `gyms/{gymId}/ejercicios/base_<baseKey>` — **requiere abrir lectura al socio (R1)**.
- Usar **`baseKey`** como clave de enlace (no el id por-gym) porque las prediseñadas son
  globales y el id real por gym siempre es `base_<baseKey>`. Si un ejercicio ➕ aún no se
  importó en un gym, la vista degrada con el snapshot (muestra nombre/grupo igual).

---

## 4. Cómo lo usa el socio (flujo de VER y ELEGIR)

> **Punto a coordinar con Britney (§6):** la sección "Rutinas" puede vivir en su
> `MaterialView` (`/material`, hoy "Rutinas y material") **o** en una **vista nueva
> `/rutinas`**. Recomiendo **una sola casa**; el flujo es el mismo dondequiera.

1. **Hub de Rutinas:** lista de tarjetas (una por rutina) con **chips de filtro**:
   nivel (principiante/intermedio/avanzado), objetivo (músculo/definición/fuerza/general)
   y días/semana. Cada tarjeta: nombre, badges (nivel·objetivo·días), 1 línea de "para
   quién".
2. **Detalle de rutina:** encabezado (nombre, nivel, objetivo, días/sem, descripción) +
   **días** en acordeón o pestañas; cada día lista sus ejercicios con
   `series × reps`, descanso e **ícono por grupo muscular** (demos: §5). Sin login extra
   (lectura pública del archivo de datos).
3. **Elegir / activar "mi rutina":** botón **"Elegir esta rutina"**.
   - **v1 (fase ver/elegir, sin backend):** se guarda **en el dispositivo**
     (`localStorage`, p. ej. `gv-rutina-activa = "full-body-principiante-3d"`). Inicio
     muestra "Tu rutina: Full Body Principiante" con acceso directo. **Cero reglas, cero
     backend** → desbloquea ya.
   - **v2 (cuando exista R2 — escritura del socio):** "elegir" **copia** la rutina a
     `gyms/{gymId}/socios/{socioId}/rutinas` (con `origenRutinaId = <id prediseñada>`,
     `esPlantilla:false`), como define `MODELO-RUTINAS.md §3.2`. Así queda en la nube,
     multi-dispositivo y editable por el socio.
4. **(Futuro, no ahora) Registro de avance:** marcar día/ejercicio como completado →
   alimenta **progreso/rachas** (Fase C/A del plan general). **Fuera de alcance aquí**;
   esta entrega es **solo ver y elegir**.

---

## 5. Demos de ejercicios (imágenes/video)

Se mantiene la recomendación de `MODELO-FITNESS-APP.md §6`:
- **Ahora:** **texto** (`descripcion` del catálogo) + **ícono por grupo muscular** (SVG
  estilo Quiet Neon). Costo cero, consistente.
- **Después (incremental, sin bloquear):** contemplar **campos opcionales
  `imagenUrl` / `videoUrl`** por ejercicio en `gyms/{gymId}/ejercicios` (Firebase
  Storage). La vista de rutina **degrada con gracia**: si no hay media, muestra
  ícono+texto; si la hay, muestra la imagen/clip. Producir 40-50 demos de calidad es
  **caro** (licenciar o proyecto audiovisual), por eso es contenido que se enchufa con el
  tiempo, no un bloqueante de esta entrega.

---

## 6. Prerrequisitos y coordinación (otros repos)

**Panel / reglas (`C:\dev\gymteck`) — NO se construye aquí:**
- **R1 — Lectura para socios:** permitir que `esSocioDelGym(gymId)` **lea**
  `gyms/{gymId}/ejercicios` (hoy `allow read: if isStaff` en
  `firestore.rules:149`). Necesario para el **detalle/demo** del ejercicio (no para ver
  la rutina, que es auto-contenida). Si las prediseñadas fueran opción (B), también
  abrir su lectura.
- **Agregar los ejercicios ➕** (`sentadilla_goblet`, `face_pull`, `hiperextensiones`,
  `burpees`) a `src/data/ejerciciosBase.js` y reimportar (el import es idempotente:
  crea solo los nuevos).
- **R2 (más adelante):** reglas de escritura del socio en
  `gyms/{gymId}/socios/{socioId}/rutinas` para el "elegir v2" (copiar la rutina).

**Coordinación con Britney (este repo):**
- **Dónde vive "Rutinas":** ¿`MaterialView` (`/material`) o **vista nueva `/rutinas`**?
  → decisión conjunta antes de construir la UI. Recomiendo una sola casa y, si es nueva,
  enlazarla desde el grupo **"Entrenamiento"** del `MenuDrawer` (ya existe ese grupo).
- **No** reescribir `MaterialView`/`VideosView`/`ForoView` sin acordarlo: el módulo entra
  como datos + (vista nueva o su Material), sin tocar sus placeholders unilateralmente.

---

## 7. Plan de construcción por pasos (con dependencias entre repos)

| Paso | Qué | Repo | Depende de |
|---|---|---|---|
| **(a)** | Agregar ejercicios ➕ a la semilla + reimportar; **abrir lectura del catálogo al socio (R1)** | **Panel** `gymteck` | — |
| **(b)** | Crear el set de rutinas prediseñadas como **archivo de datos** (`src/data/rutinasPredisenadas.js`, opción A) con los `baseKey`/snapshots de §1 | **App** `gymvexa-miembros` | — (auto-contenido; **puede empezar ya**, en paralelo a (a)) |
| **(c)** | **Vista de Rutinas** (hub con filtros → detalle → "elegir" en `localStorage`) | **App** | **(b)**; el **detalle/demo** del ejercicio depende de **(a) R1**; **coordinar casa con Britney** |
| **(d)** | "Elegir v2" → copiar a `socios/{socioId}/rutinas` (**R2**) | **App + Panel/reglas** | **(c)** + **R2** |
| **(e)** | **Registro de avance** (marcar completado) → progreso/rachas | **App** (+ posible backend) | **(d)** + Fase C/A del plan general |

**Dependencias clave entre repos:**
- **(b) es independiente** y desbloquea la mayor parte: ver rutinas no necesita Firestore.
- **(c)** puede mostrar las rutinas con solo (b); el **demo por ejercicio** y el agregado
  de los ➕ requieren **(a)** en el panel.
- **(d)/(e)** son fases posteriores (escritura del socio y progreso), fuera de "ver y
  elegir".

---

## 8. Programación de días — lógica de descanso corregida (implementado)

**Regla fitness correcta:** una rutina puede ir en **días seguidos** si cada día entrena
**grupos musculares distintos** (mientras uno trabaja, el otro descansa). Solo exige
descanso entre sesiones cuando **repite el mismo trabajo** cada día (full body).

| Rutina | Estructura real | requiereDescanso | Por qué |
|---|---|---|---|
| R1 Full Body Principiante | Todo el cuerpo cada día | **true** | Repite todos los grupos cada sesión → recuperar |
| R2 Full Body Glúteo&Pierna | 2 días pierna/glúteo + 1 upper | **true** | Repite pierna/glúteo en varias sesiones |
| R3 Upper/Lower | Superior vs inferior alternos | **false** | Días seguidos OK: grupos distintos |
| R4 PPL 3 días | Empuje/Jalón/Pierna | **false** | Días seguidos OK: grupos distintos |
| R5 PPL 6 días | Empuje/Jalón/Pierna ×2 | **false** | Días seguidos OK: grupos distintos |
| R6 Fuerza | Básicos pesados (full body) | **true** | Cargas altas sobre los mismos patrones → recuperar |
| R7 Hipertrofia U/L | Superior vs inferior | **false** | Días seguidos OK: grupos distintos |
| R8 Definición | Full body ×3 + glúteo/cardio | **true** | Cuerpo completo casi cada día |

> La validación de descanso (advertir + pedir confirmación si hay días seguidos) **solo
> se dispara** en las `true`. Las `false` muestran una nota informativa ("puedes entrenar
> días seguidos").

## 9. Asignar entrenamiento a cada día (reordenable) — implementado

**Interacción (móvil-primero, selectores en vez de arrastrar):**
1. El socio elige sus **N días de la semana** (chips Lun–Dom), como ya existía.
2. El sistema **propone** una asignación automática en orden (1ª sesión → día más
   temprano, etc.).
3. Debajo aparece **cada SESIÓN de la rutina** (Día A/B… o Empuje/Jalón/Pierna) con una
   fila de **mini-chips de los días elegidos**; el socio toca el día donde quiere esa
   sesión. **Reasignación con intercambio:** si elige un día ya ocupado por otra sesión,
   ambas se **intercambian** automáticamente → la asignación siempre es válida (cada día
   elegido = exactamente una sesión, sin huecos ni duplicados). Es lo más simple y a
   prueba de errores en móvil (nada de drag&drop ni callejones sin salida).
4. La **validación de descanso** corre sobre el conjunto de días elegidos (con las reglas
   corregidas), independientemente de qué sesión caiga en cuál día.

## 10. Flexibilidad cuando te atrasas — implementado (sin backend) + pendiente

**Tono:** siempre flexible, nunca regaña ("¿Lo mueves a otro día?", no "fallaste").

**Lo viable HOY sin backend (a nivel de PROGRAMACIÓN, en localStorage):**
- En el detalle de **tu rutina activa** se muestra **"Tu semana"** (día → sesión) y un
  acceso **"Reacomodar mi semana"** que reabre el programador **precargado** con tus días
  y tu asignación actual. Ahí puedes **mover una sesión a otro día** (mismo intercambio) o
  rehacer la semana en segundos. Se guarda al instante en `localStorage`.
- Mensaje amable: "¿Te atrasaste o cambió tu semana? Reacomoda tus días cuando quieras."

**Pendiente para la fase de progreso (requiere backend / registro de entrenamientos):**
- Marcar una sesión como **hecha / pendiente** y conservar ese **histórico**.
- **Recuperar** un entrenamiento perdido como evento real (no solo reordenar el plan) y
  alimentar **rachas/progreso**.
- Estos necesitan `socios/{socioId}/entrenamientos` (modelo `MODELO-RUTINAS.md §4`) y
  reglas R2; se dejan para la fase C/A del plan general. El diseño actual es **compatible**:
  reacomodar el plan no choca con registrar lo realmente hecho después.

---

> **Estado:** §1–§7 son diseño; §8–§10 ya están **implementados** en `RutinasView.vue` /
> `ProgramarRutina.vue` / `rutinasPredisenadas.js` (sin backend, sin tocar vistas de
> Britney). Los pasos (a) y (d) y lo "pendiente" de §10 son trabajo de **panel/reglas/
> backend**.
