import {
  ArrowRight,
  ArrowUpRight,
  Brain,
  Check,
  Download,
  FileText,
  Highlighter,
  Layers3,
  Menu,
  NotebookPen,
  Search,
  Sparkles,
} from 'lucide-react'
import cityLandscape from './assets/marginalia/city-snow-avenue.png'
import readingWoman from './assets/marginalia/reading-woman.svg'
import walkingWoman from './assets/marginalia/walking-woman.svg'
import walkmanBoy from './assets/marginalia/walkman-boy.svg'
import { BrandLogo } from './BrandLogo.tsx'
import './Landing.css'

const demoSteps = [
  {
    title: 'Dynamic typing',
    body: 'Start with a normal lecture note. Loci keeps the page quiet while your thinking is still moving.',
  },
  {
    title: 'Reusable ideas',
    body: 'Highlight a phrase and turn it into an atom: a small concept you can find, review, and reuse later.',
  },
  {
    title: 'AI when it helps',
    body: 'Ask for a rewrite, summary, marking pass, or atom candidates without leaving the editor.',
  },
  {
    title: 'Search the system',
    body: 'Jump across notes, projects, and atoms when exams or essays need the thread back.',
  },
]

const featureCards = [
  {
    icon: Brain,
    title: 'Atoms',
    body: 'Turn durable phrases into concept cards that stay linked to the note where they started.',
  },
  {
    icon: Layers3,
    title: 'Project memory',
    body: 'Keep subjects, assignments, source notes, and instructions separated without scattering them.',
  },
  {
    icon: NotebookPen,
    title: 'Study sets',
    body: 'Collect atoms into flashcard-style sets for exam prep and quick review sessions.',
  },
  {
    icon: FileText,
    title: 'Exports',
    body: 'Move finished work out as PDF or Word documents when it needs to become an assignment.',
  },
  {
    icon: Highlighter,
    title: 'Focus mode',
    body: 'A cleaner editor surface for drafting, marking up key phrases, and staying with the sentence.',
  },
  {
    icon: Check,
    title: 'Local-first desktop',
    body: 'A Windows app shaped for personal study work, with release downloads served from GitHub.',
  },
]

const useCases = [
  {
    title: 'Coursework notes',
    body: 'Keep weekly readings, lecture fragments, and tutorial ideas in one calm workspace.',
  },
  {
    title: 'Exam revision',
    body: 'Convert recurring definitions and formulas into atoms, then review them as study sets.',
  },
  {
    title: 'Research projects',
    body: 'Separate sources by project and recover the exact thread behind a quote or claim.',
  },
  {
    title: 'Essay drafting',
    body: 'Draft, restructure, ask AI for a marking pass, and export the polished document.',
  },
]

const recallResults = [
  ['Atom', 'Spacing effect', 'Psychology 201'],
  ['Note', 'Week 07 memory systems', 'Updated today'],
  ['Project', 'Cognitive science essay', '12 linked atoms'],
]

const downloadHref =
  'https://github.com/kangykii/Loci-Notes/releases/download/v1.3.0/Loci.Notes_1.3.0_x64-setup.exe'

function ProductDemo() {
  return (
    <div className="product-demo" aria-label="Animated Loci Notes product demo">
      <div className="demo-sidebar" aria-hidden>
        <span className="demo-dot" />
        <span className="demo-nav-line is-wide" />
        <span className="demo-nav-line" />
        <span className="demo-nav-line is-active" />
        <span className="demo-nav-line" />
      </div>
      <div className="demo-editor">
        <div className="demo-toolbar">
          <span>Psychology 201</span>
          <div>
            <i />
            <i />
            <i />
          </div>
        </div>
        <div className="demo-page">
          <p className="demo-kicker">LECTURE NOTE</p>
          <h2>Memory improves when study is spaced over time.</h2>
          <p className="demo-type-line">
            <span>Spaced repetition works because each review asks the brain to reconstruct the idea.</span>
          </p>
          <p>
            That effort makes recall stronger than rereading the same paragraph in one sitting.
          </p>
          <div className="atom-selection">
            <span>spaced repetition</span>
            <strong>Atom created</strong>
          </div>
          <div className="ai-action-bar" aria-label="AI actions shown in the product demo">
            <button type="button">
              <Sparkles size={15} aria-hidden /> Rewrite
            </button>
            <button type="button">Summarise</button>
            <button type="button">Atomise</button>
            <button type="button">Mark</button>
          </div>
        </div>
      </div>
      <aside className="demo-recall" aria-label="Search recall demo">
        <div className="recall-search">
          <Search size={15} aria-hidden />
          <span>memory</span>
        </div>
        {recallResults.map(([kind, title, meta]) => (
          <div className="recall-result" key={title}>
            <span>{kind}</span>
            <strong>{title}</strong>
            <small>{meta}</small>
          </div>
        ))}
      </aside>
    </div>
  )
}

function Landing() {
  return (
    <main className="landing-page">
      <div className="landing-shell">
        <header className="site-header" aria-label="Loci Notes navigation">
          <a className="brand-mark" href="#top" aria-label="Loci Notes home">
            <span className="brand-symbol">
              <BrandLogo />
            </span>
            <span>Loci Notes</span>
          </a>
          <nav className="desktop-nav" aria-label="Primary">
            <a href="#demos">Demos</a>
            <a href="#features">Features</a>
            <a href="#students">Students</a>
            <a href="#download">Download</a>
          </nav>
          <div className="header-actions">
            <a className="ghost-link" href="#demos">Watch demo</a>
            <a className="primary-link" href="#download">Download App</a>
            <button className="menu-button" type="button" aria-label="Open menu">
              <Menu size={18} aria-hidden />
            </button>
          </div>
        </header>

        <section className="hero-section" id="top">
          <div className="hero-copy">
            <h1>A calmer workspace for serious students.</h1>
            <p>
              Loci Notes turns lecture notes, essay fragments, and useful phrases into a connected
              study system of notes, projects, atoms, and flashcards.
            </p>
            <div className="hero-ctas">
              <a className="hero-primary" href="#download">
                Download App <ArrowUpRight size={16} aria-hidden />
              </a>
              <a className="hero-secondary" href="#demos">
                See product demos <ArrowRight size={16} aria-hidden />
              </a>
            </div>
          </div>
          <ProductDemo />
        </section>

        <section className="demo-section" id="demos">
          <div className="section-heading">
            <h2>From rough notes to reusable knowledge.</h2>
            <p>
              The landing page should show the loop students actually care about: capture, clarify,
              atomise, review, and recover.
            </p>
          </div>
          <div className="demo-grid">
            {demoSteps.map((step, index) => (
              <article className="demo-step" key={step.title}>
                <strong>{String(index + 1).padStart(2, '0')}</strong>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="feature-proof" id="features">
          <div className="proof-copy">
            <h2>Small tools, chosen for the study loop.</h2>
            <p>
              No fake metrics, no filler. Every card points to a capability already present in the
              app and explains why it matters for coursework.
            </p>
          </div>
          <div className="feature-grid">
            {featureCards.map(({ icon: Icon, title, body }) => (
              <article className="feature-card" key={title}>
                <div className="feature-icon">
                  <Icon size={19} aria-hidden />
                </div>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="student-section" id="students">
          <div className="student-art" aria-hidden>
            <img className="student-art-primary" src={readingWoman} alt="" />
            <img className="student-art-secondary" src={walkmanBoy} alt="" />
          </div>
          <div className="section-heading">
            <h2>One place for the work before it becomes polished.</h2>
          </div>
          <div className="use-case-grid">
            {useCases.map((item) => (
              <article key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landscape-section" aria-label="Loci Notes illustrated workspace">
          <div className="landscape-copy">
            <h2>Keep the page calm. Let the system do the remembering.</h2>
            <p>
              The illustrations stay as atmosphere, not decoration for its own sake. The product
              remains the main proof.
            </p>
          </div>
          <div className="landscape-frame">
            <img src={cityLandscape} alt="Ink landscape illustration of a city skyline" />
          </div>
          <img className="walking-ink" src={walkingWoman} alt="" aria-hidden />
        </section>

        <section className="download-section" id="download">
          <div>
            <h2>Start with the Windows app.</h2>
          </div>
          <div className="download-copy">
            <p>
              Use the setup installer for the simplest install. The app page stays direct: one
              primary action, one release asset, no marketing maze.
            </p>
            <a className="download-card" href={downloadHref}>
              <span className="download-icon">
                <Download size={18} aria-hidden />
              </span>
              <span>
                <strong>Windows Setup EXE</strong>
                <small>Version 1.3.0 release asset hosted on GitHub</small>
              </span>
              <b>Download</b>
            </a>
          </div>
        </section>

        <footer className="site-footer">
          <a className="brand-mark footer-brand" href="#top">
            <span className="brand-symbol">
              <BrandLogo />
            </span>
            <span>Loci Notes</span>
          </a>
          <nav aria-label="Footer">
            <a href="#demos">Demos</a>
            <a href="#features">Features</a>
            <a href="#students">Students</a>
            <a href="#download">Download</a>
          </nav>
          <span>(c) 2026 Loci Notes.</span>
        </footer>
      </div>
    </main>
  )
}

export default Landing
