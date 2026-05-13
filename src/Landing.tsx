import {
  ArrowUpRight,
  BookOpenCheck,
  Brain,
  Check,
  Download,
  FileText,
  Layers3,
  Menu,
  PenLine,
  Search,
  Sparkles,
} from 'lucide-react'
import './Landing.css'

const featureCards = [
  {
    icon: Layers3,
    title: 'Projects stay clear',
    body: 'Group notes, files, and atoms around the work they belong to.',
  },
  {
    icon: Brain,
    title: 'Ideas become atoms',
    body: 'Turn important phrases into compact concepts you can revisit.',
  },
  {
    icon: Search,
    title: 'Recall feels fast',
    body: 'Search across your thinking without losing the larger context.',
  },
  {
    icon: FileText,
    title: 'Drafts keep moving',
    body: 'Move from rough capture to polished notes and exports in one place.',
  },
]

const stats = [
  ['42k', 'notes organized'],
  ['8.7x', 'faster recall'],
  ['120+', 'project spaces'],
]

const useCases = [
  'Students building study systems',
  'Researchers connecting source notes',
  'Writers collecting reusable ideas',
  'Teams shaping project knowledge',
]

const downloadOptions = [
  {
    title: 'Windows Setup EXE',
    detail: 'Recommended installer for most Windows users.',
    href: 'https://github.com/kangykii/Loci-Notes/releases/latest/download/Loci-Notes-Setup-1.0.0-x64.exe',
    label: 'Download EXE',
  },
  {
    title: 'Windows MSI',
    detail: 'Installer package for managed or admin-style installs.',
    href: 'https://github.com/kangykii/Loci-Notes/releases/latest/download/Loci-Notes-1.0.0-x64.msi',
    label: 'Download MSI',
  },
]

function Landing() {
  return (
    <main className="landing-page">
      <div className="landing-shell">
        <header className="site-header" aria-label="Loci Notes advertising navigation">
          <a className="brand-mark" href="#top" aria-label="Loci Notes home">
            <span className="brand-symbol">
              <BookOpenCheck size={18} aria-hidden />
            </span>
            <span>Loci Notes</span>
          </a>
          <nav className="desktop-nav" aria-label="Primary">
            <a href="#focus">Focus</a>
            <a href="#features">Features</a>
            <a href="#use-cases">Use cases</a>
            <a href="#proof">Proof</a>
          </nav>
          <div className="header-actions">
            <a className="ghost-link" href="#proof">Preview</a>
            <a className="primary-link" href="#download">Download App</a>
            <button className="menu-button" type="button" aria-label="Open menu">
              <Menu size={18} aria-hidden />
            </button>
          </div>
        </header>

        <section className="hero-section" id="top">
          <div className="hero-copy">
            <span className="eyebrow">Advertising campaign for focused thinkers</span>
            <h1>Loci Notes</h1>
            <p>
              A calm way to present the workspace where notes, projects, and atoms become a clearer
              system for thinking.
            </p>
            <div className="hero-ctas">
              <a className="hero-primary" href="#download">
                Download App <ArrowUpRight size={16} aria-hidden />
              </a>
              <a className="hero-secondary" href="#features">
                Explore campaign
              </a>
            </div>
          </div>

          <div className="hero-preview" aria-label="Blank screenshot placeholder for Loci Notes app">
            <div className="preview-sidebar" />
            <div className="preview-canvas">
              <div className="preview-topline" />
              <div className="preview-grid">
                <span />
                <span />
                <span />
              </div>
              <div className="preview-wide" />
            </div>
          </div>
        </section>

        <section className="stats-row" aria-label="Campaign highlights">
          {stats.map(([value, label]) => (
            <div className="stat-pill" key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </section>

        <section className="intro-section" id="focus">
          <h2>
            Focusing on clarity, <span>we keep thinking in motion</span>
          </h2>
          <p>
            This advertising page should feel like the product itself: spacious, quiet, and built
            around the way ideas are gathered, sorted, and returned to later.
          </p>
        </section>

        <section className="bento-section" id="features">
          <div className="section-heading">
            <span>Features</span>
            <h2>
              Notes that feel organized <span>before they feel heavy</span>
            </h2>
          </div>
          <div className="feature-grid">
            {featureCards.map(({ icon: Icon, title, body }, index) => (
              <article className={`feature-tile tile-${index + 1}`} key={title}>
                <div className="tile-icon">
                  <Icon size={20} aria-hidden />
                </div>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="use-case-section" id="use-cases">
          <div className="use-case-copy">
            <span>Use cases</span>
            <h2>
              A familiar shape for <span>scattered ideas</span>
            </h2>
            <a className="small-pill" href="#download">
              View downloads <ArrowUpRight size={14} aria-hidden />
            </a>
          </div>
          <div className="use-case-grid">
            {useCases.map((item, index) => (
              <article key={item}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{item}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="proof-section" id="proof">
          <div className="proof-card">
            <div>
              <span>Proof</span>
              <h2>
                See how the story lands <span>with real app screenshots later</span>
              </h2>
              <p>
                The campaign can hold product screenshots without needing stock imagery or
                unrelated visuals. For now, these frames stay deliberately blank.
              </p>
            </div>
            <div className="screenshot-frame" aria-label="Blank screenshot placeholder">
              <div className="frame-toolbar">
                <i />
                <i />
                <i />
              </div>
              <div className="frame-empty">
                <PenLine size={24} aria-hidden />
              </div>
            </div>
          </div>
        </section>

        <section className="closing-section" id="download">
          <div>
            <span>Download</span>
            <h2>
              Download the Windows app, <span>served from GitHub Releases</span>
            </h2>
          </div>
          <div className="closing-copy">
            <p>
              Choose the setup installer for the simplest install, or the MSI package if you prefer
              a managed Windows installer.
            </p>
            <div className="closing-points">
              <span>
                <Check size={14} aria-hidden /> Release assets hosted on GitHub
              </span>
              <span>
                <Sparkles size={14} aria-hidden /> Version 1.0.0 Windows builds
              </span>
            </div>
            <div className="download-grid" aria-label="Download options">
              {downloadOptions.map((option) => (
                <a className="download-card" href={option.href} key={option.title}>
                  <div className="download-icon">
                    <Download size={18} aria-hidden />
                  </div>
                  <div>
                    <strong>{option.title}</strong>
                    <p>{option.detail}</p>
                  </div>
                  <span>{option.label}</span>
                </a>
              ))}
            </div>
            <a className="primary-link closing-link" href="#download">
              Download App <ArrowUpRight size={14} aria-hidden />
            </a>
          </div>
        </section>

        <footer className="site-footer">
          <a className="brand-mark footer-brand" href="#top">
            <span className="brand-symbol">
              <BookOpenCheck size={18} aria-hidden />
            </span>
            <span>Loci Notes</span>
          </a>
          <nav aria-label="Footer">
            <a href="#focus">Focus</a>
            <a href="#features">Features</a>
            <a href="#use-cases">Use cases</a>
            <a href="#proof">Proof</a>
          </nav>
          <span>(c) 2026 Loci Notes. Advertising concept.</span>
        </footer>
      </div>
    </main>
  )
}

export default Landing
