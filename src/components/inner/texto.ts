import { clinica } from '../../data/site';

// «8:00 a. m.» no debe partirse entre «a.» y «m.» al saltar de línea.
export const nb = (t: string) => t.replace(/([ap])\. m\./g, '$1.\u00A0m.');

// Horario de citas, siempre desde site.ts: «Lunes a viernes, de 8:00 a. m. a 4:00 p. m.» (para listas y botones)…
export const citasLista = nb(clinica.horario.citas.replace(/^Citas de (.)/, (_, c: string) => c.toUpperCase()));
// …y «de lunes a viernes, de 8:00 a. m. a 4:00 p. m.» (para meter en una frase)
export const citasFrase = nb(clinica.horario.citas.replace(/^Citas /, ''));
