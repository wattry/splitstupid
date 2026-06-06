/**
 * Crop a region out of an image source into a JPEG Blob.
 *
 * @param {string} src image URL (e.g. an object URL)
 * @param {{ x: number, y: number, width: number, height: number }} pixels
 *        crop rectangle in source-image pixels (from react-easy-crop's
 *        onCropComplete `croppedAreaPixels`)
 * @returns {Promise<Blob|null>}
 */
export async function getCroppedBlob(src, pixels) {
  const image = await loadImage(src)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(pixels.width)
  canvas.height = Math.round(pixels.height)

  const ctx = canvas.getContext('2d')
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
  )

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92)
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
