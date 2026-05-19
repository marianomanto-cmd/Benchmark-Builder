// screens-mobile.jsx — Mobile-adapted versions of the 7 screens (393pt iPhone)
// Mobile shell = app bar + bottom tab bar; content area is the scrollable middle.

const M = {
  AW: 393, AH: 852, // device CSS dims (IOSDevice defaults)
  appBar: 52, tabs: 64,
  statusBar: 50,    // iOS status bar + dynamic island clearance
};

function MobileShell({ title, badges, subtitle, back=true, kebab=true, activeTab=0, children, padding=true, bg='var(--paper)' }) {
  return (
    <div style={{ width:'100%', height:'100%', background:bg, display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:'var(--font-sans)', paddingTop:M.statusBar }}>
      {/* app bar */}
      <header style={{ height:M.appBar, flexShrink:0, borderBottom:'1px solid var(--n200)', background:'#fff', display:'flex', alignItems:'center', padding:'0 10px', gap:6 }}>
        {back && (
          <button style={{ width:36, height:36, border:'none', background:'transparent', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--n700)' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m8 3-4 4 4 4"/></svg>
          </button>
        )}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:600, color:'var(--n900)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{title}</div>
          {subtitle && <div style={{ fontSize:10, color:'var(--n500)', fontFamily:'var(--font-mono)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{subtitle}</div>}
        </div>
        {badges}
        {kebab && (
          <button style={{ width:36, height:36, border:'none', background:'transparent', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--n700)' }}>
            <Ic.more/>
          </button>
        )}
      </header>
      {/* content */}
      <div style={{ flex:1, overflow:'auto', padding: padding ? '14px 14px 14px' : 0 }}>{children}</div>
      {/* tab bar */}
      <nav style={{ height:M.tabs, flexShrink:0, borderTop:'1px solid var(--n200)', background:'#fff', display:'flex', alignItems:'stretch', paddingBottom:14 }}>
        {[
          ['Resumen', NavIc.grid],
          ['Feed',    NavIc.bell],
          ['Compar.', NavIc.users],
          ['Reportes',NavIc.doc],
          ['Más',     NavIc.cog],
        ].map(([n, Ico], i) => (
          <button key={n} style={{
            flex:1, border:'none', background:'transparent', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3,
            color: i===activeTab ? 'var(--sa-base)' : 'var(--n500)', fontFamily:'var(--font-sans)', cursor:'pointer', padding:'4px 0',
            borderTop: i===activeTab ? '2px solid var(--sa-base)' : '2px solid transparent', marginTop:-1,
          }}>
            {Ico(18)}
            <span style={{ fontSize:10, fontWeight: i===activeTab?500:400 }}>{n}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// ============================================================
// 01 · OVERVIEW · MOBILE
// ============================================================
function MobileOverview() {
  return (
    <MobileShell title="Cartagena · Q2 2026" subtitle="run #042 · hace 12 min" activeTab={0}
      badges={<BBBadge tone="success" size="sm">activo</BBBadge>}
    >
      {/* hero */}
      <div data-screen-label="01 Overview · mobile" style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div>
          <div className="t-micro" style={{ color:'var(--sa-base)' }}>BENCHMARK · 60d · 5 COMPETIDORES</div>
          <h1 style={{ fontSize:24, lineHeight:'28px', fontWeight:600, letterSpacing:'-0.02em', margin:'6px 0 0', textWrap:'balance' }}>
            Cartagena, en el aire <em style={{ fontFamily:'var(--font-serif)', fontWeight:500, fontStyle:'italic', color:'var(--n700)' }}>de cuatro aerolíneas.</em>
          </h1>
          <div style={{ fontSize:12, color:'var(--n600)', marginTop:6 }}>2.418 piezas · 1 mar – 30 abr 2026</div>
        </div>

        {/* KPIs 2×2 */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <KPI label="Menciones" value="2.418" delta="+12,4%" up/>
          <KPI label="Engagement" value="842k" delta="+8,1%" up/>
          <KPI label="SOV · Copa" value="9,9%" tone="ink" bar={9.9}/>
          <KPI label="Ad spend est." value="USD 28k" delta="+34%" up/>
        </div>

        {/* Chart card */}
        <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600 }}>Volumen · competidor</div>
              <div className="t-micro" style={{ marginTop:2 }}>menciones · 12 meses</div>
            </div>
            <span style={{ fontSize:10, fontFamily:'var(--font-mono)', background:'var(--n900)', color:'#fff', padding:'2px 8px', borderRadius:'var(--r-xs)' }}>60d</span>
          </div>
          <div style={{ transform:'scale(.95)', transformOrigin:'left top' }}>
            <BBBarChart/>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:8 }}>
            {[['Avianca','var(--n900)'],['LATAM','var(--n700)'],['Wingo','var(--n500)'],['Arajet','var(--n300)'],['Copa','var(--sa-base)']].map(([n,c]) => (
              <span key={n} style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:10, color:'var(--n700)' }}>
                <span style={{ width:8, height:8, background:c, borderRadius:1 }}/>{n}
              </span>
            ))}
          </div>
        </div>

        {/* Insights */}
        <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:14 }}>
          <div className="t-micro">Insights destacados</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:10 }}>
            <MiniInsightM kind="opp" t="LATAM sin TikTok orgánico" s="38 fuentes · 0,87"/>
            <MiniInsightM kind="thr" t="Avianca duplicó spend en Meta" s="14 fuentes · 0,79"/>
            <MiniInsightM kind="pat" t="Picos jueves 11h" s="62 fuentes · 0,92"/>
          </div>
        </div>

        {/* Competitors list */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
            <div style={{ fontSize:14, fontWeight:600 }}>Competidores</div>
            <span style={{ fontSize:12, color:'var(--sa-base)', fontWeight:500 }}>Ver todos →</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[
              ['Avianca','A','var(--n900)','998','41,3','pos'],
              ['LATAM Colombia','L','var(--n700)','581','24,0','mix'],
              ['Wingo','W','var(--n500)','312','12,9','neu'],
              ['Arajet','J','var(--n400)','287','11,9','neu'],
              ['Copa Airlines','C','var(--sa-base)','240','9,9','pos'],
            ].map((c,i) => (
              <div key={i} style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:'10px 12px', display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:'var(--r-sm)', background:c[2], color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:600 }}>{c[1]}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{c[0]}</div>
                  <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:2 }}>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--n700)' }}>{c[3]} ·</span>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:11, fontWeight:500 }}>{c[4]} %</span>
                    <SentimentChip kind={c[5]}/>
                  </div>
                </div>
                <Ic.arrow s={12}/>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height:8 }}/>
      </div>
    </MobileShell>
  );
}

function MiniInsightM({ kind, t, s }) {
  const c = { opp:'var(--success)', thr:'var(--danger)', pat:'var(--info)', ano:'var(--warn)' }[kind];
  return (
    <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:c, marginTop:6, flexShrink:0 }}/>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:500, color:'var(--n900)', lineHeight:'18px' }}>{t}</div>
        <div style={{ fontSize:10, color:'var(--n500)', fontFamily:'var(--font-mono)', marginTop:2 }}>{s}</div>
      </div>
    </div>
  );
}

// ============================================================
// 02 · LIVE FEED · MOBILE
// ============================================================
function MobileLiveFeed() {
  return (
    <MobileShell title="Live feed" subtitle="Cartagena · Q2 2026" activeTab={1}
      badges={<BBBadge tone="success" size="sm" dot="var(--success)">vivo</BBBadge>}
    >
      <div data-screen-label="02 Live feed · mobile" style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {/* search */}
        <div style={{ display:'flex', alignItems:'center', border:'1px solid var(--n300)', background:'#fff', borderRadius:'var(--r-sm)', padding:'8px 12px', gap:8 }}>
          <Ic.search s={13}/>
          <span style={{ fontSize:13, color:'var(--n500)', flex:1 }}>Buscar mención…</span>
          <button style={{ border:'1px solid var(--n200)', borderRadius:'var(--r-sm)', padding:'4px 10px', background:'var(--n50)', display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:500 }}>
            <Ic.filter s={11}/> 2
          </button>
        </div>

        {/* filter chips */}
        <div style={{ display:'flex', gap:6, overflowX:'auto', margin:'0 -14px', padding:'0 14px' }}>
          {['60 días','Avianca','LATAM','Wingo','Copa','IG','TT','YT','Web','Ads','Pos+Neu'].map((c,i) => (
            <span key={i} style={{ flexShrink:0, fontSize:11, padding:'4px 10px', borderRadius:99, background: i===0?'var(--sa-base)':'var(--n100)', color: i===0?'#fff':'var(--n700)', display:'inline-flex', alignItems:'center', gap:5 }}>
              {c}{i>0 && <Ic.close s={8}/>}
            </span>
          ))}
        </div>

        {/* sort row */}
        <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--n600)' }}>
          <span>Ordenar:</span>
          <span style={{ display:'inline-flex', alignItems:'center', border:'1px solid var(--n300)', borderRadius:'var(--r-sm)', padding:'3px 9px', background:'#fff', gap:5, fontWeight:500, color:'var(--n900)' }}>
            Engagement <Ic.arrowDown s={9}/>
          </span>
          <div style={{ flex:1 }}/>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--n500)' }}>2.418 piezas</span>
        </div>

        {/* card list */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <MentionCard platform="instagram" author="Avianca" handle="avianca" ts="hace 4 h" brand="Avianca"
            body="Cartagena en frecuencia diaria desde Bogotá y Medellín. Conocé los nuevos horarios de mañana ☀️"
            thumbType="photo" sentiment="pos" metrics={[['♡','12,4k'],['💬','284'],['↗','842']]}/>
          <MentionCard platform="meta_ads" author="Avianca" handle="avianca · ad" ts="activo · 12 d" brand="Avianca" isAd
            body="Vuelos a Cartagena desde USD 89. Combiná con Medellín y Santa Marta."
            thumbType="ad" sentiment="pos" metrics={[['€','USD 8–12k'],['👁','1,4M']]}/>
          <MentionCard platform="tiktok" author="LATAM Colombia" handle="latamcol" ts="hace 9 h" brand="LATAM"
            body="POV: tu primera vez en Cartagena. Etiquetá a quien te llevarías 👇 #latamtok"
            thumbType="video" sentiment="pos" metrics={[['▷','1,2M'],['♡','98k']]}/>
          <MentionCard platform="reddit" author="r/ColombiaTravel" handle="u/sanmt" ts="hace 2 d" brand="—"
            body="¿Vale la pena Wingo Bogotá–Cartagena? Compré ida + vuelta a $410k. Cambió 2 veces…"
            sentiment="neg" metrics={[['↑','142'],['💬','38']]}/>
          <MentionCard platform="youtube" author="Wingo" handle="wingo.col" ts="hace 1 d" brand="Wingo"
            body="Vlog · Cartagena en 48h con vuelo Wingo · Costos reales · Tips 2026"
            thumbType="video" sentiment="neu" metrics={[['▷','42k'],['♡','2,1k']]}/>
        </div>
      </div>
    </MobileShell>
  );
}

// ============================================================
// 03 · COMPARATIVA · MOBILE
// ============================================================
function MobileComparativa() {
  // Card-per-row: each metric shows all 5 brands stacked
  const cols = [
    { name:'Avianca', brand:'A', accent:'var(--n900)' },
    { name:'LATAM',   brand:'L', accent:'var(--n700)' },
    { name:'Wingo',   brand:'W', accent:'var(--n500)' },
    { name:'Arajet',  brand:'J', accent:'var(--n400)' },
    { name:'Copa',    brand:'C', accent:'var(--sa-base)', client:true },
  ];
  const rows = [
    { label:'Menciones · 60d',     vals:[998, 581, 312, 287, 240], unit:'' },
    { label:'Engagement',           vals:[412, 264, 198, 142, 188], unit:'k' },
    { label:'Share of voice',       vals:[41.3, 24.0, 12.9, 11.9, 9.9], unit:'%' },
    { label:'Frecuencia · post/sem',vals:[12.4, 7.8, 4.2, 3.8, 3.1], unit:'' },
  ];
  return (
    <MobileShell title="Comparativa" subtitle="5 competidores · 60 días" activeTab={2}>
      <div data-screen-label="03 Comparativa · mobile" style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {/* selector */}
        <div style={{ display:'flex', gap:6, padding:6, background:'var(--n100)', borderRadius:'var(--r-sm)' }}>
          {['Tabla','Métricas','Visual'].map((t,i) => (
            <span key={t} style={{ flex:1, padding:'6px 10px', borderRadius:'var(--r-sm)', textAlign:'center', fontSize:12, fontWeight: i===1?600:500, background: i===1?'#fff':'transparent', boxShadow: i===1?'var(--sh-1)':'none', color: i===1?'var(--n900)':'var(--n600)' }}>{t}</span>
          ))}
        </div>

        {rows.map((r, i) => {
          const maxV = Math.max(...r.vals);
          return (
            <div key={i} style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:12 }}>
              <div className="t-micro">{r.label}</div>
              <div style={{ display:'flex', flexDirection:'column', gap:7, marginTop:10 }}>
                {cols.map((c, j) => (
                  <div key={j} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ width:22, height:22, borderRadius:'var(--r-xs)', background:c.accent, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:600, fontSize:11, flexShrink:0 }}>{c.brand}</span>
                    <span style={{ fontSize:12, color: c.client?'var(--sa-base)':'var(--n800)', fontWeight: c.client?600:500, width:84, flexShrink:0 }}>{c.name}</span>
                    <div style={{ flex:1, height:7, background:'var(--n100)', borderRadius:4, position:'relative' }}>
                      <div style={{ width:`${(r.vals[j]/maxV)*100}%`, height:'100%', background:c.accent, borderRadius:4 }}/>
                    </div>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:12, fontWeight:500, width:46, textAlign:'right' }}>{r.vals[j]}{r.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Sentimientos card */}
        <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:12 }}>
          <div className="t-micro">Sentimiento dominante</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:8, marginTop:10 }}>
            {[['Avianca','A','var(--n900)','pos'],['LATAM','L','var(--n700)','mix'],['Wingo','W','var(--n500)','neu'],['Arajet','J','var(--n400)','neu'],['Copa','C','var(--sa-base)','pos']].map(([n,b,a,s],i) => (
              <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, textAlign:'center' }}>
                <span style={{ width:22, height:22, borderRadius:'var(--r-xs)', background:a, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:600, fontSize:11 }}>{b}</span>
                <span style={{ fontSize:10, color:'var(--n500)' }}>{n}</span>
                <SentimentChip kind={s} label=""/>
              </div>
            ))}
          </div>
        </div>

        <Btn kind="secondary" size="md" icon={<Ic.copy s={12}/>}>Insertar en reporte</Btn>
      </div>
    </MobileShell>
  );
}

// ============================================================
// 04 · GALERÍA · MOBILE
// ============================================================
function MobileGallery() {
  return (
    <MobileShell title="Galería" subtitle="218 orgánico · 84 ads" activeTab={0}>
      <div data-screen-label="04 Galería · mobile" style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {/* segmented tabs */}
        <div style={{ display:'flex', gap:6, padding:6, background:'var(--n100)', borderRadius:'var(--r-sm)' }}>
          <span style={{ flex:1, padding:'7px 10px', borderRadius:'var(--r-sm)', textAlign:'center', fontSize:12, fontWeight:500, background:'#fff', boxShadow:'var(--sh-1)', color:'var(--n900)', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <span style={{ width:8, height:8, background:'var(--organic)', borderRadius:2 }}/> Orgánico · 218
          </span>
          <span style={{ flex:1, padding:'7px 10px', borderRadius:'var(--r-sm)', textAlign:'center', fontSize:12, color:'var(--n600)', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <span style={{ width:8, height:8, background:'var(--ad)', borderRadius:2 }}/> Pagos · 84
          </span>
        </div>

        {/* sort row */}
        <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--n600)' }}>
          <span>Ordenar:</span>
          <span style={{ display:'inline-flex', alignItems:'center', border:'1px solid var(--n300)', borderRadius:'var(--r-sm)', padding:'3px 9px', background:'#fff', gap:5, fontWeight:500, color:'var(--n900)' }}>
            Engagement <Ic.arrowDown s={9}/>
          </span>
          <div style={{ flex:1 }}/>
          <button style={{ border:'none', background:'transparent', color:'var(--sa-base)', fontSize:12, fontWeight:500 }}>Filtros</button>
        </div>

        {/* grouped grid */}
        {[
          { name:'Avianca · 84 piezas', items:[
            ['photo','instagram','sunset reel',['12,4k ♡']],
            ['photo','instagram','crew',['8,2k ♡']],
            ['video','tiktok','recorrido',['480k ▷']],
            ['video','tiktok','POV',['320k ▷']],
          ]},
          { name:'LATAM · 56 piezas', items:[
            ['video','tiktok','POV viaje',['1,2M ▷']],
            ['photo','instagram','mapa',['3,2k ♡']],
            ['photo','facebook','noticia',['820 ↗']],
            ['video','tiktok','duet',['98k ▷']],
          ]},
          { name:'Wingo · 42 piezas', items:[
            ['video','youtube','vlog 48h',['42k ▷']],
            ['photo','instagram','tarifa',['1,4k ♡']],
            ['video','tiktok','prep',['18k ▷']],
            ['photo','instagram','hotel',['2,1k ♡']],
          ]},
        ].map((g,gi) => (
          <div key={gi}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
              <div style={{ fontSize:13, fontWeight:600 }}>{g.name}</div>
              <span style={{ fontSize:11, color:'var(--sa-base)' }}>Ver →</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {g.items.map((it,i) => (
                <MediaThumb key={i} kind={it[0]} platform={it[1]} label={it[2]} metrics={it[3]}/>
              ))}
            </div>
          </div>
        ))}
      </div>
    </MobileShell>
  );
}

// ============================================================
// 05 · RESEARCH PLAN · MOBILE
// ============================================================
function MobileResearchPlan() {
  const sources = [
    ['instagram','Instagram','~840 piezas','USD 0,42', true],
    ['tiktok','TikTok','~412 piezas','USD 0,28', true],
    ['youtube','YouTube','~180 piezas','USD 0,18', true],
    ['x','X / Grok','~280 piezas','USD 0,14', true],
    ['reddit','Reddit','~120 hilos','USD 0,12', true],
    ['web','Web · prensa','~210 artículos','USD 0,42', true],
    ['meta_ads','Meta Ad Library','~84 creativos','USD 0,28', true],
  ];
  return (
    <MobileShell title="Plan de research" subtitle="step 2 / 4" activeTab={0}
      badges={<BBBadge tone="warn" size="sm">pend.</BBBadge>}
    >
      <div data-screen-label="05 ResearchPlan · mobile" style={{ display:'flex', flexDirection:'column', gap:14, paddingBottom:90 }}>
        <div>
          <div className="t-micro" style={{ color:'var(--sa-base)' }}>PLAN PROPUESTO · IA</div>
          <h1 style={{ fontSize:22, lineHeight:'26px', fontWeight:600, letterSpacing:'-0.02em', margin:'6px 0 6px', textWrap:'balance' }}>
            Antes de gastar tokens, mostrámelo.
          </h1>
          <div style={{ fontSize:13, lineHeight:'19px', color:'var(--n600)' }}>
            La IA propone qué scrapear y por qué. Editá fuentes y aprobá antes del run.
          </div>
        </div>

        <div className="t-micro">7 PLATAFORMAS PROPUESTAS</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {sources.map((s, i) => (
            <div key={i} style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:'10px 12px', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ width:18, height:18, borderRadius:3, border:`1px solid ${s[4]?'var(--sa-base)':'var(--n300)'}`, background: s[4]?'var(--sa-base)':'#fff', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', flexShrink:0 }}>
                {s[4] && <Ic.check s={11}/>}
              </span>
              <PlatformBadge platform={s[0]} size="md"/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:500 }}>{s[1]}</div>
                <div style={{ fontSize:10, color:'var(--n500)', fontFamily:'var(--font-mono)' }}>{s[2]}</div>
              </div>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:11, fontWeight:500 }}>{s[3]}</span>
            </div>
          ))}
        </div>

        <div style={{ background:'var(--n50)', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:12 }}>
          <div className="t-micro">PARÁMETROS</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginTop:8 }}>
            <ParamRowM k="Período" v="60 días"/>
            <ParamRowM k="Idioma" v="es · en"/>
            <ParamRowM k="Geo" v="CO · PA · US"/>
            <ParamRowM k="Min. menc." v="≥ 3"/>
          </div>
        </div>

        <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:12 }}>
          <div className="t-micro">RAZONAMIENTO IA</div>
          <p style={{ margin:'8px 0 0', fontSize:12, lineHeight:'18px', color:'var(--n700)' }}>
            Cubrimos donde concentran volumen orgánico (IG, TT, YT), donde se discute la marca sin filtro (Reddit) y donde la inversión paga es decisiva (Meta Ad Library). Excluí LinkedIn y Pinterest · volumen marginal para turismo LATAM.
          </p>
        </div>
      </div>
      {/* sticky CTA — sits above the tab bar */}
      <div style={{ position:'sticky', bottom:0, marginTop:-90, padding:14, background:'#fff', borderTop:'1px solid var(--n200)', display:'flex', alignItems:'center', gap:10, zIndex:5 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:10, color:'var(--n500)', fontFamily:'var(--font-mono)', letterSpacing:'.08em', textTransform:'uppercase' }}>COSTO ESTIMADO</div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:18, fontWeight:600 }}>USD 1,84</div>
        </div>
        <Btn kind="accent" size="md" iconRight={<Ic.bolt s={12}/>}>Aprobar</Btn>
      </div>
    </MobileShell>
  );
}
function ParamRowM({ k, v }) {
  return (
    <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-sm)', padding:'7px 10px' }}>
      <div style={{ fontSize:9, color:'var(--n500)', fontFamily:'var(--font-mono)', textTransform:'uppercase', letterSpacing:'.06em' }}>{k}</div>
      <div style={{ fontSize:12, fontWeight:500, fontFamily:'var(--font-mono)', marginTop:1 }}>{v}</div>
    </div>
  );
}

// ============================================================
// 06 · EDITOR · MOBILE (view-only · "edit on desktop")
// ============================================================
function MobileEditor() {
  return (
    <MobileShell title="Cartagena Q2 · v3" subtitle="14 páginas · autoguardado" activeTab={3}
      badges={<BBBadge tone="info" size="sm">borrador</BBBadge>}
    >
      <div data-screen-label="06 Editor · mobile" style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {/* desktop notice */}
        <div style={{ background:'var(--sa-soft)', border:'1px solid var(--sa-base)', borderRadius:'var(--r-md)', padding:12, display:'flex', gap:10 }}>
          <span style={{ width:24, height:24, borderRadius:'50%', background:'var(--sa-base)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Ic.alert s={12}/>
          </span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--sa-strong)' }}>Editor disponible en desktop</div>
            <div style={{ fontSize:12, color:'var(--sa-strong)', marginTop:2, lineHeight:'17px' }}>Acá podés previsualizar páginas y exportar. Para editar bloques abrí el proyecto en escritorio.</div>
          </div>
        </div>

        {/* page list */}
        <div className="t-micro">ÍNDICE · 14 PÁGINAS</div>
        <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', overflow:'hidden' }}>
          {[
            ['Portada', 1],
            ['Resumen ejecutivo', 2],
            ['Metodología', 3],
            ['Volumen y SOV', 4, true],
            ['Avianca', 5],
            ['LATAM', 6],
            ['Wingo', 7],
            ['Arajet', 8],
            ['Copa', 9],
          ].map(([n,p,active], i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderTop: i?'1px solid var(--n100)':'none', background: active?'var(--n50)':'transparent', borderLeft: active?'3px solid var(--sa-base)':'3px solid transparent', paddingLeft: active?11:14 }}>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--n400)', width:24 }}>{String(p).padStart(2,'0')}</span>
              <span style={{ fontSize:13, fontWeight: active?600:400, flex:1 }}>{n}</span>
              <Ic.arrow s={11}/>
            </div>
          ))}
        </div>

        {/* preview thumb */}
        <div>
          <div className="t-micro" style={{ marginBottom:8 }}>PREVIEW · PÁGINA 04</div>
          <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-sm)', padding:'18px 20px', boxShadow:'var(--sh-2)' }}>
            <div style={{ fontSize:9, fontFamily:'var(--font-mono)', color:'var(--sa-base)', letterSpacing:'.12em', textTransform:'uppercase', fontWeight:600 }}>SECCIÓN 04</div>
            <div style={{ fontFamily:'var(--font-serif)', fontSize:24, lineHeight:'28px', fontWeight:500, letterSpacing:'-0.02em', margin:'8px 0 10px', color:'var(--n900)', textWrap:'balance' }}>
              Volumen y share of voice
            </div>
            <p style={{ fontFamily:'var(--font-serif)', fontSize:13, lineHeight:'19px', color:'var(--n800)', margin:'0 0 10px', textWrap:'pretty' }}>
              Entre el 1 de marzo y el 30 de abril, las cinco aerolíneas produjeron <span style={{ fontFamily:'var(--font-mono)', fontSize:12 }}>2.418</span> piezas. <em>Avianca</em> concentra el <span style={{ background:'var(--sa-soft)', padding:'1px 4px', fontFamily:'var(--font-mono)', fontSize:12, color:'var(--sa-strong)' }}>41,3 %</span>…
            </p>
            <div style={{ transform:'scale(.65)', transformOrigin:'left top', width:'154%', height:120, overflow:'hidden' }}>
              <BBBarChart/>
            </div>
          </div>
        </div>

        <div style={{ display:'flex', gap:8 }}>
          <Btn kind="secondary" size="md" icon={<Ic.eye s={12}/>} style={{ flex:1 }}>Vista previa</Btn>
          <Btn kind="accent" size="md" icon={<Ic.download s={12}/>} style={{ flex:1 }}>PDF</Btn>
        </div>
      </div>
    </MobileShell>
  );
}

// ============================================================
// 07 · REPORT PDF · MOBILE (read view, scaled to fit)
// ============================================================
function MobileReportPDF() {
  return (
    <MobileShell title="Cartagena Q2 2026" subtitle="reporte · 14 pág" kebab activeTab={3} padding={false} bg="var(--n100)">
      <div data-screen-label="07 Report PDF · mobile" style={{ padding:'10px 0', display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
        {/* page badge */}
        <div style={{ display:'flex', gap:6, padding:'6px 12px', background:'#fff', borderRadius:99, boxShadow:'var(--sh-1)', alignItems:'center' }}>
          <Ic.arrowDown s={10}/>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:11, fontWeight:500 }}>página 04 / 14</span>
          <span style={{ width:1, height:12, background:'var(--n200)' }}/>
          <button style={{ border:'none', background:'transparent', fontSize:11, color:'var(--sa-base)', fontWeight:500 }}>Índice</button>
        </div>

        {/* page sheet · scaled */}
        <div style={{ width:340, transform:'scale(1)', background:'#fff', boxShadow:'var(--sh-3)', padding:'36px 32px', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:14, left:32, right:32, display:'flex', justifyContent:'space-between', fontSize:7, color:'var(--n500)', fontFamily:'var(--font-mono)', letterSpacing:'.08em', textTransform:'uppercase' }}>
            <span>BB · Cartagena Q2 2026</span>
            <span>04 / 14</span>
          </div>
          <div style={{ position:'absolute', top:14, left:32, width:3, height:14, background:'var(--sa-base)' }}/>
          <div style={{ fontSize:8, fontFamily:'var(--font-mono)', color:'var(--sa-base)', letterSpacing:'.12em', textTransform:'uppercase', fontWeight:600, marginTop:8 }}>SECCIÓN 04 · VOLUMEN Y SOV</div>
          <h1 style={{ fontFamily:'var(--font-serif)', fontSize:26, lineHeight:'30px', fontWeight:500, letterSpacing:'-0.025em', margin:'10px 0 8px', textWrap:'balance' }}>
            Cartagena, en el aire <em style={{ fontStyle:'italic', color:'var(--n700)' }}>de cuatro aerolíneas.</em>
          </h1>
          <div style={{ fontSize:9, fontFamily:'var(--font-mono)', color:'var(--n500)', marginBottom:12 }}>
            1 mar – 30 abr 2026 · 5 competidores · 2.418 menciones
          </div>

          <p style={{ fontFamily:'var(--font-serif)', fontSize:11, lineHeight:'17px', margin:'0 0 10px', textWrap:'pretty', color:'var(--n900)' }}>
            Entre el 1 de marzo y el 30 de abril, las cinco aerolíneas produjeron <span style={{ fontFamily:'var(--font-mono)', fontSize:10 }}>2.418</span> piezas relacionadas a Cartagena. <em>Avianca</em> concentra el <b style={{ color:'var(--sa-base)' }}>41,3 %</b> del volumen, seguida por LATAM (24 %) y Wingo (12,9 %).
          </p>

          <div style={{ borderTop:'1px solid var(--n200)', borderBottom:'1px solid var(--n200)', padding:'10px 0', margin:'8px 0' }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:8, fontFamily:'var(--font-mono)', textTransform:'uppercase', letterSpacing:'.08em', color:'var(--n500)', marginBottom:4 }}>
              <span>FIG. 4.1</span><span>run #042</span>
            </div>
            <div style={{ fontSize:12, fontWeight:500, marginBottom:6, fontFamily:'var(--font-serif)' }}>Volumen mensual por competidor</div>
            <div style={{ transform:'scale(.85)', transformOrigin:'left top', width:'118%' }}>
              <BBBarChart/>
            </div>
          </div>

          <div style={{ borderLeft:'2px solid var(--sa-base)', padding:'2px 0 2px 10px', margin:'10px 0' }}>
            <div style={{ fontSize:7, fontFamily:'var(--font-mono)', color:'var(--sa-base)', letterSpacing:'.1em', textTransform:'uppercase', fontWeight:600 }}>HALLAZGO · 4.1</div>
            <div style={{ fontFamily:'var(--font-serif)', fontSize:14, lineHeight:'19px', fontWeight:500, marginTop:4, letterSpacing:'-0.01em', textWrap:'balance' }}>
              El volumen de Avianca casi cuadruplica al de Copa, pero su <em>engagement</em> por pieza es sólo 1,8 × más alto.
            </div>
          </div>

          <div style={{ position:'absolute', bottom:14, left:32, right:32, display:'flex', justifyContent:'space-between', fontSize:7, color:'var(--n400)', fontFamily:'var(--font-mono)', letterSpacing:'.08em', textTransform:'uppercase' }}>
            <span>Copa Airlines · interno</span><span>Benchmark Builder</span>
          </div>
        </div>

        {/* nav controls */}
        <div style={{ display:'flex', gap:8, padding:'4px 14px', width:'100%' }}>
          <Btn kind="secondary" size="md" style={{ flex:1 }}>← Anterior</Btn>
          <Btn kind="accent" size="md" iconRight={<Ic.arrow s={11}/>} style={{ flex:1 }}>Siguiente</Btn>
        </div>

        <div style={{ display:'flex', gap:8, padding:'0 14px 14px', width:'100%' }}>
          <Btn kind="ghost" size="md" icon={<Ic.download s={12}/>} style={{ flex:1 }}>Descargar PDF</Btn>
          <Btn kind="ghost" size="md" icon={<Ic.copy s={12}/>} style={{ flex:1 }}>Compartir</Btn>
        </div>
      </div>
    </MobileShell>
  );
}

Object.assign(window, {
  MobileShell, MobileOverview, MobileLiveFeed, MobileComparativa, MobileGallery,
  MobileResearchPlan, MobileEditor, MobileReportPDF,
});
