// bb-primitives.jsx — Foundation: cover, color, type, primitives, data
const { useState: useS } = React;

// ============================================================
// Inline icons (Lucide-style, hand-tuned)
// ============================================================
const Ic = {
  search: (p) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="4.2"/><path d="m12 12-2.8-2.8"/></svg>,
  plus: (p) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M7 2.5v9M2.5 7h9"/></svg>,
  arrow: (p) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h8M7.5 3.5 11 7l-3.5 3.5"/></svg>,
  arrowDown: (p) => <svg width={p.s||10} height={p.s||10} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="m2.5 4 2.5 2.5L7.5 4"/></svg>,
  download: (p) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 2v7M4 6l3 3 3-3M2 11.5h10"/></svg>,
  check: (p) => <svg width={p.s||10} height={p.s||10} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m2 5 2 2 4-4"/></svg>,
  alert: (p) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 1 13 12H1L7 1zM7 5.5v3M7 10.5h.01"/></svg>,
  close: (p) => <svg width={p.s||10} height={p.s||10} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l6 6M8 2l-6 6"/></svg>,
  spinner: (p) => <svg width={p.s||12} height={p.s||12} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="6" cy="6" r="4" opacity=".25"/><path d="M10 6a4 4 0 0 0-4-4"><animateTransform attributeName="transform" type="rotate" from="0 6 6" to="360 6 6" dur="0.9s" repeatCount="indefinite"/></path></svg>,
  empty: (p) => <svg width={p.s||18} height={p.s||18} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="3" y="3" width="12" height="12" rx="1.5"/><path d="M3 7h12M7 3v12" opacity=".5"/></svg>,
  error: (p) => <svg width={p.s||18} height={p.s||18} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="9" cy="9" r="6"/><path d="M9 6v3.5M9 12v.01"/></svg>,
  more: (p) => <svg width={p.s||12} height={p.s||12} viewBox="0 0 12 12" fill="currentColor"><circle cx="2.5" cy="6" r="1"/><circle cx="6" cy="6" r="1"/><circle cx="9.5" cy="6" r="1"/></svg>,
  filter: (p) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M2 3h10M3.5 7h7M5 11h4"/></svg>,
  sort: (p) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><path d="M4 2v10M2 4l2-2 2 2M10 12V2M8 10l2 2 2-2"/></svg>,
  ext: (p) => <svg width={p.s||10} height={p.s||10} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 1h6v6M9 1 4 6M1 4v5h5"/></svg>,
  trend: (p) => <svg width={p.s||10} height={p.s||10} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M1 7l3-3 2 2 3-3M9 3v2.5M9 3H6.5"/></svg>,
  trendDown: (p) => <svg width={p.s||10} height={p.s||10} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M1 3l3 3 2-2 3 3M9 7V4.5M9 7H6.5"/></svg>,
  copy: (p) => <svg width={p.s||12} height={p.s||12} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><path d="M2 8V2.5h5.5"/></svg>,
  play: (p) => <svg width={p.s||10} height={p.s||10} viewBox="0 0 10 10" fill="currentColor"><path d="M3 2v6l5-3z"/></svg>,
  bolt: (p) => <svg width={p.s||12} height={p.s||12} viewBox="0 0 12 12" fill="currentColor"><path d="M7 1 3 7h3l-1 4 4-6H6l1-4z"/></svg>,
  eye: (p) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><path d="M1 7s2-4 6-4 6 4 6 4-2 4-6 4-6-4-6-4z"/><circle cx="7" cy="7" r="1.5"/></svg>,
  presentation: (p) => <svg width={p.s||14} height={p.s||14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><rect x="1.5" y="2" width="11" height="7.5" rx="1"/><path d="M5 12l2-2.5L9 12"/></svg>,
};

// ============================================================
// 00 · COVER
// ============================================================
function BBCover() {
  return (
    <div style={{ width:'100%', height:'100%', background:'var(--paper)', display:'flex', flexDirection:'column', padding:64, position:'relative' }}>
      <div style={{ position:'absolute', top:32, right:48, fontSize:11, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--n500)', display:'flex', gap:24 }}>
        <span>Sistema de diseño</span>
        <span>v 0.1 · 2026.05</span>
        <span>Sangría / OS</span>
      </div>
      <div style={{ position:'absolute', top:32, left:48, display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ width:10, height:10, borderRadius:'50%', background:'var(--sa-base)' }} />
        <span style={{ fontSize:13, fontWeight:500, color:'var(--n700)' }}>Benchmark Builder</span>
      </div>

      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', maxWidth:880, gap:24 }}>
        <div style={{ fontSize:11, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--sa-base)', fontWeight:600 }}>Documento maestro · diseño</div>
        <h1 style={{ fontSize:88, lineHeight:'88px', margin:0, fontWeight:600, letterSpacing:'-0.04em', color:'var(--n900)', textWrap:'balance' }}>
          Inteligencia<br/>de marca, <em style={{ fontFamily:'var(--font-serif)', fontWeight:500, fontStyle:'italic' }}>presentable</em>.
        </h1>
        <p style={{ fontSize:18, lineHeight:'28px', color:'var(--n600)', maxWidth:560, margin:0, textWrap:'pretty' }}>
          Herramienta de research competitivo y social listening. La app es densa y operativa; el reporte es editorial. Este documento define ambos lenguajes y cómo conviven.
        </p>
        <div style={{ display:'flex', gap:32, marginTop:24, paddingTop:24, borderTop:'1px solid var(--n200)' }}>
          {[
            ['07', 'Pantallas hi-fi'],
            ['26', 'Componentes'],
            ['2', 'Modos · claro/oscuro'],
            ['∞', 'Workspaces · branding'],
          ].map(([n,l]) => (
            <div key={l}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:32, fontWeight:500, color:'var(--n900)', lineHeight:1 }}>{n}</div>
              <div style={{ fontSize:12, color:'var(--n500)', marginTop:6, textTransform:'uppercase', letterSpacing:'.08em' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position:'absolute', bottom:32, left:48, right:48, display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--n500)', fontFamily:'var(--font-mono)' }}>
        <span>caso · copa airlines · ruta cartagena</span>
        <span>scroll · pan · zoom</span>
      </div>
    </div>
  );
}

// ============================================================
// 01 · COLOR
// ============================================================
function Swatch({ color, name, value, dark, sel, big }) {
  return (
    <div style={{ flex:1, minWidth:0 }}>
      <div style={{
        height: big?96:80, background: color, border: '1px solid rgba(0,0,0,.04)',
        borderRadius:'var(--r-sm)', boxShadow: sel ? '0 0 0 2px var(--n900), 0 0 0 4px var(--paper)' : 'none',
        position:'relative',
      }}/>
      <div style={{ marginTop:8, fontSize:12, color: dark?'var(--n300)':'var(--n700)', fontWeight:500 }}>{name}</div>
      {value && <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color: dark?'var(--n500)':'var(--n500)', marginTop:2 }}>{value}</div>}
    </div>
  );
}

function BBPalette() {
  return (
    <div style={{ width:'100%', height:'100%', background:'var(--paper)', padding:32, display:'flex', flexDirection:'column', gap:20 }}>
      <div>
        <div className="t-micro" style={{ color:'var(--sa-base)' }}>01 · Color</div>
        <div className="t-h1" style={{ marginTop:6 }}>Paleta sangría</div>
        <div className="t-body" style={{ color:'var(--n600)', marginTop:6, maxWidth:680 }}>
          Neutros stone (warm) + acento burgundy/violeta. El acento aparece sólo en CTAs primarios, links activos y elementos de marca; <em>nunca</em> en data-viz (los gráficos usan ink + grises).
        </div>
      </div>

      {/* Neutros */}
      <div style={{ border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:20, background:'#fff' }}>
        <div className="t-micro">Neutros (stone, cálidos)</div>
        <div style={{ display:'flex', gap:8, marginTop:12 }}>
          <Swatch color="var(--paper)" name="paper · 50" value="#FAF8F4" />
          <Swatch color="var(--n100)" name="100" value="#ECE7DD" />
          <Swatch color="var(--n200)" name="200 line-soft" value="#DDD6C7" />
          <Swatch color="var(--n300)" name="300 line" value="#C7BDAB" />
          <Swatch color="var(--n400)" name="400" value="#A89E8B" />
          <Swatch color="var(--n500)" name="500 muted" value="#847A68" />
          <Swatch color="var(--n600)" name="600" value="#635A4B" />
          <Swatch color="var(--n700)" name="700 ink-2" value="#3D352A" />
          <Swatch color="var(--n900)" name="900 ink" value="#181410" />
        </div>
      </div>

      <div style={{ display:'flex', gap:20 }}>
        {/* Sangría */}
        <div style={{ flex:'1.05 1 0', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:20, background:'#fff' }}>
          <div className="t-micro">Acento sangría (burgundy → violeta)</div>
          <div style={{ display:'flex', gap:8, marginTop:12 }}>
            <Swatch color="var(--sa-soft)" name="soft" value="#F6E6EC" />
            <Swatch color="var(--sa-light)" name="light" value="#C3517A" />
            <Swatch color="var(--sa-base)" name="base" value="#6B1A36" sel/>
            <Swatch color="var(--sa-strong)" name="strong" value="#4A0F24" />
            <Swatch color="var(--sa-violet)" name="violet" value="#8A2A5F" />
          </div>
          <div className="t-small" style={{ color:'var(--n500)', marginTop:14 }}>
            <span style={{ fontFamily:'var(--font-mono)', color:'var(--sa-base)' }}>base</span> = primary on report · CTA accent · brand mark.
            <span style={{ fontFamily:'var(--font-mono)', color:'var(--sa-violet)' }}> violet</span> reservado para hovers/activos sutiles.
          </div>
        </div>
        {/* Estados */}
        <div style={{ flex:'1 1 0', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:20, background:'#fff' }}>
          <div className="t-micro">Estados semánticos</div>
          <div style={{ display:'flex', gap:8, marginTop:12 }}>
            <Swatch color="var(--success)" name="success" value="#1F7A3A" />
            <Swatch color="var(--warn)" name="warn" value="#9A4A14" />
            <Swatch color="var(--danger)" name="danger" value="#B8261D" />
            <Swatch color="var(--info)" name="info" value="#1D3FB8" />
          </div>
          <div style={{ display:'flex', gap:6, marginTop:14, flexWrap:'wrap' }}>
            <BBBadge tone="success">activo</BBBadge>
            <BBBadge tone="warn">en revisión</BBBadge>
            <BBBadge tone="danger">vencido</BBBadge>
            <BBBadge tone="info">borrador</BBBadge>
            <BBBadge tone="neutral">archivado</BBBadge>
            <BBBadge tone="accent">vigente</BBBadge>
          </div>
        </div>
      </div>
    </div>
  );
}

function BBPaletteDark() {
  return (
    <div style={{ width:'100%', height:'100%', background:'#0e0c09', padding:32, display:'flex', flexDirection:'column', gap:16 }}>
      <div>
        <div className="t-micro" style={{ color:'var(--sa-light)' }}>Modo oscuro · neutros invertidos + acento</div>
        <div className="t-h2" style={{ color:'#f0ebe1', marginTop:4 }}>Espejo cálido del modo claro</div>
      </div>
      <div style={{ background:'#1a1612', border:'1px solid #2a241c', borderRadius:'var(--r-md)', padding:20 }}>
        <div className="t-micro" style={{ color:'#847a68' }}>Neutros · dark</div>
        <div style={{ display:'flex', gap:8, marginTop:12 }}>
          <Swatch color="#0e0c09" name="bg · 950" value="#0E0C09" dark />
          <Swatch color="#1a1612" name="surface · 900" value="#1A1612" dark />
          <Swatch color="#2a241c" name="raised · 850" value="#2A241C" dark />
          <Swatch color="#3d352a" name="line · 800" value="#3D352A" dark />
          <Swatch color="#635a4b" name="line-2 · 700" value="#635A4B" dark />
          <Swatch color="#847a68" name="muted · 500" value="#847A68" dark />
          <Swatch color="#a89e8b" name="text-2 · 400" value="#A89E8B" dark />
          <Swatch color="#ddd6c7" name="text · 200" value="#DDD6C7" dark />
          <Swatch color="#faf8f4" name="hi · 50" value="#FAF8F4" dark sel />
        </div>
      </div>
    </div>
  );
}

function BBPaletteDataviz() {
  const platforms = [
    ['Instagram','#c13584'], ['TikTok','#111111'], ['YouTube','#c4302b'], ['Facebook','#1877f2'],
    ['X / Grok','#0f0f0f'], ['Reddit','#ff4500'], ['Mastodon','#6364ff'], ['Bluesky','#1083fe'],
    ['Web','#6b6b6b'], ['Meta Ads','#4267b2'],
  ];
  const dataviz = ['#181410','#3d352a','#635a4b','#847a68','#a89e8b','#c7bdab'];
  return (
    <div style={{ width:'100%', height:'100%', background:'var(--paper)', padding:32, display:'flex', gap:20 }}>
      <div style={{ flex:1, border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:20, background:'#fff' }}>
        <div className="t-micro">Plataformas (sólo branding y badges)</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:12, marginTop:14 }}>
          {platforms.map(([n,c]) => (
            <div key={n} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ width:14, height:14, borderRadius:3, background:c, border:'1px solid rgba(0,0,0,.08)' }}/>
              <span style={{ fontSize:12, color:'var(--n700)' }}>{n}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex:1, border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:20, background:'#fff' }}>
        <div className="t-micro">Data-viz · escala monocromo + ad accent</div>
        <div style={{ display:'flex', gap:6, marginTop:14, height:48 }}>
          {dataviz.map((c,i) => <div key={i} style={{ flex:1, background:c, borderRadius:2 }}/>)}
        </div>
        <div style={{ display:'flex', gap:14, marginTop:18, alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ width:10, height:10, background:'var(--organic)', borderRadius:2 }}/>
            <span style={{ fontSize:12, color:'var(--n700)' }}>orgánico</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ width:10, height:10, background:'var(--ad)', borderRadius:2, position:'relative' }}>
              <span style={{ position:'absolute', inset:0, background:'repeating-linear-gradient(45deg, transparent 0 2px, rgba(255,255,255,.25) 2px 3px)' }}/>
            </span>
            <span style={{ fontSize:12, color:'var(--n700)' }}>ad pago (Meta Library)</span>
          </div>
          <div style={{ flex:1 }}/>
          <span style={{ fontSize:11, color:'var(--n500)', fontFamily:'var(--font-mono)' }}>charts: ink + greys</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 02 · TYPE
// ============================================================
function BBTypeApp() {
  return (
    <div style={{ width:'100%', height:'100%', background:'var(--paper)', padding:32, display:'flex', gap:24 }}>
      <div style={{ flex:1.4, display:'flex', flexDirection:'column', gap:24 }}>
        <div>
          <div className="t-micro" style={{ color:'var(--sa-base)' }}>02 · Type</div>
          <div className="t-h1" style={{ marginTop:6 }}>Geist + JetBrains Mono</div>
          <div className="t-body" style={{ color:'var(--n600)', marginTop:6, maxWidth:560 }}>
            Geist para todo el chrome y body. Mono para números, KPIs, datos en tablas, IDs, hex values. Tracking apretado en titulares.
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
          <TypeRow tag="DISPLAY · 36/40 · 600" sample="Análisis competitivo de Cartagena" />
          <TypeRow tag="H1 · 24/28 · 600" sample="Live feed · últimos 60 días" sz={24} lh={28}/>
          <TypeRow tag="H2 · 18/24 · 600" sample="Avianca lidera en volumen orgánico" sz={18} lh={24}/>
          <TypeRow tag="BODY · 14/20 · 400" sample="El competidor publicó 38 piezas en el período, con un 62% de contenido orgánico y un 38% de inversión paga distribuida en Meta Ads." sz={14} lh={20} weight={400} muted/>
          <TypeRow tag="SMALL · 13/18 · 400" sample="Última actualización hace 12 minutos · run #042 vigente" sz={13} lh={18} weight={400} muted/>
          <TypeRow tag="MICRO · 11/14 · 600 · UPPERCASE" sample="ANUNCIOS PAGOS · META AD LIBRARY" sz={11} lh={14} weight={600} micro/>
        </div>
      </div>
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:16 }}>
        <div style={{ border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:18, background:'#fff' }}>
          <div className="t-micro">Tabular numbers (mono)</div>
          <table style={{ width:'100%', marginTop:12, fontSize:13, fontFamily:'var(--font-mono)', borderCollapse:'collapse' }}>
            <tbody>
              <tr><td style={{ padding:'6px 0', color:'var(--n600)' }}>Menciones totales</td><td style={{ textAlign:'right', fontVariantNumeric:'tabular-nums' }}>2.418</td></tr>
              <tr><td style={{ padding:'6px 0', color:'var(--n600)' }}>Engagement total</td><td style={{ textAlign:'right' }}>842.300</td></tr>
              <tr><td style={{ padding:'6px 0', color:'var(--n600)' }}>Reach estimado</td><td style={{ textAlign:'right' }}>5.820.140</td></tr>
              <tr><td style={{ padding:'6px 0', color:'var(--n600)' }}>Share of voice</td><td style={{ textAlign:'right' }}>68,4 %</td></tr>
            </tbody>
          </table>
        </div>
        <div style={{ border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:18, background:'#fff' }}>
          <div className="t-micro">Reglas tipográficas</div>
          <ul style={{ margin:'12px 0 0', padding:0, listStyle:'none', fontSize:13, lineHeight:'22px', color:'var(--n700)' }}>
            <li>· <b>Pesos</b>: 400 body / 500 énfasis / 600 títulos. No usar 700+.</li>
            <li>· <b>Tracking</b>: <span style={{ fontFamily:'var(--font-mono)', color:'var(--sa-base)' }}>-0.02em</span> en h1/h2/display.</li>
            <li>· <b>Mono</b> en cualquier número que se compare en columna.</li>
            <li>· <b>Uppercase</b> sólo en labels micro con tracking <span style={{ fontFamily:'var(--font-mono)', color:'var(--sa-base)' }}>+0.08em</span>.</li>
            <li>· <b>text-wrap: balance</b> en h1/h2/display; <b>pretty</b> en párrafos.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function TypeRow({ tag, sample, sz=36, lh=40, weight=600, muted, micro }) {
  return (
    <div>
      <div style={{ fontSize:10, letterSpacing:'.1em', color:'var(--n500)', textTransform:'uppercase', fontFamily:'var(--font-mono)' }}>{tag}</div>
      <div style={{
        fontSize:sz, lineHeight:`${lh}px`, fontWeight:weight,
        marginTop:6, color: muted?'var(--n700)':'var(--n900)',
        letterSpacing: sz>=18 ? '-0.02em' : (micro?'.08em':'0'),
        textTransform: micro?'uppercase':'none',
        textWrap: sz>=18 && !micro ? 'balance' : 'auto',
      }}>{sample}</div>
    </div>
  );
}

function BBTypeReport() {
  return (
    <div style={{ width:'100%', height:'100%', background:'var(--paper)', padding:32, display:'flex', gap:24 }}>
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:14 }}>
        <div>
          <div className="t-micro" style={{ color:'var(--sa-base)' }}>02b · Type · reporte</div>
          <div className="t-h1" style={{ marginTop:6 }}>Newsreader · serif editorial</div>
          <div className="t-body" style={{ color:'var(--n600)', marginTop:6, maxWidth:540 }}>
            En el reporte exportado mandamos a la serif. Es el deliverable; tiene que leerse como editorial, no como dashboard.
          </div>
        </div>
        <div style={{ marginTop:8 }}>
          <div className="t-mono t-micro">REPORT DISPLAY · 64/68 · NEWSREADER 500</div>
          <div style={{ fontFamily:'var(--font-serif)', fontSize:64, lineHeight:'68px', fontWeight:500, letterSpacing:'-0.025em', color:'var(--n900)', marginTop:8, textWrap:'balance' }}>
            Cartagena, en el aire de cuatro aerolíneas
          </div>
        </div>
        <div style={{ marginTop:12 }}>
          <div className="t-mono t-micro">REPORT BODY · 17/27 · NEWSREADER 400</div>
          <p style={{ fontFamily:'var(--font-serif)', fontSize:17, lineHeight:'27px', color:'var(--n800)', marginTop:8, maxWidth:560, textWrap:'pretty' }}>
            Entre el 1 de marzo y el 30 de abril de 2026, las cuatro aerolíneas con presencia activa en Colombia produjeron <span style={{ fontFamily:'var(--font-mono)', fontSize:15 }}>2.418</span> piezas relacionadas a Cartagena en redes sociales y prensa. <em>Avianca</em> concentra el 41 % de ese volumen, seguida por <em>LATAM</em> con el 24 %.
          </p>
        </div>
      </div>
      <div style={{ flex:'0 0 320px', borderLeft:'1px solid var(--n200)', paddingLeft:24, display:'flex', flexDirection:'column', gap:16 }}>
        <div className="t-micro">Set acotado · workspace</div>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {[
            ['Newsreader', 'serif · default editorial', 'serif'],
            ['Source Serif 4', 'serif · alternativa', 'serif'],
            ['Geist', 'sans · cliente sobrio', 'sans'],
            ['Inter Display', 'sans · alternativa', 'sans'],
          ].map(([n,d,k]) => (
            <div key={n} style={{ padding:'10px 12px', border:'1px solid var(--n200)', borderRadius:'var(--r-sm)', background: n==='Newsreader'?'var(--n50)':'#fff' }}>
              <div style={{ fontFamily: k==='serif'?'var(--font-serif)':'var(--font-sans)', fontSize:18, fontWeight:500, color:'var(--n900)' }}>{n}</div>
              <div className="t-small" style={{ color:'var(--n500)', marginTop:2 }}>{d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 03 · PRIMITIVES
// ============================================================
function Btn({ kind='primary', size='md', children, icon, iconRight, disabled, loading, style }) {
  const sizes = {
    sm: { h:28, px:10, fs:12, ic:11 },
    md: { h:34, px:14, fs:13, ic:13 },
    lg: { h:40, px:18, fs:14, ic:14 },
  }[size];
  const kinds = {
    primary:    { bg:'var(--n900)', color:'#fff', border:'1px solid var(--n900)' },
    secondary:  { bg:'#fff', color:'var(--n900)', border:'1px solid var(--n300)' },
    accent:     { bg:'var(--sa-base)', color:'#fff', border:'1px solid var(--sa-base)' },
    ghost:      { bg:'transparent', color:'var(--n700)', border:'1px solid transparent' },
    destructive:{ bg:'#fff', color:'var(--danger)', border:'1px solid var(--danger)' },
  }[kind];
  const dis = disabled ? { opacity:.45, background:'var(--n200)', color:'var(--n500)', border:'1px solid var(--n200)' } : {};
  return (
    <button style={{
      height:sizes.h, padding:`0 ${sizes.px}px`, fontSize:sizes.fs, fontWeight:500,
      borderRadius:'var(--r-sm)', cursor:disabled?'not-allowed':'pointer', display:'inline-flex',
      alignItems:'center', gap:6, fontFamily:'var(--font-sans)', whiteSpace:'nowrap',
      ...kinds, ...dis, ...(style||{}),
    }}>
      {loading && <Ic.spinner s={sizes.ic}/>}
      {icon && !loading && icon}
      {children}
      {iconRight && iconRight}
    </button>
  );
}

function BBButtons() {
  return (
    <div style={{ width:'100%', height:'100%', background:'var(--paper)', padding:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:16 }}>
        <div>
          <div className="t-micro" style={{ color:'var(--sa-base)' }}>03 · Components</div>
          <div className="t-h2" style={{ marginTop:4 }}>Button</div>
        </div>
        <div className="t-micro">JERARQUÍA · TAMAÑOS · ESTADOS</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1.1fr .8fr 1.1fr', gap:16, alignItems:'flex-start' }}>
        <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:18 }}>
          <div className="t-micro">Jerarquía</div>
          <div style={{ display:'flex', gap:10, marginTop:12, flexWrap:'wrap' }}>
            <Btn kind="primary">Primary</Btn>
            <Btn kind="secondary">Secondary</Btn>
            <Btn kind="accent">Accent</Btn>
            <Btn kind="ghost">Ghost</Btn>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:10 }}>
            <Btn kind="destructive">Destructive</Btn>
          </div>
          <div className="t-small" style={{ color:'var(--n500)', marginTop:14, lineHeight:'18px' }}>
            <b>Primary</b> = ink (acción dominante). <b>Accent</b> = sangría (CTAs de marca, links activos). <span style={{ color:'var(--sa-base)' }}>1 primary por pantalla.</span>
          </div>
        </div>

        <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:18 }}>
          <div className="t-micro">Tamaños</div>
          <div style={{ display:'flex', gap:10, marginTop:12, alignItems:'flex-end' }}>
            <Btn size="sm" kind="primary">Small</Btn>
            <Btn size="md" kind="primary">Medium</Btn>
            <Btn size="lg" kind="primary">Large</Btn>
          </div>
          <div className="t-micro" style={{ marginTop:18 }}>Estados</div>
          <div style={{ display:'flex', gap:10, marginTop:12 }}>
            <Btn disabled>Disabled</Btn>
            <Btn kind="primary" loading>Cargando…</Btn>
          </div>
        </div>

        <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:18 }}>
          <div className="t-micro">Con icono</div>
          <div style={{ display:'flex', gap:10, marginTop:12, flexWrap:'wrap' }}>
            <Btn kind="secondary" icon={<Ic.plus s={11}/>}>Nuevo proyecto</Btn>
            <Btn kind="primary" iconRight={<Ic.arrow s={11}/>}>Generar reporte</Btn>
            <Btn kind="ghost" icon={<Ic.more/>}/>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:10 }}>
            <Btn kind="secondary" icon={<Ic.download s={11}/>}>PDF</Btn>
            <Btn kind="secondary" icon={<Ic.copy s={11}/>}>Copiar</Btn>
          </div>
          <div className="t-small" style={{ color:'var(--n500)', marginTop:14 }}>
            Loading visible es <b>crítico</b>: scrapeos y análisis IA tardan 5s–4min.
          </div>
        </div>
      </div>
    </div>
  );
}

function BBInputs() {
  return (
    <div style={{ width:'100%', height:'100%', background:'var(--paper)', padding:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:16 }}>
        <div className="t-h2">Input · Select · Search</div>
        <div className="t-micro">DEFAULT · FOCUSED · ERROR · DISABLED</div>
      </div>
      <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:24, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:24 }}>
        <Field label="Nombre del proyecto" value="Copa · Cartagena Q2"/>
        <Field label="Período" value="60 días" select/>
        <Field label="Buscar mención…" value="" search ph="ej: ruta cartagena"/>
        <Field label="Inversión estimada (USD) · focused" value="$ 2.500,00" focused/>
        <Field label="API key Meta · error" value="" error="Token inválido o expirado" mono/>
        <Field label="Notas internas" value="" textarea/>
      </div>
    </div>
  );
}

function Field({ label, value, ph, select, search, focused, error, mono, textarea }) {
  const border = error ? 'var(--danger)' : focused ? 'var(--n900)' : 'var(--n300)';
  const ring = focused ? '0 0 0 3px rgba(24,20,16,.08)' : error ? '0 0 0 3px rgba(184,38,29,.10)' : 'none';
  return (
    <div>
      <div style={{ fontSize:10, letterSpacing:'.1em', color: error?'var(--danger)':'var(--n500)', textTransform:'uppercase', fontFamily:'var(--font-mono)', marginBottom:6 }}>{label}</div>
      <div style={{ position:'relative' }}>
        {search && <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--n500)' }}><Ic.search/></span>}
        <div style={{
          height: textarea?80:36, padding:`${textarea?8:0}px 12px ${textarea?8:0}px ${search?32:12}px`,
          border:`1px solid ${border}`, borderRadius:'var(--r-sm)', background:'#fff',
          display:'flex', alignItems: textarea?'flex-start':'center',
          fontSize:13, color: value? 'var(--n900)':'var(--n500)',
          fontFamily: mono?'var(--font-mono)':'inherit',
          boxShadow:ring,
        }}>
          {value || <span style={{ color:'var(--n500)' }}>{ph || (textarea ? 'Observaciones del scrapeo…' : '—')}</span>}
          {select && <span style={{ marginLeft:'auto', color:'var(--n500)' }}><Ic.arrowDown/></span>}
        </div>
      </div>
      {error && <div style={{ fontSize:12, color:'var(--danger)', marginTop:6, fontFamily:'var(--font-mono)' }}>{error}</div>}
    </div>
  );
}

function BBBadgesTabs() {
  return (
    <div style={{ width:'100%', height:'100%', background:'var(--paper)', padding:24, display:'grid', gridTemplateColumns:'1.05fr .9fr 1.1fr', gap:16 }}>
      <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:18 }}>
        <div className="t-micro">Tabs</div>
        <div style={{ display:'flex', gap:24, marginTop:14, borderBottom:'1px solid var(--n200)' }}>
          {['Overview','Setup','Runs','Live feed','Competidores','Reportes'].map((t,i) => (
            <div key={t} style={{
              padding:'8px 0', fontSize:13, fontWeight: i===3?500:400, color: i===3?'var(--n900)':'var(--n600)',
              borderBottom: i===3 ? '2px solid var(--sa-base)' : '2px solid transparent', marginBottom:-1,
            }}>{t}</div>
          ))}
        </div>
        <div className="t-small" style={{ color:'var(--n500)', marginTop:14 }}>Underline en sangría sobre la tab activa. Hover sutil sin underline.</div>
      </div>
      <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:18 }}>
        <div className="t-micro">Badge</div>
        <div style={{ display:'flex', gap:6, marginTop:14, flexWrap:'wrap' }}>
          <BBBadge tone="success">activo</BBBadge>
          <BBBadge tone="warn">revisión</BBBadge>
          <BBBadge tone="danger">vencido</BBBadge>
          <BBBadge tone="info">borrador</BBBadge>
          <BBBadge tone="neutral">archivado</BBBadge>
          <BBBadge tone="accent">v2.3 vigente</BBBadge>
        </div>
        <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
          <BBBadge tone="neutral" dot="#c13584">Instagram</BBBadge>
          <BBBadge tone="neutral" dot="#000">TikTok</BBBadge>
          <BBBadge tone="neutral" dot="#c4302b">YouTube</BBBadge>
          <BBBadge tone="neutral">+2</BBBadge>
        </div>
      </div>
      <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:18 }}>
        <div className="t-micro">Toast</div>
        <div style={{ marginTop:14, display:'flex', flexDirection:'column', gap:10 }}>
          <Toast kind="success" title="Reporte exportado" body="Cartagena Q2 · 14 páginas · 2,1 MB" action="descargar"/>
          <Toast kind="danger" title="Error en run #042" body="Timeout en TikTok scraper · reintenta en 30s" action="reintentar"/>
        </div>
      </div>
    </div>
  );
}

function Toast({ kind, title, body, action }) {
  const tone = { success:{c:'var(--success)', bg:'var(--success-soft)'}, danger:{c:'var(--danger)', bg:'var(--danger-soft)'} }[kind];
  return (
    <div style={{ display:'flex', gap:10, padding:'10px 12px', border:`1px solid ${tone.c}`, borderLeft:`3px solid ${tone.c}`, borderRadius:'var(--r-sm)', background: kind==='danger'?'var(--danger-soft)':'#fff' }}>
      <div style={{ color:tone.c, marginTop:2 }}>{kind==='success'?<Ic.check s={12}/>:<Ic.alert s={14}/>}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:500, color:'var(--n900)' }}>{title}</div>
        <div style={{ fontSize:12, color:'var(--n600)', marginTop:2 }}>{body} · <a style={{ color:tone.c, textDecoration:'underline' }}>{action}</a></div>
      </div>
      <Ic.close/>
    </div>
  );
}

function BBStates() {
  return (
    <div style={{ width:'100%', height:'100%', background:'var(--paper)', padding:24, display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1.05fr', gap:14 }}>
      {/* Skeleton */}
      <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:18 }}>
        <div className="t-micro">Loading skeleton</div>
        <div style={{ marginTop:14, display:'flex', flexDirection:'column', gap:8 }}>
          <Skel w="60%" h={14}/><Skel w="40%" h={10}/><Skel w="90%" h={10}/><Skel w="100%" h={56}/><Skel w="80%" h={10}/>
        </div>
      </div>
      {/* Empty */}
      <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:18 }}>
        <div className="t-micro">Empty</div>
        <div style={{ marginTop:30, textAlign:'center', color:'var(--n500)' }}>
          <div style={{ width:36, height:36, borderRadius:'50%', border:'1px dashed var(--n300)', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'var(--n400)' }}>
            <Ic.empty/>
          </div>
          <div style={{ marginTop:14, fontSize:14, fontWeight:500, color:'var(--n900)' }}>Sin runs todavía</div>
          <div style={{ marginTop:6, fontSize:12 }}>Configurá competidores y plataformas para arrancar.</div>
          <div style={{ marginTop:14 }}>
            <Btn kind="primary" size="sm" icon={<Ic.plus s={10}/>}>Configurar proyecto</Btn>
          </div>
        </div>
      </div>
      {/* Error */}
      <div style={{ background:'var(--danger-soft)', border:'1px solid var(--danger)', borderRadius:'var(--r-md)', padding:18 }}>
        <div className="t-micro" style={{ color:'var(--danger)' }}>Error</div>
        <div style={{ marginTop:30, textAlign:'center' }}>
          <div style={{ width:36, height:36, borderRadius:'50%', background:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'var(--danger)' }}>
            <Ic.error/>
          </div>
          <div style={{ marginTop:14, fontSize:14, fontWeight:500, color:'var(--danger)' }}>No pudimos conectar con Meta Ads</div>
          <div style={{ marginTop:6, fontSize:12, color:'var(--n700)' }}>El token expiró el 02/05. Renovalo en Settings.</div>
          <div style={{ marginTop:14 }}>
            <Btn kind="destructive" size="sm">Reintentar</Btn>
          </div>
        </div>
      </div>
      {/* Modal destructiva */}
      <div style={{ background:'#1a1612', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:14, position:'relative', overflow:'hidden' }}>
        <div className="t-micro" style={{ color:'#a89e8b' }}>Modal · destructiva</div>
        <div style={{ marginTop:10, background:'#fff', borderRadius:'var(--r-md)', padding:18, boxShadow:'0 12px 40px rgba(0,0,0,.25)' }}>
          <div style={{ fontSize:14, fontWeight:600 }}>¿Eliminar proyecto Copa · Cartagena?</div>
          <div style={{ fontSize:12, color:'var(--n600)', marginTop:6, lineHeight:'18px' }}>Esta acción borra <b>4 runs</b>, <b>328 menciones</b> y <b>2 reportes</b>. No se puede deshacer.</div>
          <div style={{ marginTop:12, padding:8, border:'1px solid var(--n200)', borderRadius:'var(--r-sm)', background:'var(--n50)' }}>
            <div style={{ fontSize:10, color:'var(--n500)', fontFamily:'var(--font-mono)', marginBottom:4 }}>Escribí <span style={{ color:'var(--danger)' }}>eliminar</span> para confirmar</div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:13, color:'var(--n400)' }}>eliminar</div>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:14 }}>
            <Btn kind="secondary" size="sm">Cancelar</Btn>
            <Btn kind="destructive" size="sm">Sí, eliminar</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function Skel({ w, h }) {
  return <div style={{ width:w, height:h, background:'linear-gradient(90deg, var(--n100) 0%, var(--n200) 50%, var(--n100) 100%)', backgroundSize:'200% 100%', borderRadius:3 }}/>;
}

function BBBadge({ tone='neutral', dot, children, size='md' }) {
  const tones = {
    success:{ c:'var(--success)', bg:'var(--success-soft)' },
    warn:{ c:'var(--warn)', bg:'var(--warn-soft)' },
    danger:{ c:'var(--danger)', bg:'var(--danger-soft)' },
    info:{ c:'var(--info)', bg:'var(--info-soft)' },
    accent:{ c:'var(--sa-base)', bg:'var(--sa-soft)' },
    neutral:{ c:'var(--n700)', bg:'var(--n100)' },
  }[tone];
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:6, padding: size==='sm'?'1px 7px':'2px 8px',
      borderRadius:99, fontSize: size==='sm'?10:11, fontWeight:500, color:tones.c,
      background:'transparent', border:`1px solid ${tones.c}`,
    }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background: dot || tones.c }}/>
      {children}
    </span>
  );
}

// ============================================================
// 04 · DATA · KPI + chart + table
// ============================================================
function BBKPIPanel() {
  return (
    <div style={{ width:'100%', height:'100%', background:'var(--paper)', padding:24, display:'grid', gridTemplateColumns:'1.05fr 1.4fr', gap:16 }}>
      {/* KPIs */}
      <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:18 }}>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <div className="t-micro">KPI tile</div>
          <div className="t-micro">DEFAULT · INK · EMPTY · SKELETON</div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:14 }}>
          <KPI label="Menciones · 60d" value="2.418" delta="+12,4%" up spark/>
          <KPI label="Share of voice" value="68%" tone="ink" bar={68}/>
          <KPI label="Sin datos" empty/>
          <KPI skeleton/>
        </div>
      </div>
      {/* Chart */}
      <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:18 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div className="t-h3">Volumen por competidor</div>
            <div className="t-micro" style={{ marginTop:4 }}>menciones · marzo–abril 2026</div>
          </div>
          <div style={{ display:'flex', border:'1px solid var(--n200)', borderRadius:'var(--r-sm)', overflow:'hidden' }}>
            {['7d','30d','60d','YTD'].map((r,i)=>(
              <div key={r} style={{ padding:'5px 10px', fontSize:11, fontFamily:'var(--font-mono)', background: i===2?'var(--n900)':'#fff', color: i===2?'#fff':'var(--n700)', borderLeft: i?'1px solid var(--n200)':'none' }}>{r}</div>
            ))}
          </div>
        </div>
        <BBBarChart/>
        <div style={{ display:'flex', gap:14, marginTop:8 }}>
          {[['Avianca', 'var(--n900)'], ['LATAM','var(--n700)'], ['Wingo','var(--n500)'], ['Arajet','var(--n300)'], ['Copa', 'var(--sa-base)']].map(([n,c]) => (
            <div key={n} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--n700)' }}>
              <span style={{ width:9, height:9, background:c, borderRadius:1 }}/>{n}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, delta, up, spark, bar, tone, empty, skeleton }) {
  const ink = tone==='ink';
  if (skeleton) return (
    <div style={{ height:108, padding:14, border:'1px solid var(--n200)', borderRadius:'var(--r-sm)', display:'flex', flexDirection:'column', gap:8, justifyContent:'center' }}>
      <Skel w="40%" h={10}/><Skel w="65%" h={20}/>
    </div>
  );
  if (empty) return (
    <div style={{ height:108, padding:14, border:'1px dashed var(--n300)', borderRadius:'var(--r-sm)' }}>
      <div className="t-micro" style={{ color:'var(--n500)' }}>— SIN DATOS —</div>
      <div style={{ height:10, marginTop:10, background:'var(--n100)', borderRadius:2 }}/>
      <div style={{ height:8, marginTop:6, width:'40%', background:'var(--n100)', borderRadius:2 }}/>
      <div className="t-small" style={{ color:'var(--n500)', marginTop:14 }}>Sin menciones para el rango.</div>
    </div>
  );
  return (
    <div style={{ height:108, padding:14, border: ink?'none':'1px solid var(--n200)', borderRadius:'var(--r-sm)', background: ink?'var(--n900)':'#fff', color: ink?'#fff':'var(--n900)', position:'relative', overflow:'hidden' }}>
      <div className="t-micro" style={{ color: ink?'rgba(255,255,255,.6)':'var(--n500)' }}>{label}</div>
      <div style={{ fontFamily:'var(--font-mono)', fontSize:30, fontWeight:500, marginTop:6, letterSpacing:'-0.01em' }}>{value}</div>
      {delta && <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:6, fontSize:12, color: up?'var(--success)':'var(--danger)' }}>
        {up?<Ic.trend s={10}/>:<Ic.trendDown s={10}/>}
        <span style={{ fontFamily:'var(--font-mono)' }}>{delta}</span>
      </div>}
      {spark && <svg width="80" height="22" viewBox="0 0 80 22" style={{ position:'absolute', right:14, bottom:14 }}><polyline fill="none" stroke="var(--success)" strokeWidth="1.4" points="0,16 10,14 20,16 30,11 40,12 50,8 60,9 70,5 80,6"/></svg>}
      {bar!=null && <div style={{ height:6, marginTop:14, background:'rgba(255,255,255,.18)', borderRadius:3 }}><div style={{ width:`${bar}%`, height:'100%', background:'#fff', borderRadius:3 }}/></div>}
    </div>
  );
}

function BBBarChart() {
  // 12 months · 5 stacked series; sangría layer (Copa, the client) sits on top.
  const months = ['M','A','M','J','J','A','S','O','N','D','E','F'];
  const data = months.map((_,i) => ({
    avianca: 60+i*4 + (i%3)*8,
    latam:   28+i*2 + ((i+1)%4)*4,
    wingo:   18+(i%5)*3,
    arajet:  10+(i%4)*3,
    copa:    34 + (i>=8 ? i*3 : 4),
  }));
  const max = Math.max(...data.map(d => d.avianca+d.latam+d.wingo+d.arajet+d.copa));
  return (
    <div style={{ marginTop:14, display:'flex', alignItems:'flex-end', gap:8, height:200, paddingLeft:36, position:'relative' }}>
      {/* y-axis */}
      <div style={{ position:'absolute', left:0, top:0, bottom:18, width:30, display:'flex', flexDirection:'column', justifyContent:'space-between', fontFamily:'var(--font-mono)', fontSize:10, color:'var(--n500)', textAlign:'right' }}>
        <span>500</span><span>375</span><span>250</span><span>125</span><span>0</span>
      </div>
      {/* gridlines */}
      <div style={{ position:'absolute', left:36, right:0, top:0, bottom:18, display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
        {[0,1,2,3,4].map(i => <div key={i} style={{ borderTop:'1px dashed var(--n200)', height:0 }}/>)}
      </div>
      {data.map((d,i) => {
        const total = d.avianca+d.latam+d.wingo+d.arajet+d.copa;
        const h = (total/max)*180;
        return (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4, zIndex:1 }}>
            <div style={{ width:'100%', height:h, display:'flex', flexDirection:'column-reverse', borderRadius:'2px 2px 0 0', overflow:'hidden' }}>
              <div style={{ height:`${(d.avianca/total)*100}%`, background:'var(--n900)' }}/>
              <div style={{ height:`${(d.latam/total)*100}%`, background:'var(--n700)' }}/>
              <div style={{ height:`${(d.wingo/total)*100}%`, background:'var(--n500)' }}/>
              <div style={{ height:`${(d.arajet/total)*100}%`, background:'var(--n300)' }}/>
              <div style={{ height:`${(d.copa/total)*100}%`, background:'var(--sa-base)' }}/>
            </div>
            <div style={{ fontSize:10, color:'var(--n500)', fontFamily:'var(--font-mono)' }}>{months[i]}</div>
          </div>
        );
      })}
    </div>
  );
}

function BBTable() {
  const rows = [
    ['Avianca', 'avianca', 998, 412, '41,3 %', 'pos', 'activo'],
    ['LATAM Colombia', 'latamcol', 581, 264, '24,0 %', 'mix', 'activo'],
    ['Wingo', 'wingo.col', 312, 198, '12,9 %', 'pos', 'activo'],
    ['Arajet', 'arajet', 287, 142, '11,9 %', 'neu', 'revisión'],
    ['Copa Airlines', 'copaairlines', 240, 188, '9,9 %', 'pos', 'activo'],
  ];
  return (
    <div style={{ width:'100%', height:'100%', background:'var(--paper)', padding:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:14 }}>
        <div className="t-h2">Tabla densa</div>
        <div className="t-micro">PRESENTABLE · DENSE · EDITABLE · TOTALS</div>
      </div>
      <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', padding:'10px 16px', borderBottom:'1px solid var(--n200)', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', border:'1px solid var(--n200)', borderRadius:'var(--r-sm)', padding:'4px 10px', flex:'0 0 240px' }}>
            <Ic.search s={11}/>
            <span style={{ fontSize:12, color:'var(--n500)', marginLeft:8 }}>Buscar competidor…</span>
          </div>
          <Btn kind="ghost" size="sm" icon={<Ic.filter s={11}/>}>Filtros · 2</Btn>
          <div style={{ flex:1 }}/>
          <span className="t-micro" style={{ color:'var(--n500)' }}>5 de 5 · seleccionados 0</span>
          <Btn kind="secondary" size="sm" icon={<Ic.download s={11}/>}>Exportar CSV</Btn>
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:'var(--n50)', color:'var(--n500)' }}>
              {['', 'Competidor','Handle principal','Menciones','Engagement','SOV','Sentimiento','Estado',''].map((h,i) => (
                <th key={i} style={{ padding:'8px 16px', textAlign: i>=3 && i<=5?'right':'left', fontWeight:500, fontSize:11, letterSpacing:'.06em', textTransform:'uppercase', borderBottom:'1px solid var(--n200)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i) => (
              <tr key={r[0]} style={{ borderBottom:'1px solid var(--n100)' }}>
                <td style={{ padding:'10px 16px', width:24 }}><input type="checkbox" style={{ accentColor:'var(--sa-base)' }} readOnly/></td>
                <td style={{ padding:'10px 16px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ width:24, height:24, borderRadius:'50%', background:'var(--n200)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:600, color:'var(--n700)' }}>{r[0][0]}</span>
                    <span style={{ fontWeight:500 }}>{r[0]}</span>
                  </div>
                </td>
                <td style={{ padding:'10px 16px', fontFamily:'var(--font-mono)', fontSize:12, color:'var(--n600)' }}>@{r[1]}</td>
                <td style={{ padding:'10px 16px', textAlign:'right', fontFamily:'var(--font-mono)' }}>{r[2]}</td>
                <td style={{ padding:'10px 16px', textAlign:'right', fontFamily:'var(--font-mono)' }}>{r[3]}</td>
                <td style={{ padding:'10px 16px', textAlign:'right', fontFamily:'var(--font-mono)', fontWeight:500 }}>{r[4]}</td>
                <td style={{ padding:'10px 16px' }}>
                  <SentimentChip kind={r[5]}/>
                </td>
                <td style={{ padding:'10px 16px' }}>
                  <BBBadge tone={r[6]==='activo'?'success':'warn'} size="sm">{r[6]}</BBBadge>
                </td>
                <td style={{ padding:'10px 16px', textAlign:'right', color:'var(--n400)' }}><Ic.more/></td>
              </tr>
            ))}
            <tr style={{ background:'var(--n50)' }}>
              <td colSpan={3} style={{ padding:'10px 16px', fontSize:11, fontFamily:'var(--font-mono)', textTransform:'uppercase', letterSpacing:'.06em', color:'var(--n500)' }}>Totales · 60 días</td>
              <td style={{ padding:'10px 16px', textAlign:'right', fontFamily:'var(--font-mono)', fontWeight:600 }}>2.418</td>
              <td style={{ padding:'10px 16px', textAlign:'right', fontFamily:'var(--font-mono)', fontWeight:600 }}>1.204</td>
              <td style={{ padding:'10px 16px', textAlign:'right', fontFamily:'var(--font-mono)', fontWeight:600 }}>100,0 %</td>
              <td colSpan={3}></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SentimentChip({ kind, label, big }) {
  const map = {
    pos: { c:'var(--success)', t:'positivo' },
    neu: { c:'var(--n500)',    t:'neutro' },
    neg: { c:'var(--danger)',  t:'negativo' },
    mix: { c:'var(--warn)',    t:'mixto' },
  }[kind] || { c:'var(--n500)', t:'—' };
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
      <span style={{ width: big?10:8, height: big?10:8, borderRadius:'50%', background: map.c }}/>
      <span style={{ fontSize: big?12:11, color:'var(--n700)' }}>{label || map.t}</span>
    </span>
  );
}

Object.assign(window, {
  Ic, Btn, BBBadge, Field, Toast, Skel, KPI, SentimentChip,
  BBCover, BBPalette, BBPaletteDark, BBPaletteDataviz,
  BBTypeApp, BBTypeReport,
  BBButtons, BBInputs, BBBadgesTabs, BBStates,
  BBKPIPanel, BBBarChart, BBTable,
});
