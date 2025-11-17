import fs from 'fs'
import path from 'path'
import AdmZip from 'adm-zip'
import plist from 'plist'

const IPAS_DIR = path.join(process.cwd(), 'ipas')

function parseIpaMetadata(ipaFilename) {
  const ipaPath = path.join(IPAS_DIR, ipaFilename)
  if (!fs.existsSync(ipaPath)) return null
  try {
    const zip = new AdmZip(ipaPath)
    const entries = zip.getEntries()
    const infoEntry = entries.find(e => /Payload\/[^\/]+\.app\/Info.plist$/.test(e.entryName))
    if (!infoEntry) return null
    const data = infoEntry.getData()
    const info = plist.parse(data.toString('utf8'))
    return {
      bundleIdentifier: info.CFBundleIdentifier || '',
      bundleVersion: info.CFBundleShortVersionString || info.CFBundleVersion || '',
      title: info.CFBundleDisplayName || info.CFBundleName || ipaFilename,
      name: info.CFBundleName || ''
    }
  } catch (e) {
    return null
  }
}

export default defineEventHandler(async (event) => {
  const ipa = event.context.params?.ipa
  if (!ipa) return sendError(event, createError({ statusCode: 400, statusMessage: 'Missing ipa parameter' }))
  // try cached metadata first
  try {
    const metaJsonPath = path.join(process.cwd(), 'metadata.json')
    if (fs.existsSync(metaJsonPath)) {
      const all = JSON.parse(fs.readFileSync(metaJsonPath, 'utf8'))
      if (all[ipa]) return all[ipa]
    }
  } catch (e) {
    // ignore and fallback
  }

  const meta = parseIpaMetadata(ipa)
  if (!meta) return sendError(event, createError({ statusCode: 404, statusMessage: 'IPA not found or metadata parse failed' }))
  return meta
})
