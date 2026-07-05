const keywordThemes = [
  {
    id: 'crashes',
    title: 'App crashes on launch',
    area: 'Stability',
    keywords: ['crash', 'crashes', 'crashed', 'splash', "won't open", 'wont open', 'closes', 'quit', 'launch'],
    summary: 'Testers report launch failures, crashes, or forced exits in the current beta.',
    severity: 'High',
  },
  {
    id: 'alerts',
    title: 'Alerts not showing',
    area: 'Notifications',
    keywords: ['alert', 'alerts', 'notification', 'notifications', 'warning', 'lock screen'],
    summary: 'Expected alerts or notifications are missing, delayed, or not visible on the lock screen.',
    severity: 'High',
  },
  {
    id: 'battery',
    title: 'High battery usage',
    area: 'Performance',
    keywords: ['battery', 'drain', 'drains', 'background', 'overnight', 'power'],
    summary: 'Battery drain appears tied to background activity or location refresh.',
    severity: 'High',
  },
  {
    id: 'location',
    title: 'Location accuracy issues',
    area: 'Location',
    keywords: ['location', 'gps', 'city', 'accuracy', 'permission', 'tracking', 'driving'],
    summary: 'Location can be stale, inaccurate, or slow to recover after movement.',
    severity: 'High',
  },
  {
    id: 'widgets',
    title: 'Widgets not updating',
    area: 'Widgets',
    keywords: ['widget', 'widgets', 'home screen', 'lock screen', 'stuck'],
    summary: 'Widgets show stale data until the app is opened or refreshed.',
    severity: 'Medium',
  },
  {
    id: 'ui-text',
    title: 'UI text or layout issues',
    area: 'Interface',
    keywords: ['text', 'cut off', 'trunc', 'layout', 'contrast', 'dark mode', 'small', 'overlap', 'accessibility'],
    summary: 'Visual layout, text sizing, or contrast needs cleanup before release.',
    severity: 'Medium',
  },
  {
    id: 'performance',
    title: 'Slow loading or lag',
    area: 'Performance',
    keywords: ['slow', 'lag', 'spinner', 'loading', 'cellular', 'takes', 'hang'],
    summary: 'Some flows feel slow or leave testers waiting on loading states.',
    severity: 'Medium',
  },
  {
    id: 'requests',
    title: 'Feature requests',
    area: 'Product',
    keywords: ['would love', 'please add', 'feature', 'request', 'option', 'could you', 'share'],
    summary: 'Testers are asking for additions or workflow refinements.',
    severity: 'Low',
  },
  {
    id: 'positive',
    title: 'Positive feedback',
    area: 'Sentiment',
    keywords: ['love', 'great', 'cleaner', 'easier', 'awesome', 'nice', 'better'],
    summary: 'Feedback includes validation that the beta is improving the core experience.',
    severity: 'Low',
  },
]

export function buildDigest({ exportTarget = 'GitHub', feedback, project = 'WeatherKit', release = 'iOS 18.6 beta 4' }) {
  const entries = parseFeedback(feedback)

  if (entries.length < 3) {
    throw new Error('Paste at least three TestFlight feedback items.')
  }

  const uniqueEntries = uniqueNormalized(entries)
  const themes = buildThemes(uniqueEntries)
  const releaseBlockers = themes
    .filter((theme) => theme.severity === 'High' || theme.count >= 3)
    .slice(0, 5)
    .map((theme) => ({
      id: theme.id,
      title: theme.title,
      count: theme.count,
      version: release,
      priority: theme.severity,
      summary: theme.summary,
    }))

  const selectedTheme = themes[0]

  return {
    project,
    release,
    generatedAt: new Date().toISOString(),
    aiPowered: false,
    totalFeedback: entries.length,
    uniqueItems: uniqueEntries.length,
    themesCount: themes.length,
    releaseBlockersCount: releaseBlockers.length,
    suggestionsCount: themes.filter((theme) => theme.severity !== 'High').length,
    questionsCount: estimateQuestions(uniqueEntries),
    executiveSummary: summarize(project, release, themes, releaseBlockers),
    themes,
    releaseBlockers,
    issueExport: selectedTheme ? buildIssueExport(selectedTheme, release, exportTarget) : '',
  }
}

export async function enrichDigestWithOpenAI(report, entries) {
  if (process.env.OPENAI_ENRICHMENT_ENABLED !== 'true' || !process.env.OPENAI_API_KEY) {
    return report
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: 'system',
            content:
              'You summarize TestFlight beta feedback for senior iOS teams. Return valid JSON only with keys executiveSummary and releaseNotes. Keep executiveSummary under 220 characters.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              project: report.project,
              release: report.release,
              metrics: {
                totalFeedback: report.totalFeedback,
                uniqueItems: report.uniqueItems,
              },
              themes: report.themes.map((theme) => ({
                title: theme.title,
                count: theme.count,
                severity: theme.severity,
                summary: theme.summary,
                examples: theme.examples,
              })),
              feedback: entries.slice(0, 30),
            }),
          },
        ],
      }),
    })

    if (!response.ok) {
      return report
    }

    const data = await response.json()
    const json = parseJsonObject(collectResponseText(data))

    if (!json || typeof json.executiveSummary !== 'string') {
      return report
    }

    return {
      ...report,
      aiPowered: true,
      executiveSummary: json.executiveSummary.slice(0, 260),
    }
  } catch {
    return report
  } finally {
    clearTimeout(timeout)
  }
}

export function parseFeedback(value) {
  if (typeof value !== 'string') {
    return []
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return []
  }

  const parsedJson = parseMaybeJson(trimmed)

  if (parsedJson) {
    return parsedJson
  }

  return trimmed
    .split(/\n+/)
    .map((line) => line.replace(/^[\s*-]+/, '').trim())
    .filter((line) => line.length > 8)
}

function parseMaybeJson(value) {
  try {
    const json = JSON.parse(value)
    const items = Array.isArray(json) ? json : Array.isArray(json.feedback) ? json.feedback : null

    if (!items) {
      return null
    }

    return items
      .map((item) => {
        if (typeof item === 'string') {
          return item
        }

        return item.body ?? item.text ?? item.feedback ?? item.comment ?? ''
      })
      .map((item) => String(item).trim())
      .filter((item) => item.length > 8)
  } catch {
    return null
  }
}

function uniqueNormalized(entries) {
  const seen = new Set()
  const unique = []

  for (const entry of entries) {
    const normalized = entry.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

    if (!seen.has(normalized)) {
      seen.add(normalized)
      unique.push(entry)
    }
  }

  return unique
}

function buildThemes(entries) {
  const fallbackThemes = []

  const themes = keywordThemes
    .map((definition) => {
      const matches = entries.filter((entry) => {
        const lower = entry.toLowerCase()
        return definition.keywords.some((keyword) => lower.includes(keyword))
      })

      if (!matches.length) {
        return null
      }

      return {
        id: definition.id,
        title: specializeTitle(definition, matches),
        area: definition.area,
        summary: specializeSummary(definition, matches),
        count: matches.length,
        trend: trendFor(matches.length),
        sentiment: sentimentFor(definition.id, definition.severity),
        severity: definition.severity,
        examples: matches.slice(0, 3),
      }
    })
    .filter(Boolean)
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || b.count - a.count)

  if (themes.length) {
    return themes
  }

  fallbackThemes.push({
    id: 'general-feedback',
    title: 'General beta feedback',
    area: 'Feedback',
    summary: 'Feedback did not match a known release-risk category yet, but is ready for human triage.',
    count: entries.length,
    trend: 'flat',
    sentiment: 'Mixed',
    severity: 'Medium',
    examples: entries.slice(0, 3),
  })

  return fallbackThemes
}

function specializeTitle(definition, matches) {
  const joined = matches.join(' ').toLowerCase()

  if (definition.id === 'alerts') {
    if (joined.includes('weather')) {
      return 'Weather alerts not showing'
    }

    return 'Notifications not showing'
  }

  if (definition.id === 'requests' && joined.includes('sunrise')) {
    return 'Feature request: Sunrise notifications'
  }

  return definition.title
}

function specializeSummary(definition, matches) {
  if (definition.id === 'crashes') {
    return 'Crash feedback clusters around launch and splash screen failures after installing this beta.'
  }

  if (definition.id === 'requests') {
    return 'Requests are useful follow-ups, but should not block the current release unless they reveal missing settings.'
  }

  const bestExample = matches[0]?.replace(/^[^:]{1,24}:\s*/, '')

  return bestExample ? `${definition.summary} Example: "${bestExample.slice(0, 120)}"` : definition.summary
}

function sentimentFor(id, severity) {
  if (id === 'positive') {
    return 'Positive'
  }

  if (severity === 'Low') {
    return 'Mixed'
  }

  return 'Negative'
}

function trendFor(count) {
  if (count >= 3) {
    return 'up'
  }

  if (count === 2) {
    return 'flat'
  }

  return 'down'
}

function severityRank(severity) {
  return { High: 0, Medium: 1, Low: 2 }[severity] ?? 3
}

function estimateQuestions(entries) {
  return entries.filter((entry) => entry.includes('?')).length
}

function summarize(project, release, themes, blockers) {
  const topTheme = themes[0]?.title.toLowerCase() ?? 'feedback quality'
  const blockerCopy = blockers.length ? `${blockers.length} blocker${blockers.length === 1 ? '' : 's'}` : 'no hard blockers'

  return `${project} ${release} has ${blockerCopy}. Prioritize ${topTheme}, then review the remaining themes for release-note and follow-up issue candidates.`
}

function buildIssueExport(theme, release, exportTarget) {
  return `### ${theme.title}
**Type:** Bug   **Priority:** ${theme.severity}
**Target:** ${exportTarget}   **Release:** ${release}
**Reports:** ${theme.count}

**Summary:**
${theme.summary}

**Top feedback:**
${theme.examples.map((example) => `- "${example}"`).join('\n')}

**Area:** ${theme.area}
**Suggested owner:** iOS release team`
}

function collectResponseText(data) {
  if (typeof data.output_text === 'string') {
    return data.output_text
  }

  return (data.output ?? [])
    .flatMap((item) => item.content ?? [])
    .map((content) => content.text ?? '')
    .join('\n')
}

function parseJsonObject(text) {
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : null
  }
}
