// Script de la página «admin-medicos», extraído de src/pages/admin/medicos.astro para compartirlo con el marco de la versión PHP (src/shell/).
import { iniciarEdicion } from '../../components/admin/edicion';

// El marco de PHP carga este script en todas las pantallas del admin: solo actúa en la de médicos (la que tiene la subida de foto)
const panel = document.getElementById('ficha') as HTMLDetailsElement | null;
const entrada = panel?.querySelector<HTMLInputElement>('input[type=file]') ?? null;
if (panel && entrada) {
  iniciarEdicion(panel);


  // Al menos una especialidad: se avisa en el propio formulario, sin viajar al servidor ni perder lo escrito (el servidor valida igual)
  const esps = [...panel.querySelectorAll<HTMLInputElement>('[name^=especialidades]')];
  const revisar = () => esps[0]?.setCustomValidity(esps.some((e) => e.checked) ? '' : 'Elige al menos una especialidad.');
  esps.forEach((e) => e.addEventListener('change', revisar));
  revisar();

  // Foto: se recorta al cuadrado (más arriba que al centro, donde están las caras) y se reduce a 480×480 WebP antes de enviarla.
  const vista = panel.querySelector<HTMLImageElement>('.foto__vista');
  entrada.addEventListener('change', async () => {
    const archivo = entrada.files?.[0];
    if (!archivo) return;
    try {
      const img = await createImageBitmap(archivo);
      const lado = Math.min(img.width, img.height);
      const lienzo = document.createElement('canvas');
      lienzo.width = lienzo.height = 480;
      lienzo.getContext('2d')!.drawImage(img, (img.width - lado) / 2, (img.height - lado) * 0.2, lado, lado, 0, 0, 480, 480);
      const blob = await new Promise<Blob | null>((r) => lienzo.toBlob(r, 'image/webp', 0.85));
      if (blob?.type !== 'image/webp') return;
      const lista = new DataTransfer();
      lista.items.add(new File([blob], 'foto.webp', { type: 'image/webp' }));
      entrada.files = lista.files;
      if (vista) { vista.src = URL.createObjectURL(blob); vista.hidden = false; }
    } catch { /* sin reducir: se envía tal cual */ }
  });
}
