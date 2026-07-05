export type Sentiment = 'Negative' | 'Mixed' | 'Positive'
export type Severity = 'High' | 'Medium' | 'Low'
export type ExportTarget = 'GitHub' | 'Jira'

export type Theme = {
  id: string
  title: string
  area: string
  summary: string
  count: number
  trend: 'up' | 'flat' | 'down'
  sentiment: Sentiment
  severity: Severity
  examples: string[]
}

export type ReleaseBlocker = {
  id: string
  title: string
  count: number
  version: string
  priority: Severity
  summary: string
}

export type DigestReport = {
  project: string
  release: string
  generatedAt: string
  aiPowered: boolean
  totalFeedback: number
  uniqueItems: number
  themesCount: number
  releaseBlockersCount: number
  suggestionsCount: number
  questionsCount: number
  executiveSummary: string
  themes: Theme[]
  releaseBlockers: ReleaseBlocker[]
  issueExport: string
}
