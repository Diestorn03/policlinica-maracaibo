import { clinica } from '../../data/site';

// «8:00 a. m.» no debe partirse entre «a.» y «m.» al saltar de línea.
// Tampoco se separa la cifra de su «a. m.», ni «24 h» ni «7 am».
export const nb = (t: string) => t
  .replace(/(\d) ([ap])\. m\./g, '$1\u00A0$2.\u00A0m.')
  .replace(/([ap])\. m\./g, '$1.\u00A0m.')
  .replace(/(\d) (h|[ap]m)\b/g, '$1\u00A0$2');

// Horario de citas, siempre desde site.ts: «Lunes a viernes, de 8:00 a. m. a 4:00 p. m.» (para listas y botones)…
export const citasLista = nb(clinica.horario.citas.replace(/^Citas de (.)/, (_, c: string) => c.toUpperCase()));
// …y «de lunes a viernes, de 8:00 a. m. a 4:00 p. m.» (para meter en una frase)
export const citasFrase = nb(clinica.horario.citas.replace(/^Citas /, ''));

// Marco de cada foto según su forma: 4/3 las apaisadas, 1/1 las casi cuadradas (UCI, obstétrica) y 4/5 la vertical (video endoscopia)
export const marcoDe = ({ width, height }: { width: number; height: number }) =>
  height > width * 1.2 ? '4/5' : width < height * 1.15 ? '1/1' : '4/3';
