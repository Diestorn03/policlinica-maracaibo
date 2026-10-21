// ?error=… de los paneles de telemedicina. Cualquiera puede armar un enlace con un texto inventado,
// así que solo se pintan los mensajes que mandan src/lib/tele.ts y los endpoints; el resto sale como un aviso genérico.
// Lo usan el servidor (páginas) y el navegador (tele.js, para la demo estática), por eso vive aparte.
const CONOCIDOS: (string | RegExp)[] = [
  'Tu usuario no está habilitado para telemedicina.',
  /^Tu afiliación venció el \d{2}\/\d{2}\/\d{4}\. Escríbenos para renovarla\.$/,
  'Consulta no válida.',
  'Acción no válida.',
  'Escribe el diagnóstico antes de finalizar la consulta.',
  'No está atendiendo esta consulta o ya fue finalizada.',
  'El médico ya está atendiendo otra consulta.',
  'Ese paciente ya fue tomado por otro médico o salió de la sala.',
];

/** El texto a mostrar para un ?error=… ('' si no hay ninguno). */
export function errorConocido(v: string | null | undefined): string {
  v = (v ?? '').trim();
  if (!v) return '';
  return CONOCIDOS.some((k) => (typeof k === 'string' ? k === v : k.test(v))) ? v : 'No se pudo completar la acción. Inténtalo de nuevo.';
}

/** ¿El aviso es por la afiliación? Solo entonces tiene sentido ofrecer «Renovar». */
export const esDeAfiliacion = (v: string) => v.includes('afiliación');
