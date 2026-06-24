// Set GLOBAL curado de rutinas prediseñadas que el gym ofrece a sus socios.
// Fuente de verdad: docs/MODELO-RUTINAS-PREDISENADAS.md (8 rutinas).
//
// Es un ARCHIVO DE DATOS (no Firestore): ver las rutinas NO requiere backend ni
// permisos. Cada ejercicio referencia el catálogo del panel por `baseKey`
// (ejercicioId real = "base_" + baseKey) y lleva SNAPSHOTS de nombre/grupo para
// poder mostrarse sin leer Firestore. `imagenUrl`/`videoUrl` quedan opcionales
// (vacíos) para enchufar demos visuales más adelante sin tocar esta estructura.
//
// Convenciones:
// - nivel:    'principiante' | 'intermedio' | 'avanzado'
// - objetivo: 'general' | 'gluteo' | 'musculo' | 'fuerza' | 'definicion'
// - reps:     string (admite '8-12', 'AMRAP', '15 min', '30 seg')
// - descanso: string legible ('60-90 seg', '2-3 min')
// - grupo:    grupo muscular principal (para el ícono): pecho, espalda, hombro,
//             biceps, triceps, cuadriceps, femoral, gluteo, pantorrilla, core, cardio

// Helper interno para no repetir los campos opcionales de media en cada ejercicio.
const ej = (baseKey, nombre, grupo, series, reps, descanso, notas = '') => ({
  baseKey,
  nombre,
  grupo,
  series,
  reps,
  descanso,
  notas,
  imagenUrl: '',
  videoUrl: '',
})

export const RUTINAS_PREDISENADAS = [
  // ===================================================================== R1
  {
    id: 'full-body-principiante-3d',
    nombre: 'Full Body Principiante',
    nivel: 'principiante',
    objetivo: 'general',
    diasPorSemana: 3,
    descripcion: 'Cuerpo completo en cada sesión. El mejor punto de partida para empezar desde cero.',
    paraQuien: 'Quien empieza desde cero.',
    reglasDescanso: {
      requiereDescansoEntreSesiones: true,
      notaDescanso:
        'Trabaja todo el cuerpo en cada sesión: deja al menos un día de descanso entre entrenamientos para recuperar.',
    },
    dias: [
      {
        nombre: 'Día A',
        ejercicios: [
          ej('sentadilla_goblet', 'Sentadilla goblet', 'cuadriceps', 3, '12', '60-90 seg'),
          ej('press_pecho_maquina', 'Press de pecho en máquina', 'pecho', 3, '12', '60-90 seg'),
          ej('jalon_pecho_polea', 'Jalón al pecho en polea', 'espalda', 3, '12', '60-90 seg'),
          ej('press_hombro_mancuernas', 'Press de hombro con mancuernas', 'hombro', 2, '12', '60 seg'),
          ej('plancha', 'Plancha', 'core', 3, '30 seg', '45 seg'),
        ],
      },
      {
        nombre: 'Día B',
        ejercicios: [
          ej('prensa_pierna', 'Prensa de pierna', 'cuadriceps', 3, '12', '60-90 seg'),
          ej('press_inclinado_mancuernas', 'Press inclinado con mancuernas', 'pecho', 3, '12', '60-90 seg'),
          ej('remo_sentado_polea', 'Remo sentado en polea', 'espalda', 3, '12', '60-90 seg'),
          ej('curl_mancuernas_alterno', 'Curl con mancuernas alterno', 'biceps', 2, '12', '60 seg'),
          ej('extension_triceps_polea', 'Extensión de tríceps en polea', 'triceps', 2, '12', '60 seg'),
          ej('crunch_abdominal', 'Crunch abdominal', 'core', 3, '15', '45 seg'),
        ],
      },
      {
        nombre: 'Día C',
        ejercicios: [
          ej('peso_muerto_rumano', 'Peso muerto rumano', 'femoral', 3, '10', '90 seg'),
          ej('press_banca_barra', 'Press de banca con barra', 'pecho', 3, '10', '90 seg'),
          ej('remo_mancuerna_unilateral', 'Remo con mancuerna a una mano', 'espalda', 3, '12', '60-90 seg'),
          ej('elevaciones_laterales', 'Elevaciones laterales', 'hombro', 2, '15', '45 seg'),
          ej('elevacion_talones_pie', 'Elevación de talones de pie', 'pantorrilla', 3, '15', '45 seg'),
        ],
      },
    ],
  },

  // ===================================================================== R2
  {
    id: 'full-body-gluteo-pierna-3d',
    nombre: 'Full Body Glúteo & Pierna',
    nivel: 'principiante',
    objetivo: 'gluteo',
    diasPorSemana: 3,
    descripcion: 'Cuerpo completo con prioridad en glúteo y pierna. Orientada a mujeres, abierta a cualquiera.',
    paraQuien: 'Quien quiere priorizar glúteo y pierna.',
    reglasDescanso: {
      requiereDescansoEntreSesiones: true,
      notaDescanso:
        'Cada sesión es de cuerpo completo con énfasis en glúteo y pierna: descansa al menos un día entre sesiones.',
    },
    dias: [
      {
        nombre: 'Día A · Glúteo dominante',
        ejercicios: [
          ej('hip_thrust', 'Hip thrust', 'gluteo', 4, '12', '90 seg'),
          ej('sentadilla_barra', 'Sentadilla con barra', 'cuadriceps', 3, '10', '90 seg'),
          ej('peso_muerto_rumano', 'Peso muerto rumano', 'femoral', 3, '10', '90 seg'),
          ej('abduccion_cadera_maquina', 'Abducción de cadera en máquina', 'gluteo', 3, '15', '45 seg'),
          ej('plancha', 'Plancha', 'core', 3, '30 seg', '45 seg'),
        ],
      },
      {
        nombre: 'Día B · Tren superior',
        ejercicios: [
          ej('jalon_pecho_polea', 'Jalón al pecho en polea', 'espalda', 3, '12', '60-90 seg'),
          ej('press_hombro_mancuernas', 'Press de hombro con mancuernas', 'hombro', 3, '12', '60-90 seg'),
          ej('remo_sentado_polea', 'Remo sentado en polea', 'espalda', 3, '12', '60-90 seg'),
          ej('curl_mancuernas_alterno', 'Curl con mancuernas alterno', 'biceps', 2, '12', '60 seg'),
          ej('extension_triceps_polea', 'Extensión de tríceps en polea', 'triceps', 2, '12', '60 seg'),
        ],
      },
      {
        nombre: 'Día C · Pierna y glúteo',
        ejercicios: [
          ej('sentadilla_bulgara', 'Sentadilla búlgara', 'cuadriceps', 3, '12', '60-90 seg'),
          ej('zancadas', 'Zancadas (desplantes)', 'cuadriceps', 3, '12', '60-90 seg'),
          ej('puente_gluteo', 'Puente de glúteo', 'gluteo', 3, '15', '45 seg'),
          ej('curl_femoral_tumbado', 'Curl femoral tumbado', 'femoral', 3, '12', '60 seg'),
          ej('patada_gluteo_polea', 'Patada de glúteo en polea', 'gluteo', 3, '15', '45 seg'),
          ej('elevacion_talones_sentado', 'Elevación de talones sentado', 'pantorrilla', 3, '15', '45 seg'),
        ],
      },
    ],
  },

  // ===================================================================== R3
  {
    id: 'upper-lower-4d',
    nombre: 'Upper / Lower',
    nivel: 'intermedio',
    objetivo: 'musculo',
    diasPorSemana: 4,
    descripcion: 'Tren superior e inferior en días alternos. Ideal para 4 días con buen volumen.',
    paraQuien: 'Quien ya domina la técnica y entrena 4 días.',
    reglasDescanso: {
      requiereDescansoEntreSesiones: true,
      notaDescanso:
        'Alterna superior e inferior; aun así conviene no entrenar dos días seguidos. Ideal: 2 días, descanso, 2 días.',
    },
    dias: [
      {
        nombre: 'Upper A',
        ejercicios: [
          ej('press_banca_barra', 'Press de banca con barra', 'pecho', 4, '8', '90-120 seg'),
          ej('remo_barra', 'Remo con barra', 'espalda', 4, '8', '90-120 seg'),
          ej('press_militar_barra', 'Press militar con barra', 'hombro', 3, '10', '90 seg'),
          ej('jalon_pecho_polea', 'Jalón al pecho en polea', 'espalda', 3, '10', '90 seg'),
          ej('curl_barra', 'Curl con barra', 'biceps', 3, '12', '60 seg'),
          ej('extension_triceps_polea', 'Extensión de tríceps en polea', 'triceps', 3, '12', '60 seg'),
        ],
      },
      {
        nombre: 'Lower A',
        ejercicios: [
          ej('sentadilla_barra', 'Sentadilla con barra', 'cuadriceps', 4, '8', '90-120 seg'),
          ej('peso_muerto_rumano', 'Peso muerto rumano', 'femoral', 3, '10', '90 seg'),
          ej('prensa_pierna', 'Prensa de pierna', 'cuadriceps', 3, '12', '90 seg'),
          ej('curl_femoral_sentado', 'Curl femoral sentado', 'femoral', 3, '12', '60 seg'),
          ej('elevacion_talones_pie', 'Elevación de talones de pie', 'pantorrilla', 4, '15', '45 seg'),
          ej('plancha', 'Plancha', 'core', 3, '40 seg', '45 seg'),
        ],
      },
      {
        nombre: 'Upper B',
        ejercicios: [
          ej('press_inclinado_mancuernas', 'Press inclinado con mancuernas', 'pecho', 4, '10', '90 seg'),
          ej('remo_mancuerna_unilateral', 'Remo con mancuerna a una mano', 'espalda', 3, '10', '90 seg'),
          ej('elevaciones_laterales', 'Elevaciones laterales', 'hombro', 4, '15', '45 seg'),
          ej('dominadas', 'Dominadas', 'espalda', 3, 'AMRAP', '90 seg'),
          ej('face_pull', 'Face pull (jalón a la cara)', 'hombro', 3, '15', '45 seg'),
          ej('curl_martillo', 'Curl martillo', 'biceps', 3, '12', '60 seg'),
          ej('press_frances', 'Press francés', 'triceps', 3, '12', '60 seg'),
        ],
      },
      {
        nombre: 'Lower B',
        ejercicios: [
          ej('peso_muerto_convencional', 'Peso muerto convencional', 'espalda', 4, '6', '2-3 min'),
          ej('sentadilla_bulgara', 'Sentadilla búlgara', 'cuadriceps', 3, '12', '90 seg'),
          ej('hip_thrust', 'Hip thrust', 'gluteo', 4, '12', '90 seg'),
          ej('extension_cuadriceps', 'Extensión de cuádriceps', 'cuadriceps', 3, '15', '60 seg'),
          ej('hiperextensiones', 'Hiperextensiones (extensión lumbar)', 'femoral', 3, '12', '60 seg'),
          ej('giro_ruso', 'Giro ruso (russian twist)', 'core', 3, '20', '45 seg'),
        ],
      },
    ],
  },

  // ===================================================================== R4
  {
    id: 'ppl-3d',
    nombre: 'Push / Pull / Legs',
    nivel: 'intermedio',
    objetivo: 'musculo',
    diasPorSemana: 3,
    descripcion: 'Empuje, jalón y pierna en tres días. Un clásico para ganar músculo con una vuelta por semana.',
    paraQuien: 'Quien entrena 3 días y busca hipertrofia.',
    reglasDescanso: {
      requiereDescansoEntreSesiones: true,
      notaDescanso:
        'Con 3 días, distribúyelos con descanso entre cada uno (ej. lunes, miércoles, viernes) para recuperar.',
    },
    dias: [
      {
        nombre: 'Día 1 · Empuje (Push)',
        ejercicios: [
          ej('press_banca_barra', 'Press de banca con barra', 'pecho', 4, '8', '90-120 seg'),
          ej('press_hombro_mancuernas', 'Press de hombro con mancuernas', 'hombro', 3, '10', '90 seg'),
          ej('press_inclinado_mancuernas', 'Press inclinado con mancuernas', 'pecho', 3, '10', '90 seg'),
          ej('elevaciones_laterales', 'Elevaciones laterales', 'hombro', 3, '15', '45 seg'),
          ej('extension_triceps_polea', 'Extensión de tríceps en polea', 'triceps', 3, '12', '60 seg'),
          ej('press_frances', 'Press francés', 'triceps', 3, '12', '60 seg'),
        ],
      },
      {
        nombre: 'Día 2 · Jalón (Pull)',
        ejercicios: [
          ej('peso_muerto_convencional', 'Peso muerto convencional', 'espalda', 4, '6', '2-3 min'),
          ej('dominadas', 'Dominadas', 'espalda', 3, 'AMRAP', '90 seg'),
          ej('remo_barra', 'Remo con barra', 'espalda', 4, '8', '90 seg'),
          ej('jalon_pecho_polea', 'Jalón al pecho en polea', 'espalda', 3, '10', '90 seg'),
          ej('face_pull', 'Face pull (jalón a la cara)', 'hombro', 3, '15', '45 seg'),
          ej('curl_barra', 'Curl con barra', 'biceps', 3, '12', '60 seg'),
          ej('curl_martillo', 'Curl martillo', 'biceps', 3, '12', '60 seg'),
        ],
      },
      {
        nombre: 'Día 3 · Pierna (Legs)',
        ejercicios: [
          ej('sentadilla_barra', 'Sentadilla con barra', 'cuadriceps', 4, '8', '90-120 seg'),
          ej('prensa_pierna', 'Prensa de pierna', 'cuadriceps', 3, '12', '90 seg'),
          ej('peso_muerto_rumano', 'Peso muerto rumano', 'femoral', 3, '10', '90 seg'),
          ej('extension_cuadriceps', 'Extensión de cuádriceps', 'cuadriceps', 3, '15', '60 seg'),
          ej('curl_femoral_tumbado', 'Curl femoral tumbado', 'femoral', 3, '12', '60 seg'),
          ej('elevacion_talones_pie', 'Elevación de talones de pie', 'pantorrilla', 4, '15', '45 seg'),
        ],
      },
    ],
  },

  // ===================================================================== R5
  {
    id: 'ppl-6d',
    nombre: 'Push / Pull / Legs 6 días',
    nivel: 'avanzado',
    objetivo: 'musculo',
    diasPorSemana: 6,
    descripcion: 'PPL dos veces por semana con variación A/B. Alto volumen para avanzados con 6 días.',
    paraQuien: 'Avanzados con disponibilidad de 6 días.',
    reglasDescanso: {
      requiereDescansoEntreSesiones: false,
      notaDescanso:
        'Al alternar grupos musculares, sí puedes entrenar días seguidos. Deja al menos un día de descanso a la semana.',
    },
    dias: [
      {
        nombre: 'Día 1 · Push A',
        ejercicios: [
          ej('press_banca_barra', 'Press de banca con barra', 'pecho', 4, '8', '90-120 seg'),
          ej('press_hombro_mancuernas', 'Press de hombro con mancuernas', 'hombro', 3, '10', '90 seg'),
          ej('press_inclinado_mancuernas', 'Press inclinado con mancuernas', 'pecho', 3, '10', '90 seg'),
          ej('elevaciones_laterales', 'Elevaciones laterales', 'hombro', 3, '15', '45 seg'),
          ej('extension_triceps_polea', 'Extensión de tríceps en polea', 'triceps', 3, '12', '60 seg'),
          ej('press_frances', 'Press francés', 'triceps', 3, '12', '60 seg'),
        ],
      },
      {
        nombre: 'Día 2 · Pull A',
        ejercicios: [
          ej('peso_muerto_convencional', 'Peso muerto convencional', 'espalda', 4, '6', '2-3 min'),
          ej('dominadas', 'Dominadas', 'espalda', 3, 'AMRAP', '90 seg'),
          ej('remo_barra', 'Remo con barra', 'espalda', 4, '8', '90 seg'),
          ej('jalon_pecho_polea', 'Jalón al pecho en polea', 'espalda', 3, '10', '90 seg'),
          ej('face_pull', 'Face pull (jalón a la cara)', 'hombro', 3, '15', '45 seg'),
          ej('curl_barra', 'Curl con barra', 'biceps', 3, '12', '60 seg'),
          ej('curl_martillo', 'Curl martillo', 'biceps', 3, '12', '60 seg'),
        ],
      },
      {
        nombre: 'Día 3 · Legs A',
        ejercicios: [
          ej('sentadilla_barra', 'Sentadilla con barra', 'cuadriceps', 4, '8', '90-120 seg'),
          ej('prensa_pierna', 'Prensa de pierna', 'cuadriceps', 3, '12', '90 seg'),
          ej('peso_muerto_rumano', 'Peso muerto rumano', 'femoral', 3, '10', '90 seg'),
          ej('extension_cuadriceps', 'Extensión de cuádriceps', 'cuadriceps', 3, '15', '60 seg'),
          ej('curl_femoral_tumbado', 'Curl femoral tumbado', 'femoral', 3, '12', '60 seg'),
          ej('elevacion_talones_pie', 'Elevación de talones de pie', 'pantorrilla', 4, '15', '45 seg'),
        ],
      },
      {
        nombre: 'Día 4 · Push B (hombro/volumen)',
        ejercicios: [
          ej('press_militar_barra', 'Press militar con barra', 'hombro', 4, '8', '90-120 seg'),
          ej('press_pecho_maquina', 'Press de pecho en máquina', 'pecho', 4, '12', '90 seg'),
          ej('aperturas_mancuerna', 'Aperturas con mancuerna', 'pecho', 3, '15', '45 seg'),
          ej('elevaciones_laterales', 'Elevaciones laterales', 'hombro', 4, '15', '45 seg'),
          ej('press_cerrado_barra', 'Press cerrado con barra', 'triceps', 3, '10', '90 seg'),
          ej('fondos_banco', 'Fondos en banco', 'triceps', 3, '12', '60 seg'),
        ],
      },
      {
        nombre: 'Día 5 · Pull B',
        ejercicios: [
          ej('remo_sentado_polea', 'Remo sentado en polea', 'espalda', 4, '10', '90 seg'),
          ej('remo_mancuerna_unilateral', 'Remo con mancuerna a una mano', 'espalda', 3, '10', '90 seg'),
          ej('jalon_pecho_polea', 'Jalón al pecho en polea', 'espalda', 4, '12', '90 seg'),
          ej('pajaros_deltoide_posterior', 'Pájaros (deltoide posterior)', 'hombro', 3, '15', '45 seg'),
          ej('curl_predicador', 'Curl en banco predicador', 'biceps', 3, '12', '60 seg'),
          ej('curl_mancuernas_alterno', 'Curl con mancuernas alterno', 'biceps', 3, '12', '60 seg'),
        ],
      },
      {
        nombre: 'Día 6 · Legs B (glúteo/femoral)',
        ejercicios: [
          ej('peso_muerto_rumano', 'Peso muerto rumano', 'femoral', 4, '8', '90-120 seg'),
          ej('hip_thrust', 'Hip thrust', 'gluteo', 4, '12', '90 seg'),
          ej('sentadilla_bulgara', 'Sentadilla búlgara', 'cuadriceps', 3, '12', '90 seg'),
          ej('curl_femoral_sentado', 'Curl femoral sentado', 'femoral', 3, '15', '60 seg'),
          ej('abduccion_cadera_maquina', 'Abducción de cadera en máquina', 'gluteo', 3, '15', '45 seg'),
          ej('elevacion_talones_sentado', 'Elevación de talones sentado', 'pantorrilla', 4, '20', '45 seg'),
        ],
      },
    ],
  },

  // ===================================================================== R6
  {
    id: 'fuerza-3d',
    nombre: 'Fuerza',
    nivel: 'intermedio',
    objetivo: 'fuerza',
    diasPorSemana: 3,
    descripcion: 'Básicos pesados (sentadilla, press banca, peso muerto) con reps bajas y descansos largos.',
    paraQuien: 'Quien busca fuerza en los grandes levantamientos.',
    reglasDescanso: {
      requiereDescansoEntreSesiones: true,
      notaDescanso:
        'Levantamientos pesados: necesitan buena recuperación. Deja un día de descanso entre sesiones.',
    },
    dias: [
      {
        nombre: 'Día 1',
        ejercicios: [
          ej('sentadilla_barra', 'Sentadilla con barra', 'cuadriceps', 5, '5', '2-3 min'),
          ej('press_banca_barra', 'Press de banca con barra', 'pecho', 5, '5', '2-3 min'),
          ej('remo_barra', 'Remo con barra', 'espalda', 5, '5', '2-3 min'),
        ],
      },
      {
        nombre: 'Día 2',
        ejercicios: [
          ej('peso_muerto_convencional', 'Peso muerto convencional', 'espalda', 5, '3', '3 min'),
          ej('press_militar_barra', 'Press militar con barra', 'hombro', 5, '5', '2-3 min'),
          ej('dominadas', 'Dominadas', 'espalda', 4, '6', '2 min'),
        ],
      },
      {
        nombre: 'Día 3',
        ejercicios: [
          ej('sentadilla_barra', 'Sentadilla con barra', 'cuadriceps', 4, '6', '2-3 min'),
          ej('press_banca_barra', 'Press de banca con barra', 'pecho', 4, '6', '2-3 min'),
          ej('peso_muerto_rumano', 'Peso muerto rumano', 'femoral', 4, '6', '2 min'),
          ej('fondos_paralelas', 'Fondos en paralelas', 'pecho', 3, '8', '90 seg'),
        ],
      },
    ],
  },

  // ===================================================================== R7
  {
    id: 'hipertrofia-ul-4d',
    nombre: 'Hipertrofia (músculo)',
    nivel: 'intermedio',
    objetivo: 'musculo',
    diasPorSemana: 4,
    descripcion: 'Upper/Lower enfocado en volumen y aislamiento, reps medias-altas para máximo crecimiento.',
    paraQuien: 'Quien prioriza ganar masa muscular.',
    reglasDescanso: {
      requiereDescansoEntreSesiones: true,
      notaDescanso:
        'Volumen alto por grupo: evita días seguidos para recuperar. Ideal: 2 días, descanso, 2 días.',
    },
    dias: [
      {
        nombre: 'Upper A',
        ejercicios: [
          ej('press_inclinado_mancuernas', 'Press inclinado con mancuernas', 'pecho', 4, '10', '90 seg'),
          ej('remo_sentado_polea', 'Remo sentado en polea', 'espalda', 4, '12', '90 seg'),
          ej('press_pecho_maquina', 'Press de pecho en máquina', 'pecho', 3, '12', '60-90 seg'),
          ej('jalon_pecho_polea', 'Jalón al pecho en polea', 'espalda', 3, '12', '60-90 seg'),
          ej('elevaciones_laterales', 'Elevaciones laterales', 'hombro', 4, '15', '45 seg'),
          ej('curl_barra', 'Curl con barra', 'biceps', 3, '12', '60 seg'),
          ej('extension_triceps_polea', 'Extensión de tríceps en polea', 'triceps', 3, '15', '60 seg'),
        ],
      },
      {
        nombre: 'Lower A',
        ejercicios: [
          ej('prensa_pierna', 'Prensa de pierna', 'cuadriceps', 4, '12', '90 seg'),
          ej('peso_muerto_rumano', 'Peso muerto rumano', 'femoral', 4, '10', '90 seg'),
          ej('extension_cuadriceps', 'Extensión de cuádriceps', 'cuadriceps', 3, '15', '60 seg'),
          ej('curl_femoral_sentado', 'Curl femoral sentado', 'femoral', 3, '15', '60 seg'),
          ej('hip_thrust', 'Hip thrust', 'gluteo', 3, '12', '90 seg'),
          ej('elevacion_talones_pie', 'Elevación de talones de pie', 'pantorrilla', 4, '20', '45 seg'),
        ],
      },
      {
        nombre: 'Upper B',
        ejercicios: [
          ej('press_banca_barra', 'Press de banca con barra', 'pecho', 4, '8', '90 seg'),
          ej('remo_barra', 'Remo con barra', 'espalda', 4, '10', '90 seg'),
          ej('press_hombro_mancuernas', 'Press de hombro con mancuernas', 'hombro', 3, '12', '60-90 seg'),
          ej('dominadas', 'Dominadas', 'espalda', 3, 'AMRAP', '90 seg'),
          ej('aperturas_mancuerna', 'Aperturas con mancuerna', 'pecho', 3, '15', '45 seg'),
          ej('curl_martillo', 'Curl martillo', 'biceps', 3, '12', '60 seg'),
          ej('press_frances', 'Press francés', 'triceps', 3, '15', '60 seg'),
        ],
      },
      {
        nombre: 'Lower B',
        ejercicios: [
          ej('sentadilla_barra', 'Sentadilla con barra', 'cuadriceps', 4, '10', '90 seg'),
          ej('sentadilla_bulgara', 'Sentadilla búlgara', 'cuadriceps', 3, '12', '90 seg'),
          ej('curl_femoral_tumbado', 'Curl femoral tumbado', 'femoral', 3, '15', '60 seg'),
          ej('abduccion_cadera_maquina', 'Abducción de cadera en máquina', 'gluteo', 3, '15', '45 seg'),
          ej('elevacion_talones_sentado', 'Elevación de talones sentado', 'pantorrilla', 4, '20', '45 seg'),
          ej('plancha', 'Plancha', 'core', 3, '45 seg', '45 seg'),
        ],
      },
    ],
  },

  // ===================================================================== R8
  {
    id: 'definicion-4d',
    nombre: 'Definición / Pérdida de grasa',
    nivel: 'intermedio',
    objetivo: 'definicion',
    diasPorSemana: 4,
    descripcion: 'Full body en circuito con descansos cortos y cardio al cierre para bajar grasa y tonificar.',
    paraQuien: 'Quien quiere bajar grasa y tonificar.',
    reglasDescanso: {
      requiereDescansoEntreSesiones: true,
      notaDescanso:
        'Cada sesión es de cuerpo completo: intercala días de descanso entre entrenamientos.',
    },
    dias: [
      {
        nombre: 'Día 1 · Full body A',
        ejercicios: [
          ej('sentadilla_barra', 'Sentadilla con barra', 'cuadriceps', 3, '15', '45-60 seg'),
          ej('press_banca_barra', 'Press de banca con barra', 'pecho', 3, '15', '45-60 seg'),
          ej('remo_sentado_polea', 'Remo sentado en polea', 'espalda', 3, '15', '45-60 seg'),
          ej('press_hombro_mancuernas', 'Press de hombro con mancuernas', 'hombro', 3, '15', '45-60 seg'),
          ej('plancha', 'Plancha', 'core', 3, '40 seg', '45 seg'),
          ej('caminadora', 'Caminadora', 'cardio', 1, '15 min', '—'),
        ],
      },
      {
        nombre: 'Día 2 · Full body B',
        ejercicios: [
          ej('peso_muerto_rumano', 'Peso muerto rumano', 'femoral', 3, '15', '45-60 seg'),
          ej('jalon_pecho_polea', 'Jalón al pecho en polea', 'espalda', 3, '15', '45-60 seg'),
          ej('press_inclinado_mancuernas', 'Press inclinado con mancuernas', 'pecho', 3, '15', '45-60 seg'),
          ej('zancadas', 'Zancadas (desplantes)', 'cuadriceps', 3, '12', '45-60 seg'),
          ej('giro_ruso', 'Giro ruso (russian twist)', 'core', 3, '20', '45 seg'),
          ej('cuerda_saltar', 'Cuerda para saltar', 'cardio', 1, '10 min', '—'),
        ],
      },
      {
        nombre: 'Día 3 · Full body C',
        ejercicios: [
          ej('prensa_pierna', 'Prensa de pierna', 'cuadriceps', 3, '15', '45-60 seg'),
          ej('press_pecho_maquina', 'Press de pecho en máquina', 'pecho', 3, '15', '45-60 seg'),
          ej('remo_mancuerna_unilateral', 'Remo con mancuerna a una mano', 'espalda', 3, '12', '45-60 seg'),
          ej('elevaciones_laterales', 'Elevaciones laterales', 'hombro', 3, '15', '45 seg'),
          ej('crunch_abdominal', 'Crunch abdominal', 'core', 3, '20', '45 seg'),
          ej('bicicleta_estatica', 'Bicicleta estática', 'cardio', 1, '15 min', '—'),
        ],
      },
      {
        nombre: 'Día 4 · Glúteo y cardio',
        ejercicios: [
          ej('hip_thrust', 'Hip thrust', 'gluteo', 3, '15', '45-60 seg'),
          ej('sentadilla_bulgara', 'Sentadilla búlgara', 'cuadriceps', 3, '12', '45-60 seg'),
          ej('abduccion_cadera_maquina', 'Abducción de cadera en máquina', 'gluteo', 3, '20', '45 seg'),
          ej('puente_gluteo', 'Puente de glúteo', 'gluteo', 3, '20', '45 seg'),
          ej('remo_ergometro', 'Remo ergómetro', 'cardio', 1, '12 min', '—'),
          ej('burpees', 'Burpees', 'cardio', 3, '12', '45 seg', 'Opcional'),
        ],
      },
    ],
  },
]

// Catálogo de objetivos/niveles para construir los filtros de la UI sin recalcular.
export const NIVELES = [
  { id: 'principiante', label: 'Principiante' },
  { id: 'intermedio', label: 'Intermedio' },
  { id: 'avanzado', label: 'Avanzado' },
]

export const OBJETIVOS = [
  { id: 'general', label: 'General' },
  { id: 'gluteo', label: 'Glúteo' },
  { id: 'musculo', label: 'Músculo' },
  { id: 'fuerza', label: 'Fuerza' },
  { id: 'definicion', label: 'Definición' },
]

// Días de la semana para programar la rutina. `orden` (0=lunes … 6=domingo) sirve
// para detectar días consecutivos al validar el descanso. La semana se trata como
// CÍCLICA: domingo (6) y lunes (0) también cuentan como consecutivos.
export const DIAS_SEMANA = [
  { id: 'lunes', label: 'Lunes', corto: 'Lun', orden: 0 },
  { id: 'martes', label: 'Martes', corto: 'Mar', orden: 1 },
  { id: 'miercoles', label: 'Miércoles', corto: 'Mié', orden: 2 },
  { id: 'jueves', label: 'Jueves', corto: 'Jue', orden: 3 },
  { id: 'viernes', label: 'Viernes', corto: 'Vie', orden: 4 },
  { id: 'sabado', label: 'Sábado', corto: 'Sáb', orden: 5 },
  { id: 'domingo', label: 'Domingo', corto: 'Dom', orden: 6 },
]
