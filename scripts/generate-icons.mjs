// Regenerates app/favicon.ico and app/apple-icon.png from app/icon.svg.
// Run with `npm run icons` after changing the logo.
import { readFileSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"

const sharp = createRequire(import.meta.url)("sharp")
const svg = readFileSync(new URL("../app/icon.svg", import.meta.url), "utf8")

const render = (source, size) =>
  sharp(Buffer.from(source), { density: (72 * size * 4) / 32 }).resize(size, size).png().toBuffer()

/** Packs PNG images into a .ico container (PNG-in-ICO, supported everywhere since Vista). */
function toIco(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  let offset = 6 + images.length * 16
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size >= 256 ? 0 : size, 0)
    entry.writeUInt8(size >= 256 ? 0 : size, 1)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(data.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += data.length
    return entry
  })
  return Buffer.concat([header, ...entries, ...images.map(({ data }) => data)])
}

const icoSizes = [16, 32, 48]
const icoImages = await Promise.all(icoSizes.map(async (size) => ({ size, data: await render(svg, size) })))
writeFileSync(new URL("../app/favicon.ico", import.meta.url), toIco(icoImages))

// iOS masks its own rounded corners, so the touch icon is full-bleed with extra padding.
const appleSvg = svg
  .replace(/<rect([^>]*)rx="8"([^>]*)\/>/, '<rect$1rx="0"$2/><g transform="translate(16 16) scale(0.86) translate(-16 -16)">')
  .replace("</svg>", "</g></svg>")
writeFileSync(new URL("../app/apple-icon.png", import.meta.url), await render(appleSvg, 180))

console.log("Wrote app/favicon.ico (16/32/48) and app/apple-icon.png (180)")
