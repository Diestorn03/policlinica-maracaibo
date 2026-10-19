// Todo el contenido fijo del sitio sale de aquí. Datos reales del sitio actual (oct. 2026); nada inventado.
// Lo pendiente del profesor va marcado POR CONFIRMAR.
import tomografia from '../assets/img/tomografia.jpg';
import videoEndoscopia from '../assets/img/video-endoscopia.jpg';
import laboratorio from '../assets/img/laboratorio.jpg';
import cirugia from '../assets/img/cirugia.jpg';
import uci from '../assets/img/uci.jpg';
import bariatrica from '../assets/img/bariatrica.jpg';
import rayosX from '../assets/img/rayos-x.jpg';
import obstetrica from '../assets/img/obstetrica.jpg';
import inst1 from '../assets/img/inst-1.jpg';
import inst2 from '../assets/img/inst-2.jpg';
import inst3 from '../assets/img/inst-3.jpg';
import inst4 from '../assets/img/inst-4.jpg';
import inst5 from '../assets/img/inst-5.jpg';
import inst6 from '../assets/img/inst-6.jpg';
import inst7 from '../assets/img/inst-7.jpg';
import home1 from '../assets/img/home-1.jpg';
import home2 from '../assets/img/home-2.jpg';
import home3 from '../assets/img/home-3.jpg';

export const clinica = {
  nombre: 'Policlínica Maracaibo',
  desde: 1952,
  lema: 'Celebrando tu bienestar',
  direccion: 'Av. 8 Santa Rita, entre calles 70 y 71',
  ciudad: 'Maracaibo, Venezuela',
  mapa: 'https://goo.gl/maps/7dhbhw7Po3vPXWyW6',
  telefono: { texto: '(0261) 700-5100', href: 'tel:+582617005100' },
  emergencias: { texto: '+58 (0261) 700-5141', href: 'tel:+582617005141' },
  whatsapp: { texto: '+58 412-4248304', href: 'https://api.whatsapp.com/send/?phone=584124248304&text=Solicitud+de+cita' },
  correo: 'polimarweb@gmail.com',
  instagram: { texto: '@policlinica_maracaibo', href: 'https://instagram.com/policlinica_maracaibo' },
  horario: { emergencias: 'Emergencias abiertas las 24 horas', citas: 'Citas de lunes a viernes, de 8:00 a. m. a 4:00 p. m.' },
  mision:
    'Optimizar el funcionamiento de la institución, mediante un proyecto de mejora continua, respondiendo a las expectativas de la comunidad en general en la prestación de servicios de salud, preventivos y curativos con criterio de excelencia.',
  vision:
    'Lograr el mejoramiento continuo para afrontar oportunidades en el nuevo milenio, en la prestación de servicio, en atención holística con excelencia, contando con los recursos humanos capacitados, programas y pautas para el logro de sus objetivos y metas dirigidos a promocionar, restaurar y rehabilitar la salud.',
};

/** Años de servicio, calculado (no se desactualiza) */
export const anos = () => new Date().getFullYear() - clinica.desde;

/** Fondo de la tarjeta/cabecera del servicio (data-tema) */
export type TemaServicio = 'brisa' | 'sol' | 'lago';

export interface Servicio {
  slug: string;
  nombre: string;
  resumen: string;
  detalle: string[];
  horario?: string;
  imagen: ImageMetadata;
  /** orden del sitio actual, 1–9 (Especialidades es el 4.º y vive en indiceServicios) */
  num: number;
  /** línea corta real para índices y tarjetas */
  dato: string;
  tema: TemaServicio;
  /** alt de la foto y object-position del recorte (DESIGN 4.0.2) */
  alt: string;
  pos: string;
  /** slug de la especialidad del directorio relacionada (enlace "Ver especialistas") */
  especialidad?: string;
}

// El orden es el del sitio actual. "Especialidades" no es un servicio con foto: tiene su propia página (/especialidades/).
export const servicios: Servicio[] = [
  { slug: 'tomografia', nombre: 'Tomografía', resumen: 'Estudios tomográficos con cita previa en algunos casos.', detalle: ['Algunos estudios requieren cita previa.'], horario: '7:00 a. m. a 5:00 p. m.', imagen: tomografia, num: 1, dato: '7 am–5 pm', tema: 'lago', alt: 'Sala de tomografía: el equipo al fondo y la estación de lectura al frente', pos: '72% 55%', especialidad: 'radiologia-e-imagenes' },
  { slug: 'video-endoscopia', nombre: 'Video endoscopia', resumen: 'Estudios endoscópicos de lunes a viernes.', detalle: [], horario: 'Lunes a viernes, 8:00 a. m. a 2:00 p. m.', imagen: videoEndoscopia, num: 2, dato: 'Lunes a viernes, 8 am–2 pm', tema: 'brisa', alt: 'Sala de video endoscopia con camilla y torre de equipos', pos: '50% 30%', especialidad: 'gastroenterologia' },
  { slug: 'laboratorio', nombre: 'Laboratorio', resumen: 'Laboratorio clínico con servicio de emergencia las 24 horas.', detalle: ['Emergencias las 24 horas.'], horario: '7:00 a. m. a 5:00 p. m.', imagen: laboratorio, num: 3, dato: '7 am–5 pm · Emergencias 24 h', tema: 'sol', alt: 'Profesional del laboratorio observando una muestra al microscopio', pos: '60% 40%' },
  { slug: 'cirugia', nombre: 'Cirugía', resumen: 'Asistencia integral en procedimientos quirúrgicos electivos y de urgencia.', detalle: ['Nuestro objetivo es ofrecer al paciente una asistencia integral que comprenda el diagnóstico y tratamiento de enfermedades que se resuelven por procedimientos quirúrgicos o potencialmente quirúrgicos tanto electivos como de urgencia y que asegure los más altos niveles de calidad.'], imagen: cirugia, num: 5, dato: 'Electivas y de urgencia', tema: 'lago', alt: 'Equipo quirúrgico durante una intervención, bajo la lámpara del quirófano', pos: '50% 50%', especialidad: 'cirugia-general' },
  { slug: 'uci', nombre: 'UCI', resumen: 'Unidad de cuidados intensivos con apoyo diagnóstico las 24 horas.', detalle: ['Infraestructura de alta tecnología.', 'Personal altamente capacitado en medicina crítica.', 'Servicios de banco de sangre, laboratorio y radiología completa en el área física y disponibles las 24 horas.'], imagen: uci, num: 6, dato: 'Medicina crítica', tema: 'sol', alt: 'Cama de la unidad de cuidados intensivos con monitor y ventilador', pos: '50% 50%', especialidad: 'medicina-critica' },
  { slug: 'cirugia-bariatrica', nombre: 'Unidad de Cirugía Bariátrica', resumen: 'Un equipo coordinado para mejorar tus hábitos y optimizar tu salud.', detalle: ['La Policlínica Maracaibo pone a tu disposición la Unidad de Cirugía Bariátrica, integrada por especialistas en cirugía bariátrica, medicina interna, endocrinología, psiquiatría, gastroenterología, además de psicólogos y nutricionistas, quienes de manera coordinada te brindarán apoyo y acompañamiento para mejorar tus hábitos nutricionales y optimizar tu salud.'], imagen: bariatrica, num: 7, dato: 'Equipo multidisciplinario', tema: 'brisa', alt: 'Recepción de la Unidad de Cirugía Bariátrica con dos integrantes del equipo', pos: '50% 58%', especialidad: 'cirugia-bariatrica' },
  { slug: 'rayos-x', nombre: 'Rayos X', resumen: 'Estudios radiológicos con cita previa en algunos casos.', detalle: ['Algunos estudios requieren cita previa.'], horario: '7:00 a. m. a 5:00 p. m.', imagen: rayosX, num: 8, dato: '7 am–5 pm', tema: 'lago', alt: 'Médico revisando una imagen en el monitor de la sala de radiología', pos: '30% 45%', especialidad: 'radiologia-e-imagenes' },
  { slug: 'obstetrica-neonatal', nombre: 'Unidad Obstétrica Neonatal', resumen: 'Atención integral durante el embarazo, el parto y el puerperio.', detalle: ['Su misión es la atención integral a las mujeres en el proceso del embarazo, parto y puerperio fisiológicos, y en los estados patológicos relacionados con el embarazo.'], imagen: obstetrica, num: 9, dato: 'Embarazo, parto y puerperio', tema: 'sol', alt: 'Sala de atención obstétrica con cama de parto y lámpara', pos: '50% 50%', especialidad: 'ginecologia-y-obstetricia' },
];

/** Fila del índice de los 9 servicios (home, /servicios/, footer). `href` va SIN base: pasarlo por u(). */
export interface IndiceServicio {
  slug: string;
  nombre: string;
  href: string;
  dato: string;
  num: number;
  tema: TemaServicio;
  /** sin foto (Especialidades): la tarjeta pinta disco sol + isotipo + anillos */
  imagen?: ImageMetadata;
  alt?: string;
  pos?: string;
}

// Los 9 en el orden del sitio actual. `/servicios/especialidades/` no existe: [slug].astro redirige a `/especialidades/`.
export const indiceServicios: IndiceServicio[] = [
  ...servicios.map(({ slug, nombre, dato, num, tema, imagen, alt, pos }) => ({ slug, nombre, href: `/servicios/${slug}/`, dato, num, tema, imagen, alt, pos })),
  { slug: 'especialidades', nombre: 'Especialidades', href: '/especialidades/', dato: 'Directorio por especialidad', num: 4, tema: 'brisa' as const },
].sort((a, b) => a.num - b.num);

/** Horarios con días (para «Abierto ahora») o sin ellos (solo se muestran). dias: 0 = domingo … 6 = sábado.
 *  Sin `dias` = el dato no trae días: se muestra el horario y NO se calcula «Abierto ahora». */
export interface Horario { id: string; nombre: string; desde: number; hasta: number; dias?: number[]; h24?: boolean; nota?: string; servicio?: string }
export const horarios: Horario[] = [
  { id: 'emergencias', nombre: 'Emergencias', desde: 0, hasta: 24, dias: [0, 1, 2, 3, 4, 5, 6], h24: true, nota: 'Abiertas las 24 horas' },
  { id: 'citas', nombre: 'Citas', desde: 8, hasta: 16, dias: [1, 2, 3, 4, 5], nota: 'Lunes a viernes' },
  { id: 'tomografia', nombre: 'Tomografía', desde: 7, hasta: 17, servicio: 'tomografia', nota: 'Algunos estudios requieren cita previa' },
  { id: 'rayos-x', nombre: 'Rayos X', desde: 7, hasta: 17, servicio: 'rayos-x', nota: 'Algunos estudios requieren cita previa' },
  { id: 'laboratorio', nombre: 'Laboratorio', desde: 7, hasta: 17, servicio: 'laboratorio', nota: 'Emergencias 24 horas' },
  { id: 'video-endoscopia', nombre: 'Video endoscopia', desde: 8, hasta: 14, dias: [1, 2, 3, 4, 5], servicio: 'video-endoscopia', nota: 'Lunes a viernes' },
];

/** Hitos reales de la historia. NO inventar más: la clínica añadirá los suyos aquí (la posición en la escena es (anio − 1952) / anos()). */
export const hitos = [
  { anio: 1952, texto: 'Comenzamos' },
  { anio: 2022, texto: '70 años celebrando tu bienestar' },
];
/** Los hitos más el del año actual, calculado: «{anos()} años, y seguimos» */
export const hitosConHoy = () => [...hitos, { anio: clinica.desde + anos(), texto: `${anos()} años, y seguimos` }];

export const testimonios = [
  { texto: 'Tienen a los mejores especialistas de la región, los recomiendo.' },
  { texto: 'Excelente atención, conforme con el servicio prestado.' },
  { texto: 'Orgullosa de pertenecer a esta gran familia.' },
];

/** Fotos de instalaciones (teléfono, 2022): siempre en apertura (círculo/arco) o bajo velo; nunca a sangre sin velo. */
export const instalaciones: { src: ImageMetadata; alt: string; pie: string }[] = [
  { src: inst2, pie: 'Vista desde la calle', alt: 'La Policlínica vista desde la esquina, con sus dos plantas y jardineras' },
  { src: inst3, pie: 'La entrada', alt: 'Entrada de la Policlínica con bancas de concreto, una palma y el bordillo amarillo' },
  { src: inst4, pie: 'El frente', alt: 'Fachada de la Policlínica con reja, jardineras y cielo azul' },
  { src: inst5, pie: 'Acceso a Emergencia', alt: 'Fachada desde la esquina, con el letrero de Emergencia a la izquierda' },
  { src: inst6, pie: 'Entrada y estacionamiento', alt: 'Entrada con una banca de concreto, palmas y estacionamiento' },
  { src: inst7, pie: 'Calle y jardineras', alt: 'Frente de la clínica con reja blanca y plantas trepadoras' },
  { src: inst1, pie: 'Fachada de piedra y jardín', alt: 'Esquina de la Policlínica con muro de piedra y césped' },
];
// home-1/2/3.jpg NO se usan en ninguna página (DESIGN 1.5: carnet y selfis; poner caras junto a una cita sugiere que esa persona la dijo)
export const fotosInicio = { home1, home2, home3 };

export const afiliacion = {
  titulo: 'Afiliación Policlínica',
  idea: 'Todos los servicios de la Policlínica a un único precio, con telemedicina incluida.',
  incluye: ['Acceso a todos los servicios de la Policlínica', 'Telemedicina: consulta por videollamada desde tu casa', 'Historial de tus consultas en tu panel'],
  precio: null as string | null, // POR CONFIRMAR con el profesor: precio y periodicidad
  cta: { texto: 'Consultar precio y afiliarme', href: 'https://api.whatsapp.com/send/?phone=584124248304&text=Quiero+informaci%C3%B3n+sobre+la+afiliaci%C3%B3n' },
};

export const nav = [
  { href: '/servicios/', texto: 'Servicios' },
  { href: '/especialidades/', texto: 'Especialidades' },
  { href: '/directorio/', texto: 'Directorio médico' },
  { href: '/afiliacion/', texto: 'Afiliación' },
  { href: '/nosotros/', texto: 'Nosotros' },
];
