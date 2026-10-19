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
  emergencias: { texto: '(0261) 700-5141', href: 'tel:+582617005141' },
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

export interface Servicio {
  slug: string;
  nombre: string;
  resumen: string;
  detalle: string[];
  horario?: string;
  imagen: ImageMetadata;
  /** slug de la especialidad del directorio relacionada (enlace "Ver especialistas") */
  especialidad?: string;
}

// El orden es el del sitio actual. "Especialidades" no es un servicio con foto: tiene su propia página (/especialidades/).
export const servicios: Servicio[] = [
  { slug: 'tomografia', nombre: 'Tomografía', resumen: 'Estudios tomográficos con atención de lunes a viernes.', detalle: ['Algunos estudios requieren cita previa.'], horario: '7:00 a. m. a 5:00 p. m.', imagen: tomografia, especialidad: 'radiologia-e-imagenes' },
  { slug: 'video-endoscopia', nombre: 'Video endoscopia', resumen: 'Estudios endoscópicos de lunes a viernes.', detalle: [], horario: 'Lunes a viernes, 8:00 a. m. a 2:00 p. m.', imagen: videoEndoscopia, especialidad: 'gastroenterologia' },
  { slug: 'laboratorio', nombre: 'Laboratorio', resumen: 'Laboratorio clínico con servicio de emergencia las 24 horas.', detalle: ['Emergencias las 24 horas.'], horario: '7:00 a. m. a 5:00 p. m.', imagen: laboratorio },
  { slug: 'cirugia', nombre: 'Cirugía', resumen: 'Asistencia integral en procedimientos quirúrgicos electivos y de urgencia.', detalle: ['Nuestro objetivo es ofrecer al paciente una asistencia integral que comprenda el diagnóstico y tratamiento de enfermedades que se resuelven por procedimientos quirúrgicos o potencialmente quirúrgicos tanto electivos como de urgencia y que asegure los más altos niveles de calidad.'], imagen: cirugia, especialidad: 'cirugia-general' },
  { slug: 'uci', nombre: 'UCI', resumen: 'Unidad de cuidados intensivos con apoyo diagnóstico las 24 horas.', detalle: ['Infraestructura de alta tecnología.', 'Personal altamente capacitado en medicina crítica.', 'Servicios de banco de sangre, laboratorio y radiología completa en el área física y disponibles las 24 horas.'], imagen: uci, especialidad: 'medicina-critica' },
  { slug: 'cirugia-bariatrica', nombre: 'Unidad de Cirugía Bariátrica', resumen: 'Un equipo coordinado para mejorar tus hábitos y optimizar tu salud.', detalle: ['La Policlínica Maracaibo pone a tu disposición la Unidad de Cirugía Bariátrica, integrada por especialistas en cirugía bariátrica, medicina interna, endocrinología, psiquiatría, gastroenterología, además de psicólogos y nutricionistas, quienes de manera coordinada te brindarán apoyo y acompañamiento para mejorar tus hábitos nutricionales y optimizar tu salud.'], imagen: bariatrica, especialidad: 'cirugia-bariatrica' },
  { slug: 'rayos-x', nombre: 'Rayos X', resumen: 'Estudios radiológicos de lunes a viernes.', detalle: ['Algunos estudios requieren cita previa.'], horario: '7:00 a. m. a 5:00 p. m.', imagen: rayosX, especialidad: 'radiologia-e-imagenes' },
  { slug: 'obstetrica-neonatal', nombre: 'Unidad Obstétrica Neonatal', resumen: 'Atención integral durante el embarazo, el parto y el puerperio.', detalle: ['Su misión es la atención integral a las mujeres en el proceso del embarazo, parto y puerperio fisiológicos, y en los estados patológicos relacionados con el embarazo.'], imagen: obstetrica, especialidad: 'ginecologia-y-obstetricia' },
];

export const testimonios = [
  { texto: 'Tienen a los mejores especialistas de la región, los recomiendo.' },
  { texto: 'Excelente atención, conforme con el servicio prestado.' },
  { texto: 'Orgullosa de pertenecer a esta gran familia.' },
];

/** Fotos de instalaciones (teléfono, 2022): mejor en marcos, recortes o duotono que a pantalla completa */
export const instalaciones: { src: ImageMetadata; alt: string }[] = [
  { src: inst2, alt: 'Instalaciones de la Policlínica Maracaibo' },
  { src: inst3, alt: 'Instalaciones de la Policlínica Maracaibo' },
  { src: inst4, alt: 'Instalaciones de la Policlínica Maracaibo' },
  { src: inst5, alt: 'Instalaciones de la Policlínica Maracaibo' },
  { src: inst6, alt: 'Instalaciones de la Policlínica Maracaibo' },
  { src: inst7, alt: 'Instalaciones de la Policlínica Maracaibo' },
  { src: inst1, alt: 'Instalaciones de la Policlínica Maracaibo' },
];
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
