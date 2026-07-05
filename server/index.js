import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { buildDigest, enrichDigestWithOpenAI, parseFeedback } from './digestEngine.js'

const app = express()
const port = Number(process.env.PORT || 8788)
const isProduction = process.env.NODE_ENV === 'production'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distPath = path.resolve(__dirname, '../dist')
const allowedExportTargets = new Set(['GitHub', 'Jira'])
const maxFeedbackChars = numberFromEnv('MAX_FEEDBACK_CHARS', 120_000)
const digestRateLimit = createRateLimiter({
  maxRequests: numberFromEnv('DIGEST_RATE_LIMIT_PER_MINUTE', 20),
  windowMs: 60_000,
})

app.disable('x-powered-by')

app.use((request, response, next) => {
  setSecurityHeaders(response)

  if (!isProduction) {
    response.setHeader('access-control-allow-origin', process.env.DEV_ORIGIN || 'http://127.0.0.1:5173')
    response.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS')
    response.setHeader('access-control-allow-headers', 'content-type')
  }

  if (request.method === 'OPTIONS') {
    response.status(204).end()
    return
  }

  next()
})

app.use(express.json({ limit: '512kb' }))

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, service: 'flightdigest' })
})

app.get('/api/checkout-link', (_request, response) => {
  response.json({ url: validHttpsUrl(process.env.STRIPE_PAYMENT_LINK) })
})

app.post('/api/digest', digestRateLimit, async (request, response) => {
  try {
    const body = request.body && typeof request.body === 'object' ? request.body : {}
    const feedback = readString(body.feedback, 'Feedback', {
      maxLength: maxFeedbackChars,
      minLength: 20,
      preserveWhitespace: true,
    })
    const project = readString(body.project, 'Project', { defaultValue: 'WeatherKit', maxLength: 80 })
    const release = readString(body.release, 'Release', { defaultValue: 'iOS beta', maxLength: 80 })
    const exportTarget = readString(body.exportTarget, 'Export target', { defaultValue: 'GitHub', maxLength: 16 })

    if (!allowedExportTargets.has(exportTarget)) {
      throw clientError('Choose GitHub or Jira as the export target.')
    }

    const entries = parseFeedback(feedback)
    const report = buildDigest({ exportTarget, feedback, project, release })
    const enrichedReport = await enrichDigestWithOpenAI(report, entries)

    response.json(enrichedReport)
  } catch (error) {
    const status = error?.statusCode && Number.isInteger(error.statusCode) ? error.statusCode : 400
    const message = error instanceof Error ? error.message : 'Digest failed.'
    response.status(status).json({ error: message })
  }
})

app.use('/assets', express.static(path.join(distPath, 'assets'), { immutable: true, maxAge: '1y' }))
app.use(express.static(distPath, { maxAge: '1h' }))
app.get(/.*/, async (_request, response) => {
  try {
    response.setHeader('cache-control', 'no-store')
    response.type('html').send(await readFile(path.join(distPath, 'index.html'), 'utf8'))
  } catch {
    response.status(404).send('Run npm run build before opening FlightDigest.')
  }
})

app.use((error, _request, response, _next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    response.status(400).json({ error: 'Request body must be valid JSON.' })
    return
  }

  response.status(500).json({ error: 'Unexpected server error.' })
})

app.listen(port, () => {
  console.log(`FlightDigest API listening on http://127.0.0.1:${port}`)
})

function setSecurityHeaders(response) {
  response.setHeader('x-content-type-options', 'nosniff')
  response.setHeader('referrer-policy', 'strict-origin-when-cross-origin')
  response.setHeader('x-frame-options', 'DENY')
  response.setHeader('permissions-policy', 'camera=(), microphone=(), geolocation=(), payment=()')

  if (isProduction) {
    response.setHeader(
      'content-security-policy',
      [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "form-action 'self'",
        "img-src 'self' data:",
        "script-src 'self'",
        "style-src 'self'",
        "connect-src 'self'",
      ].join('; '),
    )
  }
}

function readString(value, label, { defaultValue = '', maxLength, minLength = 0, preserveWhitespace = false } = {}) {
  if (value == null || value === '') {
    if (defaultValue) {
      return defaultValue
    }

    throw clientError(`${label} is required.`)
  }

  if (typeof value !== 'string') {
    throw clientError(`${label} must be text.`)
  }

  const trimmed = preserveWhitespace ? value.trim() : value.replace(/\s+/g, ' ').trim()

  if (!trimmed) {
    if (defaultValue) {
      return defaultValue
    }

    throw clientError(`${label} is required.`)
  }

  if (trimmed.length < minLength) {
    throw clientError(`${label} is too short.`)
  }

  if (maxLength && trimmed.length > maxLength) {
    throw clientError(`${label} is too long. Keep it under ${maxLength.toLocaleString()} characters.`)
  }

  return trimmed
}

function validHttpsUrl(value) {
  if (!value) {
    return null
  }

  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

function numberFromEnv(name, fallback) {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function createRateLimiter({ maxRequests, windowMs }) {
  const buckets = new Map()

  return (request, response, next) => {
    const key = request.ip || request.socket.remoteAddress || 'unknown'
    const now = Date.now()
    const current = buckets.get(key)

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs })
      next()
      return
    }

    current.count += 1

    if (current.count > maxRequests) {
      response.setHeader('retry-after', Math.ceil((current.resetAt - now) / 1000))
      response.status(429).json({ error: 'Too many digest requests. Try again in a minute.' })
      return
    }

    if (buckets.size > 2_000) {
      for (const [bucketKey, bucket] of buckets) {
        if (bucket.resetAt <= now) {
          buckets.delete(bucketKey)
        }
      }
    }

    next()
  }
}

function clientError(message) {
  const error = new Error(message)
  error.statusCode = 400
  return error
}
