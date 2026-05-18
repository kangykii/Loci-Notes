import { promises as fs } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import potrace from 'potrace'

const SRC = 'src/assets/marginalia'
const ARCHIVE = path.join(SRC, 'source')

const inputs = [
  {
    // man1.png is 1656 x 1995
    in: 'man1.png',
    out: 'walkman-boy.svg',
    constName: 'INK_WALKMAN_BOY',
    threshold: 200,
    parts: [
      { name: 'player', box: { left: 50, top: 1655, width: 480, height: 290 } },
    ],
  },
  {
    // woman1.png is 927 x 2127
    in: 'woman1.png',
    out: 'walking-woman.svg',
    constName: 'INK_WALKING_WOMAN',
    threshold: 200,
    parts: [
      { name: 'tote', box: { left: 50, top: 1080, width: 240, height: 800 } },
    ],
  },
  {
    // woman2.png is 1420 x 2308
    in: 'woman2.png',
    out: 'reading-woman.svg',
    constName: 'INK_READING_WOMAN',
    threshold: 200,
    parts: [
      { name: 'cup', box: { left: 0, top: 810, width: 290, height: 400 } },
    ],
  },
]

const TRACE_OPTIONS = {
  color: '#1a1916',
  background: 'transparent',
  turdSize: 4,
  optTolerance: 0.4,
}

function traceBuffer(buf, threshold) {
  return new Promise((resolve, reject) => {
    potrace.trace(buf, { ...TRACE_OPTIONS, threshold }, (err, out) => (err ? reject(err) : resolve(out)))
  })
}

function whiteRectSvg(width, height) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#ffffff"/></svg>`,
  )
}

function clampBox(box, width, height) {
  const left = Math.max(0, Math.min(box.left, width - 1))
  const top = Math.max(0, Math.min(box.top, height - 1))
  const w = Math.max(1, Math.min(box.width, width - left))
  const h = Math.max(1, Math.min(box.height, height - top))
  return { left, top, width: w, height: h }
}

async function resolveInputPath(name) {
  const live = path.join(SRC, name)
  try {
    await fs.access(live)
    return live
  } catch {
    const archived = path.join(ARCHIVE, name)
    try {
      await fs.access(archived)
      return archived
    } catch {
      return null
    }
  }
}

async function ensureArchive() {
  await fs.mkdir(ARCHIVE, { recursive: true })
}

await ensureArchive()

const generatedEntries = []

for (const item of inputs) {
  const inputPath = await resolveInputPath(item.in)
  if (!inputPath) {
    console.warn(`Skipping ${item.in} — not found in ${SRC} or source/`)
    continue
  }
  console.log(`Processing ${item.in} → ${item.out}…`)

  const metadata = await sharp(inputPath).metadata()
  const width = metadata.width
  const height = metadata.height
  if (!width || !height) {
    console.warn(`  Could not read dimensions for ${item.in}; skipping`)
    continue
  }

  const partsResolved = (item.parts ?? []).map((part) => {
    const box = clampBox(part.box, width, height)
    return { ...part, box }
  })

  // 1. Holed base trace — composite a white rect for every part box first (separate pipeline
  // because sharp's composite() runs at the END of a chain, after any resize, which would shift
  // the rectangles into the wrong place).
  const compositions = partsResolved.map((part) => ({
    input: whiteRectSvg(part.box.width, part.box.height),
    top: part.box.top,
    left: part.box.left,
  }))
  const compositedBuffer =
    compositions.length > 0
      ? await sharp(inputPath).composite(compositions).png().toBuffer()
      : await fs.readFile(inputPath)
  const baseBuffer = await sharp(compositedBuffer)
    .greyscale()
    .normalise()
    .resize({ width: 1200, withoutEnlargement: true })
    .toBuffer()
  const baseSvg = await traceBuffer(baseBuffer, item.threshold)
  const baseOut = path.join(SRC, item.out)
  await fs.writeFile(baseOut, baseSvg)
  const baseStats = await fs.stat(baseOut)
  console.log(`  wrote ${item.out} (${(baseStats.size / 1024).toFixed(1)} KB)`)

  // 2. Per-part traces — crop to the box, resize for consistent line weight, trace.
  const partOutputs = []
  for (const part of partsResolved) {
    const partBuffer = await sharp(inputPath)
      .extract(part.box)
      .greyscale()
      .normalise()
      .resize({ width: 600, withoutEnlargement: true })
      .toBuffer()
    const partSvg = await traceBuffer(partBuffer, item.threshold)
    const baseStem = path.basename(item.out, '.svg')
    const partFile = `${baseStem}.${part.name}.svg`
    const partOut = path.join(SRC, partFile)
    await fs.writeFile(partOut, partSvg)
    const stats = await fs.stat(partOut)
    console.log(`    part ${part.name} → ${partFile} (${(stats.size / 1024).toFixed(1)} KB)`)
    partOutputs.push({
      file: partFile,
      className: `ink-part--${part.name}`,
      topPct: +((part.box.top / height) * 100).toFixed(3),
      leftPct: +((part.box.left / width) * 100).toFixed(3),
      widthPct: +((part.box.width / width) * 100).toFixed(3),
      heightPct: +((part.box.height / height) * 100).toFixed(3),
    })
  }

  // 3. Archive the source PNG once we've processed it (only if it lives outside source/).
  if (inputPath !== path.join(ARCHIVE, item.in)) {
    const archived = path.join(ARCHIVE, item.in)
    await fs.rename(inputPath, archived)
    console.log(`  archived ${item.in} → source/${item.in}`)
  }

  generatedEntries.push({
    constName: item.constName,
    baseFile: item.out,
    parts: partOutputs,
  })
}

// 4. Generate parts.generated.ts
const imports = []
const declarations = []
let importCounter = 0
function importAlias(file) {
  importCounter += 1
  return `inkAsset${importCounter}`
}

for (const entry of generatedEntries) {
  const baseAlias = importAlias(entry.baseFile)
  imports.push(`import ${baseAlias} from './${entry.baseFile}'`)
  const partLiterals = entry.parts.map((part) => {
    const alias = importAlias(part.file)
    imports.push(`import ${alias} from './${part.file}'`)
    return `    { src: ${alias}, class: '${part.className}', topPct: ${part.topPct}, leftPct: ${part.leftPct}, widthPct: ${part.widthPct}, heightPct: ${part.heightPct} }`
  })
  declarations.push(
    `export const ${entry.constName}: InkCharacter = {\n  base: ${baseAlias},\n  parts: [\n${partLiterals.join(',\n')}\n  ],\n}`,
  )
}

const generated = [
  '// AUTO-GENERATED by scripts/convert-marginalia.mjs — do not edit.',
  '',
  ...imports,
  '',
  'export type InkPart = {',
  '  src: string',
  "  class: string",
  '  topPct: number',
  '  leftPct: number',
  '  widthPct: number',
  '  heightPct: number',
  '}',
  '',
  'export type InkCharacter = {',
  '  base: string',
  '  parts: InkPart[]',
  '}',
  '',
  ...declarations,
  '',
].join('\n')

const generatedPath = path.join(SRC, 'parts.generated.ts')
await fs.writeFile(generatedPath, generated)
console.log(`Wrote ${generatedPath}`)
console.log('Done.')
