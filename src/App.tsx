import {
  AlertCircle,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Cloud,
  Code2,
  Copy,
  ExternalLink,
  FileJson,
  FileText,
  Folder,
  Gauge,
  Inbox,
  Layers3,
  Loader2,
  Mail,
  MessageSquare,
  Play,
  RefreshCw,
  Send,
  Settings,
  Smartphone,
  Sparkles,
  Upload,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { sampleFeedback } from './sampleFeedback'
import type { DigestReport, ExportTarget, ReleaseBlocker, Severity, Theme } from './types'
import './App.css'

const seedReport: DigestReport = {
  project: 'WeatherKit',
  release: 'iOS 18.6 beta 4',
  generatedAt: new Date().toISOString(),
  aiPowered: false,
  totalFeedback: 178,
  uniqueItems: 142,
  themesCount: 26,
  releaseBlockersCount: 5,
  suggestionsCount: 12,
  questionsCount: 31,
  executiveSummary:
    'Beta feedback points to launch stability, weather alerts, location accuracy, and widget refresh as the release risks to clear before wider rollout.',
  themes: [
    {
      id: 'weather-alerts',
      title: 'Weather alerts not showing',
      area: 'Notifications',
      summary: 'Severe weather alerts are not appearing in-app or on the lock screen for some testers.',
      count: 28,
      trend: 'up',
      sentiment: 'Negative',
      severity: 'High',
      examples: [
        'Severe weather alerts are not appearing even when the forecast shows a warning.',
        'I never got the rain alert today. Notifications are enabled.',
      ],
    },
    {
      id: 'battery',
      title: 'High battery usage',
      area: 'Performance',
      summary: 'Background activity and location tracking are producing visible battery drain.',
      count: 24,
      trend: 'up',
      sentiment: 'Negative',
      severity: 'High',
      examples: ['Battery drains quickly in background.', 'High battery usage overnight when location tracking is enabled.'],
    },
    {
      id: 'location',
      title: 'Location accuracy issues',
      area: 'Location',
      summary: 'Current location can lag behind travel and sometimes requires relaunching the app.',
      count: 19,
      trend: 'up',
      sentiment: 'Negative',
      severity: 'High',
      examples: ['Location seems off when I open the app after driving.', 'Location accuracy is wrong by a few miles.'],
    },
    {
      id: 'crashes',
      title: 'App crashes on launch',
      area: 'Stability',
      summary: 'A subset of testers cannot open the app after upgrading to the current beta.',
      count: 13,
      trend: 'up',
      sentiment: 'Negative',
      severity: 'High',
      examples: ['App crashes immediately after opening.', "Won't open at all, just flashes and closes."],
    },
    {
      id: 'widgets',
      title: 'Widgets not updating',
      area: 'Widgets',
      summary: 'Home and lock screen widgets are stale until testers open the main app.',
      count: 11,
      trend: 'flat',
      sentiment: 'Mixed',
      severity: 'Medium',
      examples: ['Widgets do not update until I open the app.', "Lock screen widget is stuck on yesterday's forecast."],
    },
    {
      id: 'ui-text',
      title: 'UI text truncation',
      area: 'Interface',
      summary: 'Forecast text and chart labels clip on smaller screens or in dark mode.',
      count: 9,
      trend: 'flat',
      sentiment: 'Mixed',
      severity: 'Medium',
      examples: ['Text gets cut off in the 7-day forecast.', 'Dark mode has low contrast in the hourly chart.'],
    },
  ],
  releaseBlockers: [
    {
      id: 'crashes',
      title: 'App crashes on launch',
      count: 13,
      version: 'iOS 18.6 beta 4',
      priority: 'High',
      summary: 'Crash reports mention launch and splash screen failures after updating from beta 3.',
    },
    {
      id: 'weather-alerts',
      title: 'Weather alerts not showing',
      count: 9,
      version: 'iOS 18.6 beta 4',
      priority: 'High',
      summary: 'Notification delivery is unreliable for severe weather and rain alerts.',
    },
    {
      id: 'location',
      title: 'Location accuracy issues',
      count: 7,
      version: 'iOS 18.6 beta 4',
      priority: 'High',
      summary: 'Location stale after travel and recovers only after force quit for some users.',
    },
    {
      id: 'widgets',
      title: 'Widgets not updating',
      count: 6,
      version: 'iOS 18.6 beta 4',
      priority: 'Medium',
      summary: 'Widgets refresh only after foregrounding the app.',
    },
    {
      id: 'battery',
      title: 'High battery usage',
      count: 5,
      version: 'iOS 18.6 beta 4',
      priority: 'High',
      summary: 'Background location and forecast refresh appear to be draining battery.',
    },
  ],
  issueExport: '',
}

function App() {
  const [project, setProject] = useState(seedReport.project)
  const [release, setRelease] = useState(seedReport.release)
  const [feedback, setFeedback] = useState(sampleFeedback)
  const [report, setReport] = useState<DigestReport>(() => ({
    ...seedReport,
    issueExport: buildIssueExport(seedReport.themes[0], seedReport.release, 'GitHub'),
  }))
  const [selectedThemeId, setSelectedThemeId] = useState(seedReport.themes[0]?.id ?? '')
  const [exportTarget, setExportTarget] = useState<ExportTarget>('GitHub')
  const [isGenerating, setIsGenerating] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const selectedTheme = useMemo(
    () => report.themes.find((theme) => theme.id === selectedThemeId) ?? report.themes[0],
    [report.themes, selectedThemeId],
  )
  const issueExport = selectedTheme ? buildIssueExport(selectedTheme, report.release, exportTarget) : report.issueExport
  const generatedTime = useMemo(() => formatGeneratedTime(report.generatedAt), [report.generatedAt])
  const characterCount = new Intl.NumberFormat().format(feedback.length)

  async function generateDigest(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    setError('')
    setNotice('')
    setIsGenerating(true)

    try {
      const response = await fetch('/api/digest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ feedback, project, release, exportTarget }),
      })
      const data = (await response.json()) as DigestReport | { error?: string }

      if (!response.ok) {
        throw new Error('error' in data && data.error ? data.error : 'Digest failed.')
      }

      const nextReport = data as DigestReport
      setReport(nextReport)
      setSelectedThemeId(nextReport.themes[0]?.id ?? '')
      setNotice(
        nextReport.aiPowered
          ? 'AI-enhanced digest generated.'
          : 'Heuristic digest generated. Enable OpenAI enrichment explicitly when you want model-assisted summaries.',
      )
    } catch (digestError) {
      setError(digestError instanceof Error ? digestError.message : 'Digest failed.')
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleFeedbackFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const text = await file.text()
    setFeedback(text)
    setNotice(`Imported ${file.name}.`)
  }

  async function copyIssueExport() {
    try {
      await navigator.clipboard.writeText(issueExport)
      setNotice(`${exportTarget} issue markdown copied.`)
    } catch {
      setNotice(`${exportTarget} issue markdown is ready to copy.`)
    }
  }

  async function handleCheckout() {
    const response = await fetch('/api/checkout-link')
    const data = (await response.json()) as { url: string | null }

    if (data.url) {
      window.location.assign(data.url)
      return
    }

    setNotice('Checkout is ready for Stripe. Add STRIPE_PAYMENT_LINK when you want live billing.')
  }

  function sendWeeklyDigest() {
    setNotice('Weekly digest queued for qa@indie.dev and dev@indie.dev.')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="FlightDigest navigation">
        <a className="brand" href="#top" aria-label="FlightDigest home">
          <span className="brand-mark" aria-hidden="true">
            <Send size={19} />
          </span>
          <span>
            <strong>FlightDigest</strong>
            <small>TestFlight Feedback Digest</small>
          </span>
        </a>

        <nav className="side-nav" aria-label="Primary">
          <NavItem icon={Inbox} label="FlightDigest" active />
          <NavItem icon={FileText} label="Digests" />
          <NavItem icon={MessageSquare} label="Feedback" />
          <NavItem icon={Layers3} label="Themes" />
          <NavItem icon={AlertCircle} label="Issues" />
          <NavItem icon={BookOpen} label="Reports" />
          <NavItem icon={Settings} label="Settings" />
        </nav>

        <section className="project-list" aria-labelledby="projects-title">
          <div className="section-heading">
            <h2 id="projects-title">Projects</h2>
            <button className="icon-button" type="button" aria-label="Add project">
              +
            </button>
          </div>
          <ProjectButton name="WeatherKit" release="iOS 18.6 beta 4" active icon={<Cloud size={19} />} />
          <ProjectButton name="Sunset Tracker" release="iOS 18.6 beta 4" icon={<Sparkles size={19} />} />
          <ProjectButton name="RunPulse" release="iOS 18.5" icon={<Gauge size={19} />} />
          <button className="view-projects" type="button">
            <Folder size={18} />
            View all projects
          </button>
        </section>

        <button className="account-row" type="button" aria-label="Account menu">
          <span>AK</span>
          <span>
            <strong>Alex Kumar</strong>
            <small>alex@indie.dev</small>
          </span>
          <ChevronDown size={17} />
        </button>
      </aside>

      <main className="workspace" id="top">
        <header className="topbar">
          <div className="project-select">
            <select value={project} onChange={(event) => setProject(event.target.value)} aria-label="Project">
              <option>WeatherKit</option>
              <option>Sunset Tracker</option>
              <option>RunPulse</option>
            </select>
            <select value={release} onChange={(event) => setRelease(event.target.value)} aria-label="Release">
              <option>iOS 18.6 beta 4</option>
              <option>iOS 18.6 beta 3</option>
              <option>iOS 18.5</option>
            </select>
          </div>

          <nav aria-label="Workspace actions">
            <button type="button">
              <CalendarDays size={18} />
              Jun 2 - Jun 8, 2025
            </button>
            <button className="icon-button" type="button" aria-label="Refresh">
              <RefreshCw size={18} />
            </button>
            <button className="icon-button" type="button" aria-label="Docs">
              <BookOpen size={18} />
            </button>
            <button className="icon-button notify" type="button" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <button className="avatar" type="button" aria-label="Account">
              AK
            </button>
          </nav>
        </header>

        <div className="content-grid">
          <section className="primary-column" aria-label="Digest workspace">
            <div className="top-grid">
              <section className="panel import-panel" aria-labelledby="import-heading">
                <div className="panel-title">
                  <h1 id="import-heading">Import feedback</h1>
                  <button type="button">
                    View import history
                    <ExternalLink size={15} />
                  </button>
                </div>

                <div className="tabs" role="tablist" aria-label="Import method">
                  <button className="active" type="button" role="tab" aria-selected="true">
                    Paste TestFlight feedback
                  </button>
                  <label className="upload-tab">
                    <Upload size={16} />
                    Upload .txt or .json
                    <input accept=".txt,.json,.csv" onChange={(event) => void handleFeedbackFile(event)} type="file" />
                  </label>
                </div>

                <form onSubmit={generateDigest}>
                  <label className="field-label" htmlFor="feedback">
                    Copy feedback from TestFlight or App Store Connect and paste below.
                  </label>
                  <div className="textarea-wrap">
                    <textarea
                      id="feedback"
                      value={feedback}
                      onChange={(event) => setFeedback(event.target.value)}
                      placeholder="Paste TestFlight feedback here..."
                    />
                    <span>{characterCount} characters</span>
                  </div>

                  <div className="import-footer">
                    <p>We'll parse, deduplicate, cluster, and draft issue-ready Markdown automatically.</p>
                    <button className="primary-button" disabled={isGenerating} type="submit">
                      {isGenerating ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
                      {isGenerating ? 'Generating' : 'Generate digest'}
                    </button>
                  </div>
                </form>

                {error ? (
                  <p className="message error">
                    <AlertCircle size={17} />
                    {error}
                  </p>
                ) : null}
                {notice ? <p className="message">{notice}</p> : null}
              </section>

              <DigestStatus report={report} generatedTime={generatedTime} />
            </div>

            <section className="panel themes-panel" aria-labelledby="themes-heading">
              <div className="panel-title table-title">
                <div>
                  <h2 id="themes-heading">Themes</h2>
                  <span>{report.themesCount}</span>
                </div>
                <div className="table-actions">
                  <button type="button">
                    Group by: Theme
                    <ChevronDown size={15} />
                  </button>
                  <button className="icon-button" type="button" aria-label="Export themes">
                    <Upload size={16} />
                  </button>
                </div>
              </div>

              <div className="theme-table" role="table" aria-label="Feedback themes">
                <div className="theme-head" role="row">
                  <span>Theme</span>
                  <span>Count</span>
                  <span>Trend</span>
                  <span>Sentiment</span>
                </div>
                {report.themes.map((theme) => (
                  <ThemeRow
                    key={theme.id}
                    selected={selectedTheme?.id === theme.id}
                    theme={theme}
                    onSelect={() => setSelectedThemeId(theme.id)}
                  />
                ))}
              </div>

              <button className="link-button" type="button">
                View all themes
                <ChevronRight size={16} />
              </button>
            </section>
          </section>

          <aside className="secondary-column" aria-label="Blockers and export">
            <ReleaseBlockers blockers={report.releaseBlockers} />
          </aside>

          <aside className="export-column" aria-label="Issue export and weekly digest">
            <IssueExport
              exportTarget={exportTarget}
              issueExport={issueExport}
              issueCount={report.releaseBlockersCount}
              onCheckout={() => void handleCheckout()}
              onCopy={() => void copyIssueExport()}
              onExportTargetChange={setExportTarget}
            />

            <section className="panel weekly-panel" aria-labelledby="weekly-heading">
              <div className="weekly-title">
                <h2 id="weekly-heading">Weekly digest</h2>
                <span>Scheduled</span>
              </div>
              <ul>
                <li>
                  <CalendarDays size={17} />
                  Every Monday at 9:00 AM
                </li>
                <li>
                  <Mail size={17} />
                  qa@indie.dev, dev@indie.dev
                </li>
                <li>
                  <FileJson size={17} />
                  Includes: Summary, Themes, Blockers, Top Feedback
                </li>
              </ul>
              <div className="weekly-actions">
                <button className="secondary-button" type="button">
                  Edit schedule
                </button>
                <button className="primary-button" type="button" onClick={sendWeeklyDigest}>
                  <Send size={17} />
                  Send now
                </button>
              </div>
            </section>
          </aside>
        </div>

        <footer className="statusbar">
          <span>
            <CheckCircle2 size={16} />
            All times are in PDT
          </span>
          <span>
            <Smartphone size={16} />
            {report.release}
          </span>
          <span className="uptime-dot">Up to date</span>
        </footer>
      </main>
    </div>
  )
}

function NavItem({ active = false, icon: Icon, label }: { active?: boolean; icon: typeof Inbox; label: string }) {
  return (
    <a className={active ? 'nav-item active' : 'nav-item'} href="#top">
      <Icon size={18} />
      <span>{label}</span>
    </a>
  )
}

function ProjectButton({
  active = false,
  icon,
  name,
  release,
}: {
  active?: boolean
  icon: React.ReactNode
  name: string
  release: string
}) {
  return (
    <button className={active ? 'project-button active' : 'project-button'} type="button">
      <span className="project-icon">{icon}</span>
      <span>
        <strong>{name}</strong>
        <small>{release}</small>
      </span>
    </button>
  )
}

function DigestStatus({ generatedTime, report }: { generatedTime: string; report: DigestReport }) {
  return (
    <section className="panel digest-status" aria-labelledby="digest-status-heading">
      <div className="panel-title">
        <h2 id="digest-status-heading">Digest status</h2>
      </div>
      <div className="status-line">
        <CheckCircle2 size={18} />
        <div>
          <strong>Digest generated</strong>
          <small>{generatedTime}</small>
        </div>
      </div>

      <div className="status-metrics">
        <Metric value={report.totalFeedback} label="Total feedback" />
        <Metric value={report.uniqueItems} label="Unique items" />
        <Metric value={report.themesCount} label="Themes" />
        <Metric value={report.releaseBlockersCount} label="Release blockers" />
        <Metric value={report.suggestionsCount} label="Suggestions" />
        <Metric value={report.questionsCount} label="Questions" />
      </div>

      <p>{report.executiveSummary}</p>

      <button className="link-button" type="button">
        View full summary
        <ChevronRight size={16} />
      </button>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function ThemeRow({ onSelect, selected, theme }: { onSelect: () => void; selected: boolean; theme: Theme }) {
  return (
    <button className={selected ? 'theme-row selected' : 'theme-row'} onClick={onSelect} role="row" type="button">
      <span className="theme-main">
        <ChevronRight size={16} />
        <ThemeIcon area={theme.area} />
        <span>
          <strong>{theme.title}</strong>
          <small>"{theme.examples[0] ?? theme.summary}"</small>
        </span>
      </span>
      <span>{theme.count}</span>
      <TrendGlyph trend={theme.trend} />
      <SentimentBadge sentiment={theme.sentiment} />
    </button>
  )
}

function ThemeIcon({ area }: { area: string }) {
  const Icon = area.toLowerCase().includes('stability')
    ? AlertCircle
    : area.toLowerCase().includes('notification')
      ? Bell
      : area.toLowerCase().includes('performance')
        ? Gauge
        : area.toLowerCase().includes('interface')
          ? Code2
          : area.toLowerCase().includes('widget')
            ? Smartphone
            : MessageSquare

  return (
    <span className="theme-icon">
      <Icon size={18} />
    </span>
  )
}

function TrendGlyph({ trend }: { trend: Theme['trend'] }) {
  return (
    <span className={`trend ${trend}`} aria-label={`Trend ${trend}`}>
      <svg viewBox="0 0 46 24" aria-hidden="true">
        <path d={trend === 'down' ? 'M4 8 16 14 27 10 42 17' : trend === 'flat' ? 'M4 14h13l10-5 15 5' : 'M4 18 16 9l10 6 16-13'} />
      </svg>
    </span>
  )
}

function SentimentBadge({ sentiment }: { sentiment: Theme['sentiment'] }) {
  return <span className={`sentiment ${sentiment.toLowerCase()}`}>{sentiment}</span>
}

function ReleaseBlockers({ blockers }: { blockers: ReleaseBlocker[] }) {
  return (
    <section className="panel blockers-panel" aria-labelledby="blockers-heading">
      <div className="panel-title table-title">
        <div>
          <h2 id="blockers-heading">Release blockers</h2>
          <span>{blockers.length}</span>
        </div>
        <button className="icon-button" type="button" aria-label="Filter blockers">
          <Layers3 size={16} />
        </button>
      </div>

      <div className="blocker-list">
        {blockers.map((blocker) => (
          <button className="blocker-row" key={blocker.id} type="button">
            <AlertCircle size={19} />
            <span>
              <strong>{blocker.title}</strong>
              <small>
                {blocker.count} reports <Smartphone size={13} /> {blocker.version}
              </small>
            </span>
            <ChevronRight size={17} />
          </button>
        ))}
      </div>

      <button className="link-button" type="button">
        View all blockers
        <ChevronRight size={16} />
      </button>
    </section>
  )
}

function IssueExport({
  exportTarget,
  issueCount,
  issueExport,
  onCheckout,
  onCopy,
  onExportTargetChange,
}: {
  exportTarget: ExportTarget
  issueCount: number
  issueExport: string
  onCheckout: () => void
  onCopy: () => void
  onExportTargetChange: (target: ExportTarget) => void
}) {
  return (
    <section className="panel export-panel" aria-labelledby="export-heading">
      <div className="panel-title">
        <h2 id="export-heading">Issue export</h2>
        <button className="icon-button" type="button" aria-label="Export help">
          ?
        </button>
      </div>

      <div className="export-tabs" role="tablist" aria-label="Issue target">
        {(['GitHub', 'Jira'] as const).map((target) => (
          <button
            aria-selected={exportTarget === target}
            className={exportTarget === target ? 'active' : ''}
            key={target}
            onClick={() => onExportTargetChange(target)}
            role="tab"
            type="button"
          >
            {target}
          </button>
        ))}
      </div>

      <div className="preview-heading">
        <strong>Preview ({issueCount} issues)</strong>
        <button type="button">Change</button>
      </div>
      <pre className="issue-preview">{issueExport}</pre>

      <button className="secondary-button action-row" type="button" onClick={onCheckout}>
        <Code2 size={17} />
        Create {exportTarget} issues
        <ChevronDown size={16} />
      </button>
      <button className="secondary-button action-row" type="button" onClick={onCopy}>
        <Copy size={17} />
        Copy to clipboard
      </button>
      <small>{issueCount} issues ready to export</small>
    </section>
  )
}

function buildIssueExport(theme: Theme | undefined, release: string, target: ExportTarget) {
  if (!theme) {
    return ''
  }

  const issueType = target === 'Jira' ? 'Bug' : 'Bug'
  const priority = mapPriority(theme.severity)

  return `### ${theme.title}
**Type:** ${issueType}   **Priority:** ${priority}
**Reports:** ${theme.count}   **Release:** ${release}

**Summary:**
${theme.summary}

**Top feedback:**
${theme.examples.map((example) => `- "${example}"`).join('\n')}

**Area:** ${theme.area}
**Suggested owner:** iOS release team`
}

function mapPriority(severity: Severity) {
  return {
    High: 'High',
    Medium: 'Medium',
    Low: 'Low',
  }[severity]
}

function formatGeneratedTime(value: string) {
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.max(0, Math.round(diffMs / 60_000))

  if (minutes < 1) {
    return 'just now'
  }

  if (minutes < 60) {
    return `${minutes} minutes ago`
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export default App
