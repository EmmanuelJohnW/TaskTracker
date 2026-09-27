// Regenerates every raster icon (favicon, Apple touch icon, PWA manifest
// icons and the notification badge) from app/icon.svg.
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

/** Full-bleed variant with the mark scaled into the platform's safe zone. */
const fullBleed = (scale) =>
  svg
    .replace(/<rect([^>]*)rx="8"([^>]*)\/>/, `<rect$1rx="0"$2/><g transform="translate(16 16) scale(${scale}) translate(-16 -16)">`)
    .replace("</svg>", "</g></svg>")

const out = (path) => new URL(`../${path}`, import.meta.url)

// iOS masks its own rounded corners; Android maskable icons need an 80% safe zone.
writeFileSync(out("app/apple-icon.png"), await render(fullBleed(0.86), 180))
writeFileSync(out("public/icon-192.png"), await render(svg, 192))
writeFileSync(out("public/icon-512.png"), await render(svg, 512))
writeFileSync(out("public/icon-maskable-512.png"), await render(fullBleed(0.72), 512))

// Android status-bar badge: the mark alone, white on transparent.
const badge = svg.replace(/<rect[^>]*\/>/, "").replace('stroke-opacity="0.3"', 'stroke-opacity="0.45"')
writeFileSync(out("public/badge-96.png"), await render(badge, 96))

console.log("Wrote favicon.ico, apple-icon.png and public/{icon-192,icon-512,icon-maskable-512,badge-96}.png")
