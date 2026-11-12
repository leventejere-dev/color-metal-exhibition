import { useEffect, useRef, useState, type ReactNode } from 'react'
import { MODELS, isJoined, modelById, tableState, useStore, type Config, type ModelId, type ViewPreset } from '../store'
import { CHURCH_SIZE } from '../models/church'
import { MANOR_SIZE } from '../models/manor'
import { STADIUM_SIZE } from '../models/stadium'
import { GARAGE_SIZE } from '../models/garage'
import { MODEL_LENGTH } from '../models/common'
import { moduleOf } from '../scene/layout'

const LOGO = `${import.meta.env.BASE_URL}color-metal-logo.svg`
const SCALES: Record<ModelId, number> = {
  stadium: 1 / STADIUM_SIZE.scale,
  church: 1 / CHURCH_SIZE.scale,
  manor: 1 / MANOR_SIZE.scale,
  garage: 1 / GARAGE_SIZE.scale,
}
const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
/** Hungarian decimal comma */
const hu = (n: number, d = 2) => n.toFixed(d).replace('.', ',')

/* ---------------- actions ---------------- */

/** Camera preset that frames the current furniture configuration. */
function framing(): ViewPreset {
  const s = useStore.getState()
  if (s.detail === 'construction') return 'construction'
  if (s.detail === 'connections') return 'connection'
  if (s.config === 'assembled') return 'overview'
  if (s.config === 'separated') return 'separated'
  if (s.config === 'single') return 'podium'
  return 'layout'
}

function setConfig(c: Config) {
  const st = useStore.getState()
  st.setDetail('none')
  if (c === 'separated' && st.config !== 'separated') st.setSpread(1)
  if (c === 'single' && st.selected) st.setFocus(st.selected)
  st.setConfig(c)
  st.goTo(framing())
}

function setDetail(d: 'connections' | 'construction') {
  const st = useStore.getState()
  const next = st.detail === d ? 'none' : d
  if (next !== 'none') {
    if (st.selected) st.setFocus(st.selected)
    st.select(null)
  }
  st.setDetail(next)
  st.goTo(framing())
}

/** Camera views; some of them also bring the furniture into the matching configuration. */
function showView(v: ViewPreset) {
  const st = useStore.getState()
  if (v === 'overview') {
    st.setDetail('none')
    st.setConfig('assembled')
  } else if (v === 'separated') {
    st.setDetail('none')
    st.setSpread(1)
    st.setConfig('separated')
  } else if (v === 'podium') {
    st.setDetail('none')
    st.setConfig('single')
  } else if (v === 'connection') {
    if (st.detail !== 'connections') st.setDetail('connections')
  } else if (v === 'construction') {
    if (st.detail !== 'construction') st.setDetail('construction')
  }
  st.goTo(v)
}

/* ---------------- brand ---------------- */

function Brand() {
  return (
    <header className="brand">
      <img src={LOGO} alt="COLOR METAL" className="brand-logo" />
      <div className="brand-tag">PARTNER IN ENGINEERING</div>
      <div className="brand-title">
        <span>Építészeti fémek</span>
        <span className="muted">Moduláris kiállítási installáció · koncepció</span>
      </div>
    </header>
  )
}

/* ---------------- model index ---------------- */

function ModelIndex() {
  const selected = useStore((s) => s.selected)
  const lifted = useStore((s) => s.lifted)
  const pick = (id: ModelId) => {
    const st = useStore.getState()
    st.select(id)
    st.setFocus(id)
    if (st.detail !== 'none') st.setDetail('none')
    st.goTo(st.config === 'single' ? 'podium' : id)
  }
  return (
    <nav className="index panel" aria-label="Makett kiválasztása">
      <div className="kicker">Modulok és makettek</div>
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
                  {lifted[m.id] && <em className="badge">levéve</em>}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/* ---------------- info card ---------------- */

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
      <button className="card-close" onClick={() => st.select(null)} aria-label="Bezárás">
        ×
      </button>
      <div className="kicker">
        {m.index} — {m.nameRo}
      </div>
      <h2>{m.name}</h2>
      <dl>
        <dt>Helyszín</dt>
        <dd>{m.location}</dd>
        <dt>Anyag</dt>
        <dd className="mat">
          <i className="swatch" style={{ background: m.swatch }} />
          {m.material}
        </dd>
        <dt>Alkalmazás</dt>
        <dd>{m.application}</dd>
        <dt>Makett</dt>
        <dd>
          leghosszabb oldal ≈ {hu(MODEL_LENGTH)} m · tájékoztató lépték ≈ 1:{Math.round(SCALES[m.id] / 5) * 5}
        </dd>
        <dt>Bútor</dt>
        <dd>{moduleOf(m.id).no}. modul · negyedkör pódium</dd>
      </dl>
      {m.id === 'stadium' && (
        <div className="finish">
          <span className="kicker">Cink felülete</span>
          <div className="seg small">
            <button className={zincFinish === 'asBuilt' ? 'on' : ''} onClick={() => st.setZincFinish('asBuilt')}>
              Fotó szerint
            </button>
            <button className={zincFinish === 'natural' ? 'on' : ''} onClick={() => st.setZincFinish('natural')}>
              Natúr szürke
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
          {isLifted ? 'Makett vissza' : 'Makett levétele'}
        </button>
        <button className="btn" onClick={() => st.goTo(m.id)}>
          Ráközelítés
        </button>
      </div>
      <p className="fine">A makettek geometriája referenciafotók alapján közelített — nem méretpontos másolat.</p>
    </aside>
  )
}

/* ---------------- inspection legends ---------------- */

function DetailLegend() {
  const detail = useStore((s) => s.detail)
  const focus = useStore((s) => s.focus)
  if (detail === 'none') return null
  const st = useStore.getState()
  const no = moduleOf(focus).no
  return (
    <aside className="card panel open legend" aria-live="polite">
      <button className="card-close" onClick={() => setDetail(detail)} aria-label="Bezárás">
        ×
      </button>
      {detail === 'connections' ? (
        <>
          <div className="kicker">Csatlakozási koncepció</div>
          <h2>A csap igazít, a zár összehúz, az agy rögzít</h2>
          <ol className="steps">
            <li>A modulokat a padlón álló központi tengelylap köré gurítjuk; a görgők szabadon elfordulnak.</li>
            <li>Csatlakozásonként két kúpos illesztőcsap ül be a szomszéd oldallap sárgaréz perselyeibe.</li>
            <li>
              Az asztallap széle alatti negyedfordulatos excenteres zár húzza össze a fugát. Kívülről, imbuszkulccsal nyitható a fugacsíkon keresztül,
              így az utolsó modul is bekapcsolható.
            </li>
            <li>A sárgaréz központi agy a négy csúcskivágásba ereszkedik, és összefogja a belső sarkokat.</li>
            <li>Végül a kerületi görgők fékjét rögzítjük. Szétszedés: az agy kiemelése, a zárak oldása, a fékek oldása, szétgurítás.</li>
          </ol>
          <p className="fine">Szerkezeti kapcsolatra nem használunk mágnest. Vizualizációs koncepció — a vasalatok típusa és mérete tervezést igényel.</p>
        </>
      ) : (
        <>
          <div className="kicker">Szerkezeti nézet · {no}. modul</div>
          <h2>Könnyű, üreges, fémmel burkolt</h2>
          <ul className="steps">
            <li>Alumínium profilváz (40 × 40 mm): alsó és felső keret, oszlop minden lapélnél, középborda, merevített oldalkeretek.</li>
            <li>Alumínium méhsejtes szendvics asztallap, világos felülettel és sárgaréz színű eloxált élzárással.</li>
            <li>A díszítő fém vékony burkolat: kb. 1 mm-es lemez 4 mm-es alumínium kompozit lapra ragasztva, sínekre akasztva.</li>
            <li>Kész, látszó oldallapok a vágási síkokon (pezsgőszínű alumínium kompozit, fekete tömítősávval).</li>
            <li>Modulonként négy Ø 50 mm-es forgó görgő süllyesztett fülkékben: három fékes a kerületen (a pedál kívülről elérhető), egy fék nélküli a csúcsnál.</li>
          </ul>
          <p className="fine">
            Koncepcionális szerkezeti javaslat — statikailag nem ellenőrzött. A kinyúló asztalperem terhelésével szembeni stabilitás, az esetleges
            ballaszt és a végleges tömeg mérnöki tervezést igényel.
          </p>
        </>
      )}
      <div className="card-actions">
        <button className="btn" onClick={() => st.goTo(detail === 'connections' ? 'connection' : 'construction')}>
          Újrakeretezés
        </button>
        <button className="btn" onClick={() => showView('casters')}>
          Görgő részlet
        </button>
      </div>
    </aside>
  )
}

/* ---------------- furniture configuration bar ---------------- */

const LAYOUTS: { id: Config; label: string }[] = [
  { id: 'assembled', label: 'Teljes kör — négy modul' },
  { id: 'threeQuarter', label: 'Háromnegyed kör' },
  { id: 'semi', label: 'Félkör — két modul' },
  { id: 'pairs', label: 'Két félköríves csoport' },
  { id: 'separated', label: 'Négy önálló pódium' },
  { id: 'single', label: 'Egyetlen különálló modul' },
]

function Popup({ label, children, active }: { label: string; children: (close: () => void) => ReactNode; active?: boolean }) {
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
      <button className={`btn ${open || active ? 'on' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {label} <span className="caret">▴</span>
      </button>
      {open && (
        <div className="menu panel" role="menu">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

function FurnitureBar() {
  const config = useStore((s) => s.config)
  const spread = useStore((s) => s.spread)
  const detail = useStore((s) => s.detail)
  const layoutActive = config === 'semi' || config === 'threeQuarter' || config === 'pairs'
  return (
    <div className="fbar panel" role="toolbar" aria-label="Bútormodulok">
      <span className="fbar-label">Modulok</span>
      <div className="seg" role="radiogroup" aria-label="Bútor összeállítása">
        <button className={config === 'assembled' && detail !== 'connections' ? 'on' : ''} onClick={() => setConfig('assembled')} role="radio" aria-checked={config === 'assembled'}>
          <span className="lbl-lg">Összeállítva</span>
          <span className="lbl-sm">Összeállítva</span>
        </button>
        <button className={config === 'separated' ? 'on' : ''} onClick={() => setConfig('separated')} role="radio" aria-checked={config === 'separated'}>
          <span className="lbl-lg">Modulok szétválasztása</span>
          <span className="lbl-sm">Szétválasztva</span>
        </button>
        <button className={config === 'single' ? 'on' : ''} onClick={() => setConfig('single')} role="radio" aria-checked={config === 'single'}>
          <span className="lbl-lg">Egyedi modul</span>
          <span className="lbl-sm">Egyedi</span>
        </button>
      </div>
      <Popup label="Elrendezések" active={layoutActive}>
        {(close) =>
          LAYOUTS.map((l) => (
            <button
              key={l.id}
              role="menuitem"
              className={config === l.id ? 'on' : ''}
              onClick={() => {
                setConfig(l.id)
                close()
              }}
            >
              {l.label}
            </button>
          ))
        }
      </Popup>
      {config === 'separated' && (
        <label className="spread">
          <span>Össze</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(spread * 100)}
            onChange={(e) => useStore.getState().setSpread(Number(e.target.value) / 100)}
            aria-label="Szétválasztás mértéke"
          />
          <span>Szét</span>
        </label>
      )}
      <span className="sep" />
      <button className={`btn ${detail === 'connections' ? 'on' : ''}`} onClick={() => setDetail('connections')} aria-pressed={detail === 'connections'}>
        Csatlakozások
      </button>
      <button className={`btn ${detail === 'construction' ? 'on' : ''}`} onClick={() => setDetail('construction')} aria-pressed={detail === 'construction'}>
        Szerkezet
      </button>
    </div>
  )
}

/* ---------------- dock ---------------- */

const VIEWS: ({ id: ViewPreset; label: string } | null)[] = [
  { id: 'overview', label: 'Összeállított installáció' },
  { id: 'top', label: 'Felülnézet — négy szektor' },
  { id: 'separated', label: 'Szétválasztott modulok' },
  { id: 'podium', label: 'Egyedi pódium' },
  { id: 'casters', label: 'Görgő részlet' },
  { id: 'connection', label: 'Modulcsatlakozás részlet' },
  { id: 'construction', label: 'Könnyűszerkezet' },
  null,
  { id: 'front', label: 'Elölnézet' },
  { id: 'stadium', label: 'Stadion közelről' },
  { id: 'church', label: 'Templom közelről' },
  { id: 'manor', label: 'Történelmi épület közelről' },
  { id: 'garage', label: 'Parkolóház közelről' },
]

function Dock() {
  const mode = useStore((s) => s.mode)
  const exploded = useStore((s) => s.exploded)
  const lifted = useStore((s) => s.lifted)
  const selected = useStore((s) => s.selected)
  const joined = useStore((s) => isJoined(s))
  const anyLifted = exploded || Object.values(lifted).some(Boolean)
  const st = useStore.getState()
  return (
    <div className="dock panel" role="toolbar" aria-label="Vezérlők">
      <div className="seg" role="radiogroup" aria-label="Kezelési mód">
        <button className={mode === 'orbit' ? 'on' : ''} onClick={() => st.setMode('orbit')} role="radio" aria-checked={mode === 'orbit'}>
          Kamera
        </button>
        <button
          className={mode === 'rotate' ? 'on' : ''}
          onClick={() => {
            if (!joined) setConfig('assembled')
            useStore.getState().setMode('rotate')
          }}
          role="radio"
          aria-checked={mode === 'rotate'}
          title={joined ? 'Az összekapcsolt installáció forgatása a központi tengely körül' : 'Előbb összekapcsolja a négy modult — a forgatáshoz a központi tengely kell'}
        >
          Kézi forgatás
        </button>
      </div>
      <span className="sep" />
      <button
        className={`btn ${selected && lifted[selected] ? 'on' : ''}`}
        disabled={!selected}
        title={selected ? '' : 'Előbb válassz ki egy makettet'}
        onClick={() => {
          if (!selected) return
          st.toggleLift(selected)
          if (useStore.getState().view.preset === selected) useStore.getState().goTo(selected)
        }}
      >
        {selected && lifted[selected] ? 'Makett vissza' : 'Makett levétele'}
      </button>
      <button className={`btn ${exploded ? 'on' : ''}`} onClick={() => st.setExploded(!exploded)} aria-pressed={exploded}>
        Mind felemel
      </button>
      {anyLifted && (
        <button className="btn" onClick={() => st.restoreAll()}>
          Mind vissza
        </button>
      )}
      <span className="sep" />
      <Popup label="Nézetek">
        {(close) =>
          VIEWS.map((v, i) =>
            v ? (
              <button
                key={v.id}
                role="menuitem"
                onClick={() => {
                  showView(v.id)
                  close()
                }}
              >
                {v.label}
              </button>
            ) : (
              <hr key={i} />
            ),
          )
        }
      </Popup>
      <button className="btn" onClick={() => st.goTo(framing())}>
        Nézet visszaállítása
      </button>
    </div>
  )
}

/* ---------------- rotation dial ---------------- */

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
        <div className="kicker">Kézi forgatás · összekapcsolt installáció</div>
        <div className="dial-read">
          <span ref={label}>0°</span>
          <span className="muted">{isTouch ? 'Húzással forgasd a központi tengely körül' : 'Húzással forgasd a négy összekapcsolt modult a központi tengely körül'}</span>
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
        ? ['Egy ujj · installáció forgatása', 'Két ujj · nagyítás / mozgatás']
        : ['Húzás · installáció forgatása', 'Jobb gomb · mozgatás', 'Görgetés · nagyítás']
      : isTouch
        ? ['Egy ujj · körbejárás', 'Két ujj · nagyítás / mozgatás', 'Koppintás · makett kiválasztása']
        : ['Húzás · körbejárás', 'Jobb gomb · mozgatás', 'Görgetés · nagyítás', 'Kattintás · makett kiválasztása']
  return (
    <div className="hints">
      <span className={`mode-pill ${mode}`}>{mode === 'rotate' ? 'Kézi forgatás' : 'Kamera'}</span>
      {items.map((t) => (
        <span key={t}>{t}</span>
      ))}
    </div>
  )
}

/* ---------------- about ---------------- */

function About() {
  const open = useStore((s) => s.aboutOpen)
  const st = useStore.getState()
  return (
    <>
      <button className="about-btn btn" onClick={() => st.setAbout(true)}>
        A koncepcióról
      </button>
      {open && (
        <div className="about-wrap" onClick={() => st.setAbout(false)}>
          <section className="about panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="A koncepcióról">
            <button className="card-close" onClick={() => st.setAbout(false)} aria-label="Bezárás">
              ×
            </button>
            <div className="kicker">Koncepcióterv · V2, moduláris</div>
            <h2>Négy makett. Négy önálló modul. Egy installáció.</h2>
            <p>
              A Ø 2,80 m-es, fémmel burkolt kiállítási asztal négy egyforma, 90°-os bútormodulra bomlik. Összekapcsolva a kerek installációt adják;
              szétgurítva mindegyik egy-egy kész pódium a saját makettjével — titán-cink, antracit alumínium, réz és arany színre festett expandált
              alumínium.
            </p>
            <div className="about-grid">
              <div>
                <div className="kicker">Vizualizációs paraméterek</div>
                <ul>
                  <li>Összeállítva Ø 2,80 m · magasság 1,05 m · négy egyforma 90°-os modul</li>
                  <li>12 oldalú, felfelé szélesedő test: modulonként három burkolt lap (sárgaréz, réz, patina, cink, antracit alumínium)</li>
                  <li>Könnyűszerkezet: alumínium profilváz, méhsejtes asztallap, kb. 1 mm-es fémlemez kompozit hordozón</li>
                  <li>Modulonként négy Ø 50 mm-es forgó görgő a lábazati fülkékben, ebből három fékes</li>
                  <li>Csatlakozás: fugánként két illesztőcsap és egy excenteres zár, középen rögzítő agy</li>
                  <li>Makettek: leghosszabb oldal ≈ {hu(MODEL_LENGTH)} m, mindegyik teljesen a saját negyedén belül</li>
                </ul>
              </div>
              <div>
                <div className="kicker">Kézi forgatás — a választott megoldás</div>
                <ul>
                  <li>
                    <b>Választott:</b> az összekapcsolt modulok együtt fordulnak egy padlón álló tengelylap körül; a központi agy a tengelycsapra ül, a forgó
                    görgők követik. Befékezve az installáció áll.
                  </li>
                  <li>Modulonként forgó makettalap: elvetve — a kastély és a parkolóház talpa nagyobb kört súrol, mint amennyi egy negyedkörön elfér.</li>
                  <li>Szegmentált forgó asztallap: elvetve — a lap nem csúszhat át szétválasztott modulokon.</li>
                  <li>Forgatni ezért csak akkor lehet, ha mind a négy modul össze van kapcsolva.</li>
                </ul>
              </div>
            </div>
            <div className="about-grid single">
              <div>
                <div className="kicker">Közelítések</div>
                <ul>
                  <li>Minden geometria a kapott fotók alapján, eljárásos modellezéssel készült; a méretek becslések.</li>
                  <li>Stadion: a pálya középvonalán elvágott félmetszet; a hátfalon a környék festett tájképe a légifotó alapján.</li>
                  <li>Templom: északi homlokzat, támpillérek száma, mérművek és sisakprofil egyszerűsítve; a toronysisak PREFA antracit.</li>
                  <li>Válaszút: oldalhomlokzatok, díszítés és oszlopszám egyszerűsítve.</li>
                  <li>Szatmárnémeti: alapterület, magasság és saroksugár becsült; nyílásrend és tetőgépészet egyszerűsítve; a háló rombuszmintája kb. 2× nagyítva.</li>
                  <li>A bútor szerkezete, vasalatai és görgői koncepcionális javaslatok, nem ellenőrzött mérnöki megoldások; tömegadatot nem közlünk.</li>
                </ul>
              </div>
            </div>
            <p className="fine">Nem gyártási dokumentáció. A méretek koncepcionálisak, a tervezés során változhatnak.</p>
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
      <span>Az installáció betöltése</span>
    </div>
  )
}

export function Overlay() {
  const detail = useStore((s) => s.detail)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useStore.getState()
      if (e.key === 'Escape') {
        if (st.aboutOpen) st.setAbout(false)
        else if (st.detail !== 'none') setDetail(st.detail)
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
      {detail === 'none' ? <InfoCard /> : <DetailLegend />}
      <div className="controls">
        <RotateDial />
        <FurnitureBar />
        <Dock />
      </div>
      <Hints />
      <Loader />
    </div>
  )
}
