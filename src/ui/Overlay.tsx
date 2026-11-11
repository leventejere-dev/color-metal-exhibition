import { useEffect, useRef, useState } from 'react'
import { MODELS, modelById, tableState, useStore, type ModelId, type ViewPreset } from '../store'
import { CHURCH_SIZE } from '../models/church'
import { MANOR_SIZE } from '../models/manor'
import { STADIUM_SIZE } from '../models/stadium'

const LOGO = `${import.meta.env.BASE_URL}color-metal-logo.svg`
const SCALES: Record<ModelId, number> = {
  stadium: 1 / STADIUM_SIZE.scale,
  church: 1 / CHURCH_SIZE.scale,
  manor: 1 / MANOR_SIZE.scale,
}
const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

function Brand() {
  return (
    <header className="brand">
      <img src={LOGO} alt="COLOR METAL" className="brand-logo" />
      <div className="brand-tag">PARTNER IN ENGINEERING</div>
      <div className="brand-title">
        <span>Architectural Metals</span>
        <span className="muted">Exhibition installation · concept</span>
      </div>
    </header>
  )
}

function ModelIndex() {
  const selected = useStore((s) => s.selected)
  const lifted = useStore((s) => s.lifted)
  const pick = (id: ModelId) => {
    const st = useStore.getState()
    st.select(id)
    st.goTo(id)
  }
  return (
    <nav className="index panel" aria-label="Select model">
      <div className="kicker">Select model</div>
      <ul>
        {MODELS.map((m) => (
          <li key={m.id}>
            <button className={`index-item ${selected === m.id ? 'active' : ''}`} onClick={() => pick(m.id)}>
              <span className="index-no">{m.index}</span>
              <span className="index-text">
                <span className="index-name">{m.name}</span>
                <span className="index-mat">
                  <i className="swatch" style={{ background: m.swatch }} />
                  {m.material}
                  {lifted[m.id] && <em className="badge">lifted</em>}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function InfoCard() {
  const selected = useStore((s) => s.selected)
  const lifted = useStore((s) => s.lifted)
  const zincFinish = useStore((s) => s.zincFinish)
  const [shown, setShown] = useState<ModelId | null>(selected)
  useEffect(() => {
    if (selected) setShown(selected)
  }, [selected])
  if (!shown) return null
  const m = modelById(shown)
  const st = useStore.getState()
  const isLifted = lifted[m.id]
  return (
    <aside className={`card panel ${selected ? 'open' : ''}`} aria-live="polite">
      <button className="card-close" onClick={() => st.select(null)} aria-label="Close">
        ×
      </button>
      <div className="kicker">
        {m.index} — {m.nameRo}
      </div>
      <h2>{m.name}</h2>
      <dl>
        <dt>Location</dt>
        <dd>{m.location}</dd>
        <dt>Material</dt>
        <dd className="mat">
          <i className="swatch" style={{ background: m.swatch }} />
          {m.material}
        </dd>
        <dt>Application</dt>
        <dd>{m.application}</dd>
        <dt>Model</dt>
        <dd>
          ≈ 1 m longest side · indicative scale ≈ 1:{Math.round(SCALES[m.id] / 5) * 5}
        </dd>
      </dl>
      {m.id === 'stadium' && (
        <div className="finish">
          <span className="kicker">Zinc finish</span>
          <div className="seg small">
            <button className={zincFinish === 'asBuilt' ? 'on' : ''} onClick={() => st.setZincFinish('asBuilt')}>
              As photographed
            </button>
            <button className={zincFinish === 'natural' ? 'on' : ''} onClick={() => st.setZincFinish('natural')}>
              Natural grey
            </button>
          </div>
        </div>
      )}
      <p className="note">{m.note}</p>
      <div className="card-actions">
        <button
          className="btn primary"
          onClick={() => {
            st.toggleLift(m.id)
            // keep the camera on the model while it rises / settles
            if (useStore.getState().view.preset === m.id) useStore.getState().goTo(m.id)
          }}
        >
          {isLifted ? 'Restore model' : 'Lift model'}
        </button>
        <button className="btn" onClick={() => st.goTo(m.id)}>
          Focus view
        </button>
      </div>
      <p className="fine">Concept geometry approximated from reference photographs — not a dimensionally verified replica.</p>
    </aside>
  )
}

const VIEWS: { id: ViewPreset; label: string }[] = [
  { id: 'overview', label: 'Overall perspective' },
  { id: 'top', label: 'Top view' },
  { id: 'front', label: 'Front view' },
  { id: 'stadium', label: 'Stadium focus' },
  { id: 'church', label: 'Church focus' },
  { id: 'manor', label: 'Historic building focus' },
]

function ViewsMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [open])
  return (
    <div className="views" ref={ref}>
      <button className={`btn ${open ? 'on' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        Camera views <span className="caret">▴</span>
      </button>
      {open && (
        <div className="menu panel" role="menu">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              role="menuitem"
              onClick={() => {
                useStore.getState().goTo(v.id)
                setOpen(false)
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Dock() {
  const mode = useStore((s) => s.mode)
  const exploded = useStore((s) => s.exploded)
  const lifted = useStore((s) => s.lifted)
  const anyLifted = exploded || Object.values(lifted).some(Boolean)
  const st = useStore.getState()
  return (
    <div className="dock panel" role="toolbar" aria-label="Controls">
      <div className="seg" role="radiogroup" aria-label="Interaction mode">
        <button className={mode === 'orbit' ? 'on' : ''} onClick={() => st.setMode('orbit')} role="radio" aria-checked={mode === 'orbit'}>
          Orbit view
        </button>
        <button className={mode === 'rotate' ? 'on' : ''} onClick={() => st.setMode('rotate')} role="radio" aria-checked={mode === 'rotate'}>
          Rotate table
        </button>
      </div>
      <span className="sep" />
      <button className={`btn ${exploded ? 'on' : ''}`} onClick={() => st.setExploded(!exploded)} aria-pressed={exploded}>
        Exploded view
      </button>
      {anyLifted && (
        <button className="btn" onClick={() => st.restoreAll()}>
          Restore all
        </button>
      )}
      <span className="sep" />
      <ViewsMenu />
      <button className="btn" onClick={() => st.goTo('overview')}>
        Reset view
      </button>
    </div>
  )
}

function RotateDial() {
  const mode = useStore((s) => s.mode)
  const needle = useRef<SVGGElement>(null)
  const label = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (mode !== 'rotate') return
    let raf = 0
    const tick = () => {
      const deg = ((((tableState.angle * 180) / Math.PI) % 360) + 360) % 360
      if (needle.current) needle.current.setAttribute('transform', `rotate(${-deg} 28 28)`)
      if (label.current) label.current.textContent = `${Math.round(deg)}°`
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [mode])
  if (mode !== 'rotate') return null
  const st = useStore.getState()
  return (
    <div className="dial panel">
      <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden>
        <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(0,0,0,0.14)" />
        {Array.from({ length: 24 }, (_, i) => (
          <line key={i} x1="28" y1="5" x2="28" y2={i % 6 === 0 ? 10 : 7.5} stroke="rgba(0,0,0,0.35)" transform={`rotate(${i * 15} 28 28)`} />
        ))}
        <g ref={needle}>
          <line x1="28" y1="28" x2="28" y2="9" stroke="#C0A062" strokeWidth="1.5" />
          <circle cx="28" cy="28" r="2.5" fill="#C0A062" />
        </g>
        <path d="M28 1 l3 4 h-6z" fill="#6d6f72" />
      </svg>
      <div className="dial-body">
        <div className="kicker">Manual rotation</div>
        <div className="dial-read">
          <span ref={label}>0°</span>
          <span className="muted">{isTouch ? 'Drag across the scene to turn the tabletop' : 'Drag across the scene to turn the tabletop'}</span>
        </div>
        <div className="dial-btns">
          <button className="btn small" onClick={() => st.rotateBy(-Math.PI / 6)}>
            −30°
          </button>
          <button className="btn small" onClick={() => st.rotateTo(0)}>
            0°
          </button>
          <button className="btn small" onClick={() => st.rotateBy(Math.PI / 6)}>
            +30°
          </button>
        </div>
      </div>
    </div>
  )
}

function Hints() {
  const mode = useStore((s) => s.mode)
  const items =
    mode === 'rotate'
      ? isTouch
        ? ['One finger · turn tabletop', 'Two fingers · zoom / pan']
        : ['Drag · turn tabletop', 'Right-drag · pan', 'Scroll · zoom']
      : isTouch
        ? ['One finger · orbit', 'Two fingers · zoom / pan', 'Tap · select model']
        : ['Drag · orbit', 'Right-drag · pan', 'Scroll · zoom', 'Click · select model']
  return (
    <div className="hints">
      <span className={`mode-pill ${mode}`}>{mode === 'rotate' ? 'Table rotation' : 'Camera orbit'}</span>
      {items.map((t) => (
        <span key={t}>{t}</span>
      ))}
    </div>
  )
}

function About() {
  const open = useStore((s) => s.aboutOpen)
  const st = useStore.getState()
  return (
    <>
      <button className="about-btn btn" onClick={() => st.setAbout(true)}>
        About the concept
      </button>
      {open && (
        <div className="about-wrap" onClick={() => st.setAbout(false)}>
          <section className="about panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="About the concept">
            <button className="card-close" onClick={() => st.setAbout(false)} aria-label="Close">
              ×
            </button>
            <div className="kicker">Concept visualisation</div>
            <h2>Three projects. Three metals. One installation.</h2>
            <p>
              A freestanding cylindrical exhibition table carrying three individually removable architectural scale models — titanium-zinc, anthracite
              aluminium and copper. The upper display assembly is turned by hand; the lower body stays fixed.
            </p>
            <div className="about-grid">
              <div>
                <div className="kicker">Visualisation parameters</div>
                <ul>
                  <li>Table Ø 2.80 m · height 1.05 m</li>
                  <li>12-sided tapered body clad in brass, copper, patina, titanium-zinc and anthracite aluminium sheets</li>
                  <li>Two side compartments behind flush metal doors</li>
                  <li>Models ≈ 1 m longest side each</li>
                  <li>Thin graphite presentation bases, brass plaques</li>
                  <li>Sepsi OSK as a half-section against a fluted backdrop</li>
                  <li>Manual rotation — no motor or drive</li>
                </ul>
              </div>
              <div>
                <div className="kicker">Approximations</div>
                <ul>
                  <li>All geometry modelled procedurally from the supplied photographs; dimensions are estimates.</li>
                  <li>Stadium: shown as a half-section cut along the pitch centre line; stand depths, roof heights and seat colour are estimates.</li>
                  <li>Church: north elevation, buttress count, tracery and helm profile simplified; tower helm shown in PREFA anthracite.</li>
                  <li>Răscruci: side elevations, ornament and column count simplified.</li>
                </ul>
              </div>
            </div>
            <p className="fine">Not manufacturing documentation. Dimensions are conceptual and subject to design development.</p>
          </section>
        </div>
      )}
    </>
  )
}

function Loader() {
  const ready = useStore((s) => s.ready)
  const [gone, setGone] = useState(false)
  useEffect(() => {
    if (!ready) return
    const t = setTimeout(() => setGone(true), 900)
    return () => clearTimeout(t)
  }, [ready])
  if (gone) return null
  return (
    <div className={`loader ${ready ? 'out' : ''}`}>
      <img src={LOGO} alt="" />
      <div className="loader-line">
        <i />
      </div>
      <span>Preparing the installation</span>
    </div>
  )
}

export function Overlay() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useStore.getState()
      if (e.key === 'Escape') {
        if (st.aboutOpen) st.setAbout(false)
        else st.select(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <div className="overlay">
      <Brand />
      <About />
      <ModelIndex />
      <InfoCard />
      <RotateDial />
      <Dock />
      <Hints />
      <Loader />
    </div>
  )
}
