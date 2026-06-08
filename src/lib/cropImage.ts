import type { Area } from 'react-easy-crop';

/**
 * Crop a region out of an image source into a JPEG Blob.
 *
 * @param src image URL (e.g. an object URL)
 * @param pixels crop rectangle in source-image pixels (from react-easy-crop's
 *        onCropComplete `croppedAreaPixels`)
 */
export async function getCroppedBlob(src: string, pixels: Area): Promise<Blob | null> {
  const image = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(pixels.width);
  canvas.height = Math.round(pixels.height);

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(
    image,
    pixels.x,
    pixels.y,
    pixels.width,
    pixels.height,
    0,
    0,
    pixels.width,
    pixels.height
  );

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
