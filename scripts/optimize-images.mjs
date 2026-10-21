// Generates responsive WebP/AVIF versions of the hero photo + a low-res alpha mask.
// Run: npm run optimize:images  (re-run whenever you replace assets/My foto.png)
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const SRC = 'assets/My foto.png'
const OUT = 'public/media'
await mkdir(OUT, { recursive: true })

for (const w of [800, 1400, 2000]) {
  const img = sharp(SRC).resize({ width: w })
  await img.clone().webp({ quality: 82, alphaQuality: 90 }).toFile(`${OUT}/lorenzo-${w}.webp`)
  await img.clone().avif({ quality: 60 }).toFile(`${OUT}/lorenzo-${w}.avif`)
}
// Mask: solid black silhouette with the photo's alpha, used as CSS mask-image for the outlined hero text.
const alpha = await sharp(SRC).resize({ width: 1000 }).ensureAlpha().extractChannel('alpha').toBuffer()
const { width, height } = await sharp(alpha).metadata()
await sharp({ create: { width, height, channels: 3, background: '#000' } })
  .joinChannel(alpha).png({ compressionLevel: 9, palette: true }).toFile(`${OUT}/lorenzo-mask.png`)
console.log('done')
