// Minimal zero-dependency static server for the built app (dist/).
// Usage: npm run build && npm run serve   ->   http://localhost:4173
import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, 'dist')
const PORT = process.env.PORT || 4173

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

const server = http.createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url.split('?')[0])
    if (urlPath === '/') urlPath = '/index.html'
    // prevent path traversal
    const safe = normalize(urlPath).replace(/^(\.\.[/\\])+/, '')
    let filePath = join(ROOT, safe)

    let info
    try {
      info = await stat(filePath)
    } catch {
      info = null
    }

    // SPA fallback: unknown route with no file extension -> index.html
    if (!info || !info.isFile()) {
      if (!extname(safe)) {
        filePath = join(ROOT, 'index.html')
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        return res.end('404 Not Found')
      }
    }

    const data = await readFile(filePath)
    const type = MIME[extname(filePath)] || 'application/octet-stream'
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' })
    res.end(data)
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain' })
    res.end('500 Server Error')
  }
})

server.listen(PORT, () => {
  console.log(`The Money Lens running at http://localhost:${PORT}`)
})
