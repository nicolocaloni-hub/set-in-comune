export const PHOTO_MAX_BYTES = 500 * 1024;
export const PHOTO_INPUT_MAX_BYTES = 15 * 1024 * 1024;
export const PHOTO_MAX_EDGE = 1600;
export const PHOTO_MAX_COUNT = 4;
const types = ['image/jpeg', 'image/png', 'image/webp'];

export function validatePhotoBatch(files) {
  if (files.length > PHOTO_MAX_COUNT) throw new Error('Puoi aggiungere al massimo 4 foto.');
  for (const file of files) {
    if (!types.includes(file.type)) throw new Error('Usa foto JPG, PNG o WebP. Per HEIC, esporta prima in JPG.');
    if (!file.size || file.size > PHOTO_INPUT_MAX_BYTES) throw new Error('Ogni foto originale deve pesare meno di 15 MB.');
  }
}

export function fitPhoto(width, height, edge = PHOTO_MAX_EDGE) {
  if (!width || !height || width * height > 80000000) throw new Error('Foto troppo grande o non leggibile. Esportala in JPG a dimensioni ridotte.');
  const scale = Math.min(1, edge / Math.max(width, height));
  return {width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale))};
}

export function formatBytes(bytes) {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Redrawing also removes EXIF location data. No paid image processing service is used.
export async function preparePhoto(file) {
  validatePhotoBatch([file]);
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    try { await img.decode(); } catch { throw new Error('Questa foto non è leggibile. Prova a esportarla di nuovo in JPG.'); }
    let {width, height} = fitPhoto(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Il browser non riesce a preparare le foto. Prova un browser aggiornato.');
    for (let attempt = 0; attempt < 5; attempt++) {
      canvas.width = width; canvas.height = height;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      for (const quality of [0.84, 0.72, 0.60]) {
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
        if (blob && blob.size <= PHOTO_MAX_BYTES) {
          return new File([blob], 'foto.jpg', {type: 'image/jpeg'});
        }
      }
      width = Math.max(1, Math.round(width * 0.8)); height = Math.max(1, Math.round(height * 0.8));
    }
    throw new Error('Non riesco a ridurre questa foto. Scegline una più piccola.');
  } finally { URL.revokeObjectURL(url); }
}
