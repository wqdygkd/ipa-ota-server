#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const AdmZip = require('adm-zip')
const plist = require('plist')
const mime = require('mime-types')
const sharp = require('sharp')

const ROOT = process.cwd()
const IPAS_DIR = path.join(ROOT, 'ipas')
const OUT_META = path.join(ROOT, 'metadata.json')
const ICON_DIR = path.join(ROOT, 'public', 'icons')

if (!fs.existsSync(IPAS_DIR)) {
  console.error('ipas/ directory not found, nothing to cache')
  process.exit(0)
}
if (!fs.existsSync(path.join(ROOT, 'public'))) fs.mkdirSync(path.join(ROOT, 'public'))
if (!fs.existsSync(ICON_DIR)) fs.mkdirSync(ICON_DIR, { recursive: true })

function parseIpa(ipaPath) {
  try {
    const zip = new AdmZip(ipaPath)
    const entries = zip.getEntries()
    const infoEntry = entries.find(e => /Payload\/[^\/]+\.app\/Info.plist$/.test(e.entryName))
    const info = infoEntry ? plist.parse(infoEntry.getData().toString('utf8')) : {}
    return { zip, entries, info }
  } catch (e) {
    return null
  }
}

function findIconEntry(zip, info) {
  const entries = zip.getEntries()
  const pngEntries = entries.filter(e => /Payload\/[^\/]+\.app\/.*\.(png|jpg|jpeg)$/i.test(e.entryName))
  const candidates = []
  try { if (info.CFBundleIcons && info.CFBundleIcons.CFBundlePrimaryIcon && Array.isArray(info.CFBundleIcons.CFBundlePrimaryIcon.CFBundleIconFiles)) candidates.push(...info.CFBundleIcons.CFBundlePrimaryIcon.CFBundleIconFiles) } catch(e){}
  try { if (Array.isArray(info.CFBundleIconFiles)) candidates.push(...info.CFBundleIconFiles) } catch(e){}

  // Try candidates specified in Info.plist, prefer entries whose data is a valid PNG
  for (const name of candidates) {
    if (!name) continue
    const possible = [`${name}@3x.png`, `${name}@2x.png`, `${name}.png`, `${name}.png`]
    for (const p of possible) {
      const e = entries.find(en => en.entryName.endsWith('/' + p) || en.entryName.endsWith('/' + p.replace(/\.png$/,'')))
      if (e) {
        try {
          const data = e.getData()
          if (isPngBuffer(data)) return e
        } catch (err) {
          // ignore and continue
        }
      }
    }
  }

  // fallback: look for files with 'icon' in the name and validate PNG signature
  for (const e of pngEntries) {
    if (/icon/i.test(path.basename(e.entryName))) {
      try {
        const data = e.getData()
        if (isPngBuffer(data)) return e
      } catch (err) {}
    }
  }

  // last resort: pick the largest valid png
  const validPngs = []
  for (const e of pngEntries) {
    try {
      const data = e.getData()
      if (isPngBuffer(data)) validPngs.push({ e, size: (e.header && e.header.size) || 0 })
    } catch (err) {}
  }
  if (validPngs.length) {
    validPngs.sort((a,b) => b.size - a.size)
    return validPngs[0].e
  }

  return null
}

function isPngBuffer(buf) {
  if (!buf || buf.length < 8) return false
  return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 && buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A
}

const files = fs.readdirSync(IPAS_DIR).filter(f => f.toLowerCase().endsWith('.ipa'))

async function main() {
  const out = {}
  for (const f of files) {
    const ipaPath = path.join(IPAS_DIR, f)
    const parsed = parseIpa(ipaPath)
    if (!parsed) {
      console.warn('failed to parse', f)
      out[f] = { title: f, bundleIdentifier:'', bundleVersion:'', icon: '' }
      continue
    }
    const info = parsed.info || {}
    const meta = {
      title: info.CFBundleDisplayName || info.CFBundleName || f,
      bundleIdentifier: info.CFBundleIdentifier || '',
      bundleVersion: info.CFBundleShortVersionString || info.CFBundleVersion || '',
      name: info.CFBundleName || ''
    }

    const iconEntry = findIconEntry(parsed.zip, info)
    if (iconEntry) {
      try {
        const data = iconEntry.getData()
        // prefer to output JPEG
        let outBuf = null
        let ext = '.jpg'
        try {
          if (isPngBuffer(data) || isJpegBuffer(data)) {
            outBuf = await sharp(data).jpeg({ quality: 85 }).toBuffer()
          } else {
            // attempt conversion anyway
            outBuf = await sharp(data).jpeg({ quality: 85 }).toBuffer()
          }
        } catch (convErr) {
          // conversion failed, fall back to raw data write as png
          outBuf = data
          ext = path.extname(iconEntry.entryName) || '.png'
        }

        const target = path.join(ICON_DIR, `${f.replace(/\.ipa$/i,'')}${ext}`)
        fs.writeFileSync(target, outBuf)
        meta.icon = `/icons/${path.basename(target)}`
        console.log('wrote icon for', f)
      } catch (e) {
        console.warn('failed to write icon for', f, e.message)
        meta.icon = ''
      }
    } else {
      meta.icon = ''
    }
    out[f] = meta
  }

  fs.writeFileSync(OUT_META, JSON.stringify(out, null, 2), 'utf8')
  console.log('wrote metadata.json for', Object.keys(out).length, 'ipas')
}

function isJpegBuffer(buf) {
  if (!buf || buf.length < 2) return false
  return buf[0] === 0xFF && buf[1] === 0xD8
}

main().catch(err => {
  console.error('generate-cache failed', err)
  process.exitCode = 1
})
