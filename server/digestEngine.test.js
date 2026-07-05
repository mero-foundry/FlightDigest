import assert from 'node:assert/strict'
import test from 'node:test'
import { buildDigest, parseFeedback } from './digestEngine.js'

test('parseFeedback accepts plain pasted TestFlight lines', () => {
  const entries = parseFeedback(`
    App crashes on launch.
    Weather alerts are not showing.
    Battery drains quickly in the background.
  `)

  assert.equal(entries.length, 3)
  assert.equal(entries[0], 'App crashes on launch.')
})

test('parseFeedback accepts JSON exports', () => {
  const entries = parseFeedback(
    JSON.stringify({
      feedback: [{ body: 'App crashes on launch.' }, { text: 'Weather alerts are missing.' }, 'Battery drains quickly.'],
    }),
  )

  assert.deepEqual(entries, ['App crashes on launch.', 'Weather alerts are missing.', 'Battery drains quickly.'])
})

test('buildDigest clusters blockers and deduplicates repeated feedback', () => {
  const report = buildDigest({
    project: 'WeatherKit',
    release: 'iOS 18.6 beta 4',
    exportTarget: 'GitHub',
    feedback: `
      App crashes immediately on launch.
      App crashes immediately on launch.
      Splash screen closes every time.
      Severe weather alerts are not showing.
      Battery drains overnight in the background.
      Location is stale after driving to a new city.
    `,
  })

  assert.equal(report.totalFeedback, 6)
  assert.equal(report.uniqueItems, 5)
  assert.equal(report.aiPowered, false)
  assert.equal(report.releaseBlockers.length, 4)
  assert.equal(report.themes[0].severity, 'High')
  assert.match(report.issueExport, /Priority:\*\* High/)
})

test('buildDigest rejects inputs with too few items', () => {
  assert.throws(
    () =>
      buildDigest({
        feedback: 'Only one item.',
      }),
    /at least three TestFlight feedback items/,
  )
})
