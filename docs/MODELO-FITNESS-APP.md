# Plan de experiencia fitness — App de Miembros (Gymvexa)

> **Tipo:** Investigación + diseño (mapa de ruta). **NO** toca código ni construye
> features. Es la base para decidir qué construir, en qué orden, y **qué coordinar
> con Britney** para no duplicar trabajo.
>
> **Objetivo del producto:** convertir la app de socios en una compañera de
> entrenamiento completa — **rutinas**, **progreso**, **rachas**, y **rangos/niveles
> por grupo muscular** — inspirada en Hevy / Strong / Fitbod / Gymverse, pero
> respetando la arquitectura actual (multi-tenant `gyms/{gymId}`, lectura directa de
> Firestore + escrituras por el backend de Railway).
>
> **Fuentes de verdad ya existentes (repo del panel `C:\dev\gymteck`):**
> - `docs/MODELO-RUTINAS.md` — modelo de datos Fase 2 (ejercicios, rutinas,
>   entrenamientos). **Este documento NO lo reemplaza; lo consume desde la app.**
> - `docs/VISION-APP-MIEMBROS.md` — visión y fases 0–5 de la app de miembros.

---

## 1. Inventario de lo que YA existe en esta app (gymvexa-miembros)

### 1.1 Vistas relacionadas con fitness/entrenamiento

| Vista | Ruta | Estado | Qué hace | Datos | ¿Toca rutinas/progreso/rachas? |
|---|---|---|---|---|---|
| **VideosView** `src/views/VideosView.vue:1` | `/videos` | **Placeholder** ("Próximamente") | Solo render del componente `Proximamente` con copy "videos de rutinas y técnica". Sin lógica ni datos. | Ninguno | No (promete demos de ejercicios) |
| **MaterialView** `src/views/MaterialView.vue:1` | `/material` | **Placeholder** ("Próximamente") | `Proximamente` con copy **"Rutinas y material… rutinas por objetivo"**. Sin lógica. | Ninguno | **Conceptualmente sí** (es el hueco natural de "rutinas") |
| **ForoView** `src/views/ForoView.vue:1` | `/foro` | **Placeholder** ("Próximamente") | `Proximamente` con copy de comunidad (publicar, fotos, dudas). | Ninguno | No (es Comunidad / Fase 4) |
| **CalculadoraView** `src/views/CalculadoraView.vue:1` | `/calculadora` | **Funcional 100%** | Calculadora corporal **local** (IMC, calorías Mifflin-St Jeor, proteína, agua) a partir de peso/estatura/edad/sexo/objetivo. | **Ninguno** (sin backend, sin Firestore; todo en memoria) | No directamente; aporta `objetivo` y datos físicos útiles a futuro |
| **InicioView** `src/views/InicioView.vue:1` | `/inicio` | Funcional | Home: membresía (días restantes, barra de periodo), saldo, deuda, CTA check-in. | Lee ficha del socio (Firestore) | No |
| **PerfilView** `src/views/PerfilView.vue:1` | `/perfil` | Funcional | Perfil solo-lectura: avatar, **Visitas (`totalVisitas`)**, saldo, membresía, vence. | Lee ficha del socio | **Roza progreso**: ya muestra `d.totalVisitas` (`PerfilView.vue:62`) |
| **CheckinView** `src/views/CheckinView.vue` | `/checkin` | Funcional | Escaneo de QR del gym → registra asistencia vía backend. | Backend `/api/socios/checkin` | Genera el dato base de **rachas** (asistencias con fecha) |

> **`Proximamente.vue`** (`src/components/Proximamente.vue`) es un componente
> reutilizable de "pantalla en construcción" (título + descripción + lista de
> features). Videos, Material y Foro son **solo** eso: cascarones. **No hay una sola
> línea de lógica de rutinas, ejercicios, progreso, rachas, niveles o rangos** en la
> app todavía.

### 1.2 ¿Hay alguna noción de rutinas/progreso/rachas/niveles empezada?

**No.** Lo único "real" relacionado con progreso es:
- El contador **`totalVisitas`** y **`ultimaVisita`** en la ficha del socio (se muestran
  en Perfil). Provienen del check-in.
- La barra de **progreso del periodo de membresía** en Inicio (`InicioView.vue:40`),
  que es solo presentación de fechas de membresía — no es progreso de entrenamiento.

No existe: catálogo de ejercicios en la app, rutinas, registro de sets, rachas,
niveles/rangos, ni lectura del historial de asistencias.

### 1.3 Navegación: qué secciones de fitness ya están enlazadas

- **BottomNav** (`src/components/BottomNav.vue`): Inicio · **Videos** · Check-in (FAB) ·
  **Foro** · Menú.
- **MenuDrawer** (`src/components/MenuDrawer.vue`) agrupa por secciones:
  - **Principal:** Inicio, Check-in.
  - **Entrenamiento:** **Videos** (`:85`), **Rutinas y material** (`/material`, `:95`),
    **Calculadora corporal** (`:106`).
  - **Comunidad:** Foro.
  - **Mi cuenta:** Mi perfil, Cerrar sesión.

> El grupo **"Entrenamiento"** del drawer ya está pensado para alojar Rutinas. La
> etiqueta del item `/material` es literalmente **"Rutinas y material"** → es el
> ancla natural para la sección de rutinas (decisión a coordinar con Britney, §5).

---

## 2. Inventario de datos compartidos (Firestore)

Proyecto Firebase compartido con el panel: **`gymteck-1708f`** (`src/firebase.js:22`).
La app **lee Firestore directo** (solo lectura de lo del socio) y **escribe vía
backend** (Railway). El claim del socio es `{ gymId, socioId, role:"socio" }`.

### 2.1 Lo que la app ya usa hoy

| Dato | Ruta Firestore | Acceso de la app hoy |
|---|---|---|
| Ficha del socio | `gyms/{gymId}/socios/{socioId}` | **Lectura en vivo** (`onSnapshot`) — `src/stores/socio.js:194`. Campos vistos: `nombre`, `email`, `numeroSocio`, `membresiaActual` (con `fechaInicio`/`fechaFin`/`plan`), `saldoActual`, `deudaActual`, **`totalVisitas`**, **`ultimaVisita`**. |
| Vinculación / claim | Backend `/api/vincular-socio`, `/api/socios/vincular` | El claim `role:"socio"` habilita escrituras futuras (`socio.js:35` lo dice explícito: *"el claim es necesario para guardar rutinas/entrenamientos en el futuro"*). |
| Check-in | Backend `/api/socios/checkin` | Toggle entrada/salida; el backend valida membresía y anti-duplicado. |

### 2.2 Catálogo de ejercicios del panel — **ya construido (Fase 2A)**

El panel **ya tiene** el catálogo de ejercicios funcionando:
- Colección: **`gyms/{gymId}/ejercicios/{ejercicioId}`**.
- Store `C:\dev\gymteck\src\stores\ejercicios.js` + vista `EjerciciosView.vue` + semilla
  en código `src/data/ejerciciosBase.js` (~48 ejercicios) + **import idempotente**
  ("Importar catálogo sugerido", id determinista `base_<baseKey>`).
- Estructura por ejercicio (de `MODELO-RUTINAS.md §1`): `nombre`, **`grupoMuscular`**
  (lista cerrada: pecho, espalda, hombro, biceps, triceps, antebrazo, cuadriceps,
  femoral, gluteo, pantorrilla, core, cardio), `grupoMuscularSecundario[]`, `tipo`
  (fuerza/cardio/peso_corporal/estiramiento), `equipo`, `descripcion`, `esBase`,
  `baseKey`, `activo`.

> ⚠️ **Bloqueante de seguridad (importante):** hoy `gyms/{gymId}/ejercicios` es
> **`allow read: if isStaff(gymId)`** (`C:\dev\gymteck\firestore.rules:149`). **El
> socio NO puede leer el catálogo todavía.** Para que la app lo consuma hace falta
> **una regla nueva** que permita a `esSocioDelGym(gymId)` leer `ejercicios` (y las
> plantillas de `rutinas`). Los helpers de auth del socio **ya existen** en las reglas
> (`esSocioDelGym`, `isSocioDe` — `firestore.rules:35,39`).

### 2.3 Asistencias (insumo de rachas/progreso) — **existe, pero no legible por el socio**

- Colección: **`gyms/{gymId}/asistencias/{asistenciaId}`** con
  `{ socioId, socioNombre, fechaHora, sucursalId, metodoCheckin, membresiaVigente }`
  (`C:\dev\gymteck\src\stores\asistencias.js:43`). **Es el historial de visitas con
  fecha** → la materia prima de las rachas y de "progreso de asistencia".
- ⚠️ Hoy `asistencias` es **`allow read: if isStaff(gymId)`**
  (`firestore.rules:119`). El socio **no** puede leer su propio historial aún. La ficha
  del socio sí trae el **agregado** `totalVisitas`/`ultimaVisita` (legible), pero no el
  detalle por día.

### 2.4 Rutinas y entrenamientos — **diseñados, NO construidos en ningún lado**

`MODELO-RUTINAS.md` define el modelo completo (rutinas plantilla del gym, rutinas
propias del socio, registros de entrenamiento con series peso/reps en **gramos
enteros**), pero **no existe código** que los cree ni reglas que los gobiernen:
- No hay store/vista de rutinas en el panel (solo ejercicios).
- No existen reglas para `gyms/{gymId}/rutinas`, `socios/{socioId}/rutinas`, ni
  `socios/{socioId}/entrenamientos` (denegadas por defecto).

---

## 3. Resumen del modelo de datos ya diseñado (referencia a `MODELO-RUTINAS.md`)

No se reespecifica aquí; solo el mapa para construir la app encima:

```
gyms/{gymId}
  ├── ejercicios/{ejercicioId}            ✅ construido (panel)  · read: solo staff hoy
  ├── rutinas/{rutinaId}                  📝 diseñado · plantillas del gym (Fase 2B)
  ├── asistencias/{asistenciaId}          ✅ existe · read: solo staff hoy
  └── socios/{socioId}
        ├── (ficha)                        ✅ legible por el socio
        ├── rutinas/{rutinaId}            📝 diseñado · rutinas propias del socio
        └── entrenamientos/{entrenamientoId}  📝 diseñado · sesiones con series (peso/reps)
```

- **Rutina** = lista **embebida** y ordenada de ejercicios objetivo (`ejercicioId` +
  snapshot de `ejercicioNombre`/`grupoMuscular` + `seriesObjetivo`, `repsObjetivo`
  (string, p. ej. "8-12"), `descansoSeg`, `pesoObjetivoGramos?`). Plantillas del gym
  (`esPlantilla:true`) o propias del socio (con `origenRutinaId` si se copió de una).
- **Entrenamiento** = una sesión (un día) con `fecha`, `socioId` desnormalizado, y
  `ejercicios[].series[]` donde cada serie trae `pesoGramos` (entero) + `reps`. **Es el
  insumo obligatorio de los rangos.**

---

## 4. Propuesta de plan por fases (app de miembros)

Principio: **lo más simple y valioso primero**; cada fase entrega valor y se valida
sola. Marco **[YA]** lo que se apoya en datos existentes y **[NUEVO]** lo que requiere
construir datos/reglas.

### Leyenda de dependencias transversales (valen para varias fases)
- **R1 — Reglas de lectura para socios:** permitir `esSocioDelGym` leer `ejercicios` y
  `rutinas` (plantillas). **[NUEVO, panel]**
- **R2 — Reglas de escritura del socio:** `socios/{socioId}/rutinas` y
  `/entrenamientos` (crea/edita el propio socio; staff lee). **[NUEVO, panel]**
- **R3 — Lectura de asistencias propias:** o regla `read if isSocioDe(...)` filtrando
  por `socioId`, **o** un endpoint del backend que devuelva el historial/racha.
  **[NUEVO]**

---

### FASE A — Progreso y Rachas con lo que YA hay (rápida, alto valor, bajo riesgo)

**Idea:** entregar "compañera de entrenamiento" visible **sin** esperar a rutinas.
Aprovecha asistencias.

- **Progreso de asistencia [YA]:** tarjeta/sección con `totalVisitas`, `ultimaVisita`
  (ya legibles en la ficha) + una **gráfica de visitas por semana/mes** y "días que
  entrenaste este mes". Para el detalle por día se necesita **R3**.
- **Racha de asistencia [YA + R3]:** "X días/semanas seguidas entrenando". Definición
  recomendada (ver §4-Rachas abajo). Mientras no haya R3, una **racha simple** se puede
  derivar de `ultimaVisita` + un contador `rachaActual`/`rachaMax` que el **backend**
  actualice en cada check-in (lo más robusto y anti-trampa).
- **UI:** nueva sección "Mi progreso" (o enriquecer Perfil). **No** pisa vistas de
  Britney si es ruta nueva `/progreso`.

**Coordinar:** dónde vive (Perfil vs nueva ruta). **Datos nuevos:** opción de contadores
de racha en la ficha (backend) o R3.

---

### FASE B — Rutinas (consumir el catálogo del panel)

Depende de **R1** (leer ejercicios + plantillas) y, para guardar, **R2**.

- **B1. Ver catálogo y plantillas del gym [YA-datos + R1]:** la app lista
  `gyms/{gymId}/ejercicios` y `gyms/{gymId}/rutinas` (cuando el panel cree plantillas).
  Pantalla "Rutinas del gym" → detalle de rutina (ejercicios, series/reps objetivo).
- **B2. "Tomar" una rutina / armar la propia [NUEVO + R2]:** copiar una plantilla a
  `socios/{socioId}/rutinas` (desnormalizando, con `origenRutinaId`) o construir una
  eligiendo del catálogo. Escritura directa a Firestore con reglas R2 (no necesita
  backend, según `VISION-APP-MIEMBROS.md §5` Fase 2).
- **B3. Rutina recomendada [NUEVO, lógica de cliente]:** sugerir una plantilla según
  **`objetivo`** (de la Calculadora) + `nivel` + equipo disponible. Empezar **simple**:
  filtro por `objetivo`/`nivel` sobre las plantillas del gym (no ML).
- **Prerrequisito de contenido (panel):** alguien debe construir en el **panel** el CRUD
  de **rutinas plantilla** (Fase 2B del panel, hoy NO existe). La app sola no basta.

**Coordinar fuerte con Britney:** "Rutinas y material" (`/material`) es su placeholder.

---

### FASE C — Registro de entrenamientos (sets: peso/reps)

Depende de **R2**. Es **el insumo obligatorio de los rangos**.

- Pantalla "Entrenar": elegir rutina (o libre) → por ejercicio, registrar series con
  **peso y reps**. Guardar en `socios/{socioId}/entrenamientos` con la estructura de
  `MODELO-RUTINAS.md §4` (**`pesoGramos` entero**, snapshot de `grupoMuscular`).
- **PRs (records personales) [NUEVO, derivado]:** una vez hay entrenamientos, calcular
  peso máximo y **1RM estimado** (Epley) por ejercicio/músculo — **gráficas de
  progreso** estilo Hevy/Strong. Se computa sobre los entrenamientos del socio.

---

### FASE D — Rangos / Niveles por grupo muscular (el diferenciador)

Depende de **C** (datos reales) y es la pieza **más delicada** (`VISION §7`). Diseñar
**después** de tener datos. Resumen de la propuesta (decisiones abiertas en §6 de
`VISION-APP-MIEMBROS.md`):

- **Rango por grupo muscular** (no global): un socio puede ser Oro en pecho y Bronce en
  pierna → premia equilibrio y da metas en paralelo.
- **Muchos niveles/subdivisiones** (estilo ligas): p. ej. Bronce I–III, Plata I–III,
  Oro I–III, Platino, Diamante… para que la meta siguiente siempre esté cerca.
- **Cómo se sube — propuesta concreta a calibrar:** XP por músculo = función de
  (1RM estimado / progresión en el tiempo / volumen `Σ peso×reps`), con **fuerza
  relativa al peso corporal** para no castigar a cuerpos pequeños. Anti-trampa: topes de
  progresión creíble + cálculo **del lado servidor** (backend), porque el registro es
  auto-reportado.
- **Niveles "de consistencia" [YA-ish]:** en paralelo a los rangos de fuerza, un **nivel
  general por XP de asistencia + rutinas completadas** se puede empezar **antes** que los
  rangos de fuerza (usa Fase A/B), dando gamificación temprana barata.

---

### Tabla maestra: qué se apoya en datos existentes vs nuevos

| Fase | Pilar | Datos existentes (✅) | Datos/Reglas nuevos (⚠️) |
|---|---|---|---|
| A | Progreso asistencia | `totalVisitas`, `ultimaVisita` (ficha) | Detalle por día: **R3** o contadores de racha en backend |
| A | Rachas | check-in ya registra `asistencias.fechaHora` | **R3** o `rachaActual`/`rachaMax` (backend) |
| B | Rutinas (ver) | catálogo `ejercicios` ✅ construido | **R1**; **plantillas de rutinas en el panel (no existen)** |
| B | Rutinas (propias/recomendar) | `objetivo` de Calculadora (local) | **R2**; lógica de recomendación |
| C | Entrenamientos / PRs | — | **R2**; pantalla de registro; cálculo de PRs |
| D | Rangos por músculo | — (los produce la Fase C) | cálculo server-side, definición de rangos, anti-trampa |

---

## 5. Coordinación con Britney (solapamientos)

Britney ya creó **placeholders** (sin lógica) que tocan este territorio. Para no pisar
su trabajo, propongo repartir así:

| Su vista (hoy placeholder) | Relación con el plan | Propuesta de reparto |
|---|---|---|
| **MaterialView** `/material` — "Rutinas y material" | **Solapa con Fase B (Rutinas).** Es el ancla natural. | **Decidir con ella:** o ella convierte `/material` en la sección de Rutinas, o reservamos `/material` para "guías/PDF" y creamos **ruta nueva `/rutinas`** para el módulo. Recomiendo **una sola** casa de rutinas para no confundir. |
| **VideosView** `/videos` | **Solapa con "demos de ejercicios"** (ver §6). | Los **videos/imágenes por ejercicio** encajan aquí. Coordinar: ¿los demos viven en Videos, o embebidos en el detalle de ejercicio dentro de Rutinas? |
| **ForoView** `/foro` | **Comunidad = Fase 4** de `VISION`. **No** es parte de rutinas/progreso/rangos. | **Dejárselo a Britney.** Nuestro plan no lo toca. |
| **CalculadoraView** `/calculadora` | **Funcional**, no solapa; **aporta** `objetivo`/datos físicos a la recomendación de rutinas (Fase B3) y al "relativo a peso corporal" de rangos (Fase D). | No tocar; solo **leer** su `objetivo` a futuro (idealmente persistir datos físicos del socio). |

**Regla de oro para esta tanda:** todo el módulo fitness nuevo entra como **rutas/vistas
nuevas** (`/progreso`, `/rutinas`, `/entrenar`) y, a lo sumo, **enlaces** desde el grupo
"Entrenamiento" del drawer. **No** reescribir Videos/Material/Foro sin acordarlo con
Britney primero.

---

## 6. Demos de ejercicios (imágenes/video) — nota honesta de costo

El catálogo del panel **no tiene** hoy imágenes ni videos (solo `descripcion` de texto;
`MODELO-RUTINAS.md §1`). Opciones, de menor a mayor costo:

1. **Solo texto/indicaciones (hoy):** usar `descripcion`. Costo cero. Pobre como "demo".
2. **Íconos/diagramas por grupo muscular:** SVG propios reutilizando el estilo Quiet
   Neon. Barato, consistente, pero genérico (no muestra la técnica real).
3. **Imágenes/GIFs por ejercicio:** **caro de producir bien** (~40-50 ejercicios × foto/
   GIF de calidad). Licenciar un set comercial es lo realista; grabarlo es un proyecto
   audiovisual aparte. Hosting en Firebase Storage.
4. **Video por ejercicio:** el más caro (producción + hosting + ancho de banda). Encaja
   con la idea de Britney en Videos, pero es contenido continuo, no un one-shot.

**Recomendación honesta:** empezar con **(1)+(2)** (texto + iconografía por músculo) y
tratar los **media reales como contenido incremental** que el gym/equipo sube con el
tiempo (campo opcional `imagenUrl`/`videoUrl` por ejercicio, plug-and-play). **No
bloquear** Rutinas/Progreso esperando el contenido visual: la app funciona y da valor
sin él, y los demos se enchufan después.

---

## 7. Orden recomendado (síntesis)

1. **Fase A — Progreso + Rachas** con asistencias (rápido, alto valor; necesita R3 o
   contadores en backend). Gamificación temprana barata (nivel por consistencia).
2. **Panel: construir plantillas de rutinas (Fase 2B del panel)** — prerrequisito de
   contenido para que la app tenga qué mostrar. En paralelo, **R1**.
3. **Fase B — Rutinas en la app** (ver catálogo/plantillas → tomar/armar; recomendación
   simple por `objetivo`/`nivel`). Necesita **R1/R2**.
4. **Fase C — Registro de entrenamientos + PRs** (insumo de rangos). Necesita **R2**.
5. **Fase D — Rangos por grupo muscular** (server-side, anti-trampa). Después de tener
   datos reales de C.
6. **Demos visuales:** incrementales, en cualquier momento, sin bloquear lo anterior.

**Lo que hay que decidir con el equipo/Britney antes de construir** (además de §6 de
`VISION-APP-MIEMBROS.md`): casa de las rutinas (`/material` vs `/rutinas`), dónde viven
los demos (Videos vs detalle de ejercicio), y si las rachas se calculan en backend
(recomendado, anti-trampa) o por lectura directa de asistencias (R3).

---

> **Estado:** diseño. No se ha construido ninguna feature ni modificado vistas/reglas.
> Las reglas de Firestore (R1/R2/R3) y el CRUD de rutinas del panel son **prerrequisitos
> del lado del panel/backend**, fuera de esta app, y deben acordarse con el equipo.
