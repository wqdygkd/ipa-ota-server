import fs from 'fs'
import path from 'path'

const IPAS_DIR = path.join(process.cwd(), 'ipas')

export default defineEventHandler(async (event) => {
  if (!fs.existsSync(IPAS_DIR)) return []
  const files = fs.readdirSync(IPAS_DIR).filter(f => f.toLowerCase().endsWith('.ipa'))
  // try to read cached metadata.json
  let meta = {}
  try {
    const mpath = path.join(process.cwd(), 'metadata.json')
    if (fs.existsSync(mpath)) meta = JSON.parse(fs.readFileSync(mpath, 'utf8'))
  } catch (e) {
    meta = {}
  }
  const results = files.map(f => ({
    file: f,
    title: (meta[f] && meta[f].title) || f,
    bundleIdentifier: (meta[f] && meta[f].bundleIdentifier) || '',
    bundleVersion: (meta[f] && meta[f].bundleVersion) || '',
    name: (meta[f] && meta[f].name) || '',
    icon: (meta[f] && meta[f].icon) || null
  }))
  return results
})
