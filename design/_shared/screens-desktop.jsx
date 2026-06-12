// bb-mockups.jsx — High-fidelity screens
const { useState: useSt } = React;

// ============================================================
// 07.1 OVERVIEW
// ============================================================
function ScreenShell({ children, dark, title, breadcrumb, badges, runMeta }) {
  const colors = dark ? { bg:'#0e0c09', sb:'#0e0c09', tb:'#0e0c09', border:'#2a241c', text:'#ddd6c7', muted:'#847a68', panel:'#1a1612' }
                      : { bg:'var(--paper)', sb:'#181410', tb:'#fff', border:'var(--n200)', text:'var(--n900)', muted:'var(--n500)', panel:'#fff' };
  return (
    <div style={{ width:'100%', height:'100%', display:'flex', background:colors.bg, color:colors.text, overflow:'hidden' }}>
      {/* sidebar compact */}
      <aside style={{ width:64, background:colors.sb, borderRight:`1px solid ${colors.border}`, display:'flex', flexDirection:'column', alignItems:'center', padding:'14px 0', gap:6, position:'relative' }}>
        <div style={{ position:'absolute', top:0, bottom:0, left:0, width:2, background:'var(--sa-base)' }}/>
        <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--sa-base)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', marginBottom:8 }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:'#fff' }}/>
        </div>
        {[NavIc.grid, NavIc.folder, NavIc.users, NavIc.doc, NavIc.bulb, NavIc.bell].map((Ic, i) => (
          <span key={i} style={{ width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'var(--r-sm)', color: i===1?'#fff':'#847a68', background: i===1?'#2a241c':'transparent', borderLeft: i===1?'2px solid var(--sa-base)':'2px solid transparent', marginLeft: i===1?-2:0 }}>{Ic(15)}</span>
        ))}
        <div style={{ flex:1 }}/>
        <span style={{ width:28, height:28, borderRadius:'50%', background:'var(--n400)' }}/>
      </aside>
      <main style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <header style={{ height:56, background:colors.tb, borderBottom:`1px solid ${colors.border}`, display:'flex', alignItems:'center', padding:'0 24px', gap:12, flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, minWidth:0 }}>
            {breadcrumb.map((b,i) => (
              <React.Fragment key={i}>
                <span style={{ color: i===breadcrumb.length-1 ? colors.text : colors.muted, fontWeight: i===breadcrumb.length-1?500:400 }}>{b}</span>
                {i<breadcrumb.length-1 && <span style={{ color: dark?'#3d352a':'var(--n300)' }}>/</span>}
              </React.Fragment>
            ))}
            {badges}
            {runMeta && <span style={{ color: dark?'#635a4b':'var(--n400)', fontFamily:'var(--font-mono)', fontSize:11, marginLeft:6 }}>· {runMeta}</span>}
          </div>
          <div style={{ flex:1 }}/>
          <div style={{ display:'flex', alignItems:'center', border:`1px solid ${colors.border}`, borderRadius:'var(--r-sm)', padding:'4px 10px', background: dark?'#1a1612':'var(--n50)', width:280 }}>
            <span style={{ color: dark?'#635a4b':'var(--n400)' }}><Ic.search s={12}/></span>
            <span style={{ marginLeft:8, fontSize:12, color:dark?'#635a4b':'var(--n500)' }}>Buscar…</span>
            <span style={{ marginLeft:'auto', fontSize:10, fontFamily:'var(--font-mono)', color: dark?'#635a4b':'var(--n400)', padding:'1px 5px', border:`1px solid ${colors.border}`, borderRadius:3 }}>⌘K</span>
          </div>
          <Btn kind="ghost" size="sm" icon={<Ic.presentation s={12}/>}>Presentación</Btn>
          <Btn kind="primary" size="sm" icon={<Ic.bolt s={11}/>}>Nuevo run</Btn>
        </header>
        <div style={{ flex:1, overflow:'auto', padding:24 }}>{children}</div>
      </main>
    </div>
  );
}

function BBOverview() {
  return (
    <ScreenShell
      breadcrumb={['Proyectos','Cartagena · Q2 2026']}
      badges={<><BBBadge tone="success" size="sm">activo</BBBadge><BBBadge tone="accent" size="sm">v2.3</BBBadge></>}
      runMeta="run #042 · hace 12 min · USD 1,84"
    >
      {/* Tabs */}
      <div style={{ display:'flex', gap:24, borderBottom:'1px solid var(--n200)', marginBottom:20 }}>
        {['Overview','Setup','Runs · 4','Live feed','Competidores','Reportes · 2'].map((t,i) => (
          <div key={t} style={{
            padding:'8px 0', fontSize:13, fontWeight: i===0?500:400, color: i===0?'var(--n900)':'var(--n600)',
            borderBottom: i===0 ? '2px solid var(--sa-base)' : '2px solid transparent', marginBottom:-1,
          }}>{t}</div>
        ))}
        <div style={{ flex:1 }}/>
        <Btn kind="ghost" size="sm" icon={<Ic.copy s={11}/>}>Duplicar proyecto</Btn>
      </div>

      {/* Hero header */}
      <div style={{ display:'flex', alignItems:'flex-end', gap:20, marginBottom:20 }}>
        <div style={{ flex:1 }}>
          <div className="t-micro" style={{ color:'var(--sa-base)' }}>BENCHMARK · 60 DÍAS · 5 COMPETIDORES</div>
          <h1 className="t-display" style={{ marginTop:8, marginBottom:6, fontSize:44, lineHeight:'48px', letterSpacing:'-0.025em' }}>Cartagena, en el aire <em style={{ fontFamily:'var(--font-serif)', fontWeight:500, fontStyle:'italic', color:'var(--n700)' }}>de cuatro aerolíneas.</em></h1>
          <div className="t-body" style={{ color:'var(--n600)', maxWidth:640 }}>2.418 piezas analizadas entre el 1 de marzo y el 30 de abril de 2026 · IG · TT · YT · X · Reddit · Web · Meta Ads.</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Btn kind="secondary" icon={<Ic.download s={12}/>}>PDF</Btn>
          <Btn kind="accent" iconRight={<Ic.arrow s={12}/>}>Generar reporte</Btn>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14, marginBottom:18 }}>
        <KPI label="Menciones · 60d" value="2.418" delta="+12,4%" up spark/>
        <KPI label="Engagement total" value="842k" delta="+8,1%" up spark/>
        <KPI label="Share of voice · cliente" value="9,9%" tone="ink" bar={9.9}/>
        <KPI label="Inversión paga estimada" value="USD 28k" delta="+34%" up spark/>
      </div>

      {/* Body grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:14 }}>
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

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:16 }}>
            <div className="t-micro">Insights destacados</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:10 }}>
              <MiniInsight kind="opp" t="LATAM no usa TikTok orgánico" s="38 fuentes · 0,87"/>
              <MiniInsight kind="thr" t="Avianca duplicó spend en Meta" s="14 fuentes · 0,79"/>
              <MiniInsight kind="pat" t="Picos jueves 11h" s="62 fuentes · 0,92"/>
            </div>
          </div>
          <CostMeter used={42.18} soft={50} hard={75} period="run #042"/>
        </div>
      </div>

      {/* Competitor cards strip */}
      <div style={{ marginTop:18 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 }}>
          <div className="t-h3">Competidores</div>
          <a style={{ fontSize:12, color:'var(--sa-base)', fontWeight:500 }}>Ver todos →</a>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:12 }}>
          {[
            ['Avianca','avianca','A','var(--n900)',['instagram','tiktok','youtube','x','meta_ads'],'998','41,3','pos'],
            ['LATAM Colombia','latamcol','L','var(--n700)',['instagram','facebook','x','meta_ads'],'581','24,0','mix'],
            ['Wingo','wingo.col','W','var(--n500)',['instagram','tiktok','facebook'],'312','12,9','neu'],
            ['Arajet','arajetdom','J','var(--n400)',['instagram','x','web'],'287','11,9','neu'],
            ['Copa Airlines','copaairlines','C','var(--sa-base)',['instagram','youtube','x','meta_ads'],'240','9,9','pos'],
          ].map((c,i) => (
            <CompetitorCard key={i} name={c[0]} handle={c[1]} brand={c[2]} accent={c[3]} platforms={c[4]} mentions={c[5]} sov={c[6]} sent={c[7]}
              sparkData={Array.from({length:14},(_,j) => Math.sin(j*0.7+i)*8+12+j*1.2)}/>
          ))}
        </div>
      </div>
    </ScreenShell>
  );
}

function MiniInsight({ kind, t, s }) {
  const c = { opp:'var(--success)', thr:'var(--danger)', pat:'var(--info)', ano:'var(--warn)' }[kind];
  return (
    <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:c, marginTop:7, flexShrink:0 }}/>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:500, color:'var(--n900)', lineHeight:'18px' }}>{t}</div>
        <div style={{ fontSize:11, color:'var(--n500)', fontFamily:'var(--font-mono)', marginTop:2 }}>{s}</div>
      </div>
    </div>
  );
}

// ============================================================
// 07.2 LIVE FEED
// ============================================================
function BBLiveFeed() {
  return (
    <ScreenShell
      breadcrumb={['Proyectos','Cartagena · Q2 2026','Live feed']}
      badges={<BBBadge tone="success" size="sm">activo</BBBadge>}
      runMeta="2.418 menciones · 60 días"
    >
      <div style={{ display:'grid', gridTemplateColumns:'240px 1fr', gap:16, height:'100%' }}>
        {/* Filters */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <FilterGroup title="Competidores" items={[['Avianca',998,true],['LATAM',581,true],['Wingo',312,true],['Arajet',287,false],['Copa',240,true]]}/>
          <FilterGroup title="Plataformas" platforms items={[['Instagram','instagram',842,true],['TikTok','tiktok',412,true],['YouTube','youtube',182,true],['X / Grok','x',281,false],['Reddit','reddit',98,false],['Web','web',208,true],['Meta Ads','meta_ads',395,true]]}/>
          <FilterGroup title="Sentimiento" items={[['Positivo',1402,true],['Neutro',682,true],['Negativo',218,false],['Mixto',116,false]]}/>
          <FilterGroup title="Tipo" items={[['Orgánico',2023,true],['Pago · Meta Ads',395,true]]}/>
          <div style={{ marginTop:'auto' }}>
            <Btn kind="ghost" size="sm">Limpiar filtros</Btn>
          </div>
        </div>

        {/* Feed */}
        <div style={{ display:'flex', flexDirection:'column', gap:14, minHeight:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div className="t-h2">Live feed</div>
            <BBBadge tone="success" size="sm" dot="var(--success)">en vivo</BBBadge>
            <div style={{ flex:1 }}/>
            <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--n600)' }}>Ordenar:
              <span style={{ display:'inline-flex', alignItems:'center', border:'1px solid var(--n300)', borderRadius:'var(--r-sm)', padding:'4px 10px', background:'#fff', gap:6, fontWeight:500 }}>
                <Ic.sort s={11}/> Engagement <Ic.arrowDown s={9}/>
              </span>
            </div>
            <Btn kind="secondary" size="sm" icon={<Ic.download s={11}/>}>CSV</Btn>
          </div>

          {/* Active filter chips */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {['60 días','Avianca','LATAM','Wingo','Copa','IG','TT','YT','Web','Meta Ads','Pos+Neu','Orgánico+Pago'].map((c,i) => (
              <span key={i} style={{ fontSize:11, padding:'3px 9px 3px 9px', borderRadius:99, background:'var(--n100)', color:'var(--n700)', display:'inline-flex', alignItems:'center', gap:6 }}>
                {c}<Ic.close s={8}/>
              </span>
            ))}
          </div>

          {/* Cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12, overflow:'auto', paddingBottom:14 }}>
            <MentionCard platform="instagram" author="Avianca" handle="avianca" ts="hace 4 h" brand="Avianca"
              body="Cartagena en frecuencia diaria desde Bogotá y Medellín. Conocé los nuevos horarios de mañana ☀️"
              thumbType="photo" sentiment="pos" metrics={[['♡','12,4k'],['💬','284'],['↗','842']]}/>
            <MentionCard platform="meta_ads" author="Avianca" handle="avianca · ad" ts="activo · 12 d" brand="Avianca" isAd
              body="Vuelos a Cartagena desde USD 89. Combiná con Medellín y Santa Marta. Reservá hasta el 30/05."
              thumbType="ad" sentiment="pos" metrics={[['€','USD 8–12k'],['👁','est. 1,4M']]}/>
            <MentionCard platform="tiktok" author="LATAM Colombia" handle="latamcol" ts="hace 9 h" brand="LATAM"
              body="POV: tu primera vez en Cartagena. Etiquetá a quien te llevarías 👇 #latamtok"
              thumbType="video" sentiment="pos" metrics={[['▷','1,2M'],['♡','98k'],['💬','3,4k']]}/>
            <MentionCard platform="youtube" author="Wingo" handle="wingo.col" ts="hace 1 d" brand="Wingo"
              body="Vlog · Cartagena en 48h con vuelo Wingo · Costos reales · Tips de viaje 2026"
              thumbType="video" sentiment="neu" metrics={[['▷','42k'],['♡','2,1k']]}/>
            <MentionCard platform="instagram" author="Copa Airlines" handle="copaairlines" ts="hace 18 h" brand="Copa"
              body="Atardecer en Cartagena, vista desde el equipo Copa ✈️ #copaairlines"
              thumbType="photo" sentiment="pos" metrics={[['♡','8,2k'],['💬','142']]}/>
            <MentionCard platform="web" author="El Espectador" handle="elespectador.com" ts="03/05" brand="—"
              body="Avianca, LATAM y Wingo aumentan frecuencia a Cartagena para temporada 2026."
              thumbType="article" sentiment="neu" metrics={[['📄','prensa'],['👁','24k']]}/>
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}

function FilterGroup({ title, items, platforms }) {
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
        <div className="t-micro">{title}</div>
        <span style={{ fontSize:10, color:'var(--n500)', fontFamily:'var(--font-mono)' }}>todos</span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
        {items.map((it, i) => {
          const [name, second, third, on] = platforms ? [it[0], it[1], it[2], it[3]] : [it[0], null, it[1], it[2]];
          const checked = on;
          return (
            <label key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 6px', borderRadius:'var(--r-sm)', background: checked?'var(--n50)':'transparent', cursor:'pointer' }}>
              <span style={{ width:14, height:14, borderRadius:3, border:`1px solid ${checked?'var(--sa-base)':'var(--n300)'}`, background: checked?'var(--sa-base)':'#fff', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>
                {checked && <Ic.check s={9}/>}
              </span>
              {platforms && <PlatformBadge platform={second} size="sm"/>}
              <span style={{ fontSize:12, color:'var(--n800)', flex:1 }}>{name}</span>
              <span style={{ fontSize:11, color:'var(--n500)', fontFamily:'var(--font-mono)' }}>{third}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// 07.3 COMPARATIVA
// ============================================================
function BBComparativa() {
  const cols = [
    { name:'Avianca', brand:'A', accent:'var(--n900)', isClient:false },
    { name:'LATAM',   brand:'L', accent:'var(--n700)', isClient:false },
    { name:'Wingo',   brand:'W', accent:'var(--n500)', isClient:false },
    { name:'Arajet',  brand:'J', accent:'var(--n400)', isClient:false },
    { name:'Copa',    brand:'C', accent:'var(--sa-base)', isClient:true },
  ];
  const rows = [
    { label:'Menciones · 60d', vals:['998','581','312','287','240'], fmt:'mono' },
    { label:'Engagement total', vals:['412k','264k','198k','142k','188k'], fmt:'mono' },
    { label:'Reach estimado', vals:['1,8M','1,1M','680k','420k','520k'], fmt:'mono' },
    { label:'Share of voice', vals:['41,3%','24,0%','12,9%','11,9%','9,9%'], fmt:'bar' },
    { label:'Plataformas activas', vals:[5,4,3,3,4], fmt:'plats' },
    { label:'Sentimiento dominante', vals:['pos','mix','neu','neu','pos'], fmt:'sent' },
    { label:'Inversión paga · est.', vals:['USD 18–28k','USD 10–14k','—','—','USD 5–8k'], fmt:'mono' },
    { label:'Top contenido', vals:['Sunset reel','POV TikTok','Vlog 48h','Tarifa promo','Atardecer post'], fmt:'text' },
    { label:'Frecuencia · post/sem', vals:['12,4','7,8','4,2','3,8','3,1'], fmt:'mono' },
  ];
  const platsByCol = [
    ['instagram','tiktok','youtube','x','meta_ads'],
    ['instagram','facebook','x','meta_ads'],
    ['instagram','tiktok','facebook'],
    ['instagram','x','web'],
    ['instagram','youtube','x','meta_ads'],
  ];
  return (
    <ScreenShell
      breadcrumb={['Proyectos','Cartagena · Q2 2026','Comparativa']}
      badges={null}
      runMeta="5 competidores · vista lado a lado"
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:16 }}>
        <div>
          <div className="t-micro" style={{ color:'var(--sa-base)' }}>COMPARATIVA · LADO A LADO</div>
          <div className="t-h1" style={{ marginTop:6 }}>Una matriz para entender la competencia</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Btn kind="secondary" size="sm" icon={<Ic.download s={11}/>}>CSV</Btn>
          <Btn kind="secondary" size="sm" icon={<Ic.copy s={11}/>}>Insertar en reporte</Btn>
        </div>
      </div>

      <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr>
              <th style={{ padding:'14px 16px', textAlign:'left', fontWeight:500, fontSize:10, letterSpacing:'.08em', textTransform:'uppercase', color:'var(--n500)', fontFamily:'var(--font-mono)', borderBottom:'1px solid var(--n200)', width:200 }}>Métrica</th>
              {cols.map((c,i) => (
                <th key={i} style={{ padding:'14px 16px', borderBottom:'1px solid var(--n200)', borderLeft:'1px solid var(--n200)', background: c.isClient?'var(--sa-soft)':'transparent', textAlign:'left' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:'var(--r-sm)', background:c.accent, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:600, fontSize:13 }}>{c.brand}</div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, color: c.isClient?'var(--sa-strong)':'var(--n900)' }}>{c.name}</div>
                      {c.isClient && <div style={{ fontSize:9, color:'var(--sa-base)', fontFamily:'var(--font-mono)', letterSpacing:'.08em', textTransform:'uppercase', fontWeight:500 }}>· CLIENTE</div>}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i) => (
              <tr key={i}>
                <td style={{ padding:'14px 16px', fontWeight:500, color:'var(--n700)', borderBottom:'1px solid var(--n100)', background:'var(--n50)' }}>{r.label}</td>
                {r.vals.map((v,j) => {
                  const isClient = cols[j].isClient;
                  let cell = v;
                  if (r.fmt === 'mono') cell = <span style={{ fontFamily:'var(--font-mono)', fontSize:15, fontWeight:500 }}>{v}</span>;
                  else if (r.fmt === 'sent') cell = <SentimentChip kind={v} big/>;
                  else if (r.fmt === 'bar') {
                    const num = parseFloat(v);
                    cell = (
                      <div>
                        <div style={{ fontFamily:'var(--font-mono)', fontSize:15, fontWeight:500 }}>{v}</div>
                        <div style={{ height:6, background:'var(--n100)', borderRadius:3, marginTop:6 }}>
                          <div style={{ width:`${num*2}%`, height:'100%', background:cols[j].accent, borderRadius:3 }}/>
                        </div>
                      </div>
                    );
                  } else if (r.fmt === 'plats') {
                    cell = <div style={{ display:'flex', gap:4 }}>{platsByCol[j].map(p => <PlatformBadge key={p} platform={p} size="sm"/>)}</div>;
                  } else if (r.fmt === 'text') {
                    cell = <span style={{ fontSize:12, color:'var(--n700)' }}>{v}</span>;
                  }
                  return (
                    <td key={j} style={{ padding:'14px 16px', borderBottom:'1px solid var(--n100)', borderLeft:'1px solid var(--n200)', background: isClient?'var(--sa-soft)':'transparent' }}>{cell}</td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScreenShell>
  );
}

// ============================================================
// 07.4 GALLERY
// ============================================================
function BBGallery() {
  return (
    <ScreenShell
      breadcrumb={['Proyectos','Cartagena · Q2 2026','Galería']}
      badges={null}
      runMeta="218 piezas orgánicas · 84 anuncios pagos"
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:16 }}>
        <div>
          <div className="t-micro" style={{ color:'var(--sa-base)' }}>GALERÍA · ORGÁNICO VS PAGO</div>
          <div className="t-h1" style={{ marginTop:6 }}>Lo que la competencia muestra y lo que paga por mostrar</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Btn kind="ghost" size="sm" icon={<Ic.filter s={11}/>}>Filtros</Btn>
          <Btn kind="secondary" size="sm" iconRight={<Ic.eye s={11}/>}>Modo presentación</Btn>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
        <GalleryColumn kind="organic"/>
        <GalleryColumn kind="ad"/>
      </div>
    </ScreenShell>
  );
}

function GalleryColumn({ kind }) {
  const isAd = kind==='ad';
  return (
    <div style={{ background: isAd?'var(--sa-soft)':'#fff', border:`1px solid ${isAd?'var(--sa-base)':'var(--n200)'}`, borderRadius:'var(--r-md)', padding:18 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ width:10, height:10, background: isAd?'var(--ad)':'var(--organic)', borderRadius:2 }}/>
            <div className="t-h2" style={{ color: isAd?'var(--sa-strong)':'var(--n900)' }}>{isAd?'Anuncios pagos · Meta Ad Library':'Contenido orgánico'}</div>
          </div>
          <div className="t-small" style={{ color: isAd?'var(--sa-strong)':'var(--n500)', marginTop:4 }}>
            {isAd?'84 creativos activos · USD 18–28k spend estimado':'218 piezas en últimos 60 días'}
          </div>
        </div>
        <div style={{ display:'flex', border:`1px solid ${isAd?'var(--sa-base)':'var(--n300)'}`, borderRadius:'var(--r-sm)', overflow:'hidden', background:'#fff' }}>
          {['Engagement','Reciente','Plataforma'].map((t,i) => (
            <span key={t} style={{ padding:'4px 10px', fontSize:11, fontFamily:'var(--font-mono)', background: i===0?(isAd?'var(--sa-base)':'var(--n900)'):'#fff', color: i===0?'#fff':'var(--n700)', borderLeft: i?'1px solid var(--n200)':'none' }}>{t}</span>
          ))}
        </div>
      </div>

      {/* group by competitor */}
      {(isAd ? [
        { name:'Avianca', count:38, items:[
          ['ad','meta_ads','creativo · 12d',['USD 8–12k','1,4M 👁'], true],
          ['ad','meta_ads','video · 14d',   ['USD 12–18k','1,8M 👁'], true],
          ['ad','meta_ads','carousel · 6d', ['USD 3–5k','410k 👁'],   true],
        ]},
        { name:'LATAM',   count:24, items:[
          ['ad','meta_ads','creativo · 4d', ['USD 4–6k','620k 👁'], true],
          ['ad','meta_ads','video · 8d',    ['USD 6–9k','940k 👁'], true],
          ['ad','meta_ads','static · 2d',   ['USD 1–2k','180k 👁'], true],
        ]},
        { name:'Copa',    count:14, items:[
          ['ad','meta_ads','static · 9d',   ['USD 5–8k','680k 👁'], true],
          ['ad','meta_ads','creativo · 3d', ['USD 2–4k','280k 👁'], true],
          ['ad','meta_ads','video · 5d',    ['USD 3–5k','340k 👁'], true],
        ]},
      ] : [
        { name:'Avianca · 84', count:84, items:[
          ['photo','instagram','sunset reel',  ['12,4k ♡','4 h']],
          ['photo','instagram','crew',         ['8,2k ♡','12 h']],
          ['video','tiktok','recorrido',       ['480k ▷','1 d']],
        ]},
        { name:'LATAM · 56',   count:56, items:[
          ['video','tiktok','POV viaje',       ['1,2M ▷','9 h']],
          ['photo','instagram','mapa',         ['3,2k ♡','2 d']],
          ['photo','facebook','noticia',       ['820 ↗','3 d']],
        ]},
        { name:'Wingo · 42',   count:42, items:[
          ['video','youtube','vlog 48h',       ['42k ▷','1 d']],
          ['photo','instagram','tarifa',       ['1,4k ♡','2 d']],
          ['video','tiktok','duet',            ['98k ▷','3 d']],
        ]},
      ]).map((g,gi) => (
        <div key={gi} style={{ marginBottom:18 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
            <div style={{ fontSize:12, fontWeight:500, color: isAd?'var(--sa-strong)':'var(--n800)' }}>{g.name}</div>
            <span style={{ fontSize:10, fontFamily:'var(--font-mono)', color: isAd?'var(--sa-strong)':'var(--n500)' }}>{g.count} piezas</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8 }}>
            {g.items.map((it,i) => (
              <MediaThumb key={i} kind={it[0]} platform={it[1]} label={it[2]} metrics={it[3]} isAd={it[4]}/>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// 07.5 RESEARCH PLAN REVIEW
// ============================================================
function BBResearchPlan() {
  return (
    <ScreenShell
      breadcrumb={['Proyectos','Cartagena · Q2 2026','Plan de research']}
      badges={<BBBadge tone="warn" size="sm">esperando aprobación</BBBadge>}
      runMeta="generado por IA · costo estimado USD 1,84"
    >
      <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:18 }}>
        <div>
          <div className="t-micro" style={{ color:'var(--sa-base)' }}>STEP 2 / 4 · PLAN PROPUESTO</div>
          <div className="t-h1" style={{ marginTop:6 }}>Antes de gastar tokens, mostrámelo.</div>
          <div className="t-body" style={{ color:'var(--n600)', marginTop:8, maxWidth:540 }}>
            La IA propone qué scrapear, dónde y por qué. Vos editás las fuentes, ajustás filtros y aprobás antes del run.
          </div>

          <div style={{ marginTop:20, background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:18 }}>
            <div className="t-micro">FUENTES PROPUESTAS · 7 PLATAFORMAS</div>
            <div style={{ marginTop:14, display:'flex', flexDirection:'column' }}>
              {[
                ['instagram','Instagram',['avianca','latamcol','wingo.col','arajetdom','copaairlines'],'~840 piezas','USD 0,42'],
                ['tiktok','TikTok',['avianca','latamcol','wingo.col'],'~412 piezas','USD 0,28'],
                ['youtube','YouTube',['avianca','latamcol','wingo.col','copaairlines'],'~180 piezas','USD 0,18'],
                ['x','X / Grok',['avianca','latamcol','arajetdom','copaairlines'],'~280 piezas','USD 0,14'],
                ['reddit','Reddit',['r/Colombia','r/ColombiaTravel','r/Travel'],'~120 hilos','USD 0,12'],
                ['web','Web · prensa',['eltiempo.com','elespectador.com','semana.com','+8'],'~210 artículos','USD 0,42'],
                ['meta_ads','Meta Ad Library',['avianca','latamcol','copaairlines'],'~84 creativos','USD 0,28'],
              ].map((r,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 0', borderTop: i?'1px solid var(--n100)':'none' }}>
                  <span style={{ width:18, height:18, borderRadius:3, border:'1px solid var(--sa-base)', background:'var(--sa-base)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', flexShrink:0 }}><Ic.check s={11}/></span>
                  <PlatformBadge platform={r[0]} size="md"/>
                  <div style={{ flex:'0 0 130px', fontSize:13, fontWeight:500 }}>{r[1]}</div>
                  <div style={{ flex:1, fontSize:11, color:'var(--n500)', fontFamily:'var(--font-mono)' }}>{r[2].slice(0,3).join(' · ')}{r[2].length>3?` +${r[2].length-3}`:''}</div>
                  <div style={{ flex:'0 0 90px', fontSize:11, color:'var(--n700)', fontFamily:'var(--font-mono)' }}>{r[3]}</div>
                  <div style={{ flex:'0 0 70px', fontSize:11, color:'var(--n900)', fontFamily:'var(--font-mono)', textAlign:'right', fontWeight:500 }}>{r[4]}</div>
                  <Btn kind="ghost" size="sm" icon={<Ic.filter s={10}/>}>Editar</Btn>
                </div>
              ))}
            </div>
            <div style={{ marginTop:8, paddingTop:14, borderTop:'1px solid var(--n200)', display:'flex', alignItems:'center', gap:14 }}>
              <span className="t-micro" style={{ color:'var(--n500)' }}>TOTAL ESTIMADO</span>
              <div style={{ flex:1 }}/>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--n500)' }}>~2.126 piezas · 4 min 12 s</span>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:18, fontWeight:600, color:'var(--n900)' }}>USD 1,84</span>
            </div>
          </div>
        </div>

        {/* Reasoning + actions */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:18 }}>
            <div className="t-micro">RAZONAMIENTO · IA</div>
            <div style={{ marginTop:12, fontSize:13, lineHeight:'21px', color:'var(--n700)', textWrap:'pretty' }}>
              <p style={{ margin:0 }}>Para evaluar a Copa contra los principales operadores en la ruta <b>Cartagena</b>, propongo cubrir las plataformas donde concentran su volumen orgánico (Instagram, TikTok, YouTube), donde se discute la marca sin filtro (Reddit) y donde la inversión paga es decisiva en este vertical (Meta Ad Library).</p>
              <p style={{ marginTop:10, marginBottom:0 }}>Excluí <b>LinkedIn</b> y <b>Pinterest</b>: volumen marginal en aerolíneas latinoamericanas para audiencia de turismo. Si querés cubrir B2B, agregalas manualmente.</p>
            </div>
          </div>

          <div style={{ background:'var(--n50)', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:18 }}>
            <div className="t-micro">PARÁMETROS</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:12 }}>
              <ParamRow k="Período" v="60 días"/>
              <ParamRow k="Idioma" v="es · en"/>
              <ParamRow k="Geo" v="CO · PA · US"/>
              <ParamRow k="Min. menciones" v="≥ 3"/>
              <ParamRow k="Filtro spam" v="activado" pos/>
              <ParamRow k="Análisis sentim." v="GPT-4o-mini"/>
            </div>
          </div>

          <div style={{ display:'flex', gap:8 }}>
            <Btn kind="secondary" size="md">Editar plan</Btn>
            <div style={{ flex:1 }}/>
            <Btn kind="ghost" size="md">Cancelar</Btn>
            <Btn kind="accent" size="md" iconRight={<Ic.bolt s={12}/>}>Aprobar y ejecutar</Btn>
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}

function ParamRow({ k, v, pos }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-sm)' }}>
      <span style={{ fontSize:11, color:'var(--n500)', fontFamily:'var(--font-mono)', textTransform:'uppercase', letterSpacing:'.06em' }}>{k}</span>
      <span style={{ fontSize:12, fontWeight:500, color: pos?'var(--success)':'var(--n900)', fontFamily:'var(--font-mono)' }}>{v}</span>
    </div>
  );
}

// ============================================================
// 07.6 EDITOR
// ============================================================
function BBEditor() {
  return (
    <ScreenShell
      breadcrumb={['Proyectos','Cartagena · Q2 2026','Reportes','Cartagena Q2 · v3']}
      badges={<BBBadge tone="info" size="sm">borrador</BBBadge>}
      runMeta="autoguardado hace 4 s"
    >
      <div style={{ display:'grid', gridTemplateColumns:'220px 1fr 280px', gap:14, height:'100%' }}>
        {/* outline */}
        <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:14, overflow:'auto' }}>
          <div className="t-micro">ÍNDICE · 14 PÁGINAS</div>
          <div style={{ marginTop:12, display:'flex', flexDirection:'column' }}>
            {[
              ['Portada', 1, false],
              ['Resumen ejecutivo', 2, false],
              ['Metodología', 3, false],
              ['Volumen y SOV', 4, true],
              ['Avianca', 5, false],
              ['LATAM', 6, false],
              ['Wingo', 7, false],
              ['Arajet', 8, false],
              ['Copa', 9, false],
              ['Galería · orgánico', 10, false],
              ['Galería · ads', 11, false],
              ['Insights', 12, false],
              ['Recomendaciones', 13, false],
              ['Anexo', 14, false],
            ].map(([n,p,active]) => (
              <a key={n} style={{
                display:'flex', alignItems:'center', gap:8, padding:'6px 10px', borderRadius:'var(--r-sm)',
                background: active?'var(--n50)':'transparent', borderLeft: active?'2px solid var(--sa-base)':'2px solid transparent',
                fontSize:12, color: active?'var(--n900)':'var(--n600)', fontWeight: active?500:400,
              }}>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--n400)', width:18 }}>{String(p).padStart(2,'0')}</span>
                <span style={{ flex:1 }}>{n}</span>
              </a>
            ))}
            <div style={{ borderTop:'1px solid var(--n100)', marginTop:8, paddingTop:8 }}>
              <Btn kind="ghost" size="sm" icon={<Ic.plus s={10}/>}>Agregar sección</Btn>
            </div>
          </div>
        </div>

        {/* canvas */}
        <div style={{ background:'var(--n100)', borderRadius:'var(--r-md)', padding:24, overflow:'auto' }}>
          <div style={{ width:680, margin:'0 auto', background:'#fff', boxShadow:'var(--sh-3)', minHeight:'100%', padding:'56px 64px', position:'relative' }}>
            <div style={{ position:'absolute', top:24, left:24, right:24, display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--n400)', fontFamily:'var(--font-mono)' }}>
              <span>BENCHMARK BUILDER · CARTAGENA Q2 2026</span>
              <span>04 / 14</span>
            </div>
            <div style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--sa-base)', letterSpacing:'.1em', textTransform:'uppercase', fontWeight:600 }}>SECCIÓN 04</div>
            <h1 style={{ fontFamily:'var(--font-serif)', fontSize:42, lineHeight:'46px', fontWeight:500, letterSpacing:'-0.025em', margin:'10px 0 18px', color:'var(--n900)', textWrap:'balance' }}>
              Volumen y share of voice
            </h1>
            <p style={{ fontFamily:'var(--font-serif)', fontSize:16, lineHeight:'26px', color:'var(--n800)', textWrap:'pretty', margin:'0 0 18px' }}>
              Entre el 1 de marzo y el 30 de abril, las cinco aerolíneas analizadas produjeron <span style={{ fontFamily:'var(--font-mono)', fontSize:14 }}>2.418</span> piezas relacionadas a Cartagena. <em>Avianca</em> concentra el <span style={{ background:'var(--sa-soft)', padding:'1px 6px', borderRadius:3, fontFamily:'var(--font-mono)', fontSize:14, color:'var(--sa-strong)' }}>41,3 %</span> del volumen total, seguida por LATAM (24 %) y Wingo (12,9 %).
            </p>
            {/* embedded chart card with edit chrome */}
            <div style={{ position:'relative', border:'2px dashed var(--sa-base)', borderRadius:'var(--r-sm)', padding:18, margin:'18px 0', background:'#fffdfa' }}>
              <span style={{ position:'absolute', top:-9, left:14, background:'var(--sa-base)', color:'#fff', fontSize:9, fontFamily:'var(--font-mono)', padding:'2px 7px', letterSpacing:'.08em', borderRadius:2, textTransform:'uppercase' }}>BLOQUE · GRÁFICO · seleccionado</span>
              <span style={{ position:'absolute', top:-30, right:0, display:'flex', gap:4 }}>
                <Btn kind="secondary" size="sm">Reemplazar fuente</Btn>
                <Btn kind="ghost" size="sm" icon={<Ic.copy s={11}/>}>Duplicar</Btn>
                <Btn kind="ghost" size="sm">Eliminar</Btn>
              </span>
              <div style={{ fontFamily:'var(--font-serif)', fontSize:11, color:'var(--n500)', textTransform:'uppercase', letterSpacing:'.08em' }}>FIG. 4.1</div>
              <div style={{ fontFamily:'var(--font-serif)', fontSize:18, fontWeight:500, color:'var(--n900)', marginTop:4 }}>Volumen mensual por competidor</div>
              <BBBarChart/>
            </div>
            <p style={{ fontFamily:'var(--font-serif)', fontSize:16, lineHeight:'26px', color:'var(--n800)', textWrap:'pretty', margin:'0 0 14px' }}>
              Copa, en quinta posición con <span style={{ fontFamily:'var(--font-mono)', fontSize:14 }}>240</span> menciones (9,9 %), opera con un perfil más orgánico que paid: <span style={{ fontFamily:'var(--font-mono)', fontSize:14 }}>78 %</span> del contenido es no-pago, frente al <span style={{ fontFamily:'var(--font-mono)', fontSize:14 }}>62 %</span> de Avianca.
            </p>
            <div style={{ background:'var(--n50)', borderLeft:'3px solid var(--sa-base)', padding:'14px 18px', margin:'18px 0' }}>
              <div className="t-micro" style={{ color:'var(--sa-base)' }}>HALLAZGO · 4.1</div>
              <div style={{ fontFamily:'var(--font-serif)', fontSize:18, lineHeight:'26px', color:'var(--n900)', marginTop:6, textWrap:'balance' }}>
                "El volumen de Avianca casi cuadruplica al de Copa, pero su engagement promedio por pieza es sólo 1,8× más alto."
              </div>
            </div>
          </div>
        </div>

        {/* properties / blocks */}
        <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:14, display:'flex', flexDirection:'column', gap:14, overflow:'auto' }}>
          <div>
            <div className="t-micro">BLOQUE SELECCIONADO</div>
            <div style={{ marginTop:8, padding:'10px 12px', border:'1px solid var(--sa-base)', borderRadius:'var(--r-sm)', background:'var(--sa-soft)' }}>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--sa-strong)' }}>Gráfico · barras apiladas</div>
              <div style={{ fontSize:11, color:'var(--sa-strong)', fontFamily:'var(--font-mono)', marginTop:2 }}>fig. 4.1 · 5 series · 12 meses</div>
            </div>
          </div>
          <div>
            <div className="t-micro">FUENTE DE DATOS</div>
            <div style={{ marginTop:8, padding:'8px 12px', border:'1px solid var(--n200)', borderRadius:'var(--r-sm)', display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:12 }}>run #042</span>
              <span style={{ fontSize:11, color:'var(--n500)', fontFamily:'var(--font-mono)' }}>vigente · 12 min</span>
            </div>
          </div>
          <div>
            <div className="t-micro">PROPIEDADES</div>
            <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:8 }}>
              <PropRow k="Tipo" v="Stacked bars"/>
              <PropRow k="Período" v="60 días"/>
              <PropRow k="Highlight" v="Copa · sangría"/>
              <PropRow k="Mostrar leyenda" v="sí"/>
              <PropRow k="Mostrar ejes" v="sí"/>
            </div>
          </div>
          <div>
            <div className="t-micro">INSERTAR BLOQUE</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginTop:8 }}>
              {['Texto','H2','Cita','Gráfico','Tabla','KPI','Galería','Ranking'].map(b => (
                <button key={b} style={{ padding:'8px 6px', border:'1px solid var(--n200)', background:'#fff', borderRadius:'var(--r-sm)', fontSize:11, color:'var(--n700)', cursor:'pointer' }}>{b}</button>
              ))}
            </div>
          </div>
          <div style={{ marginTop:'auto', display:'flex', flexDirection:'column', gap:8 }}>
            <Btn kind="secondary" size="md" icon={<Ic.eye s={12}/>}>Vista previa</Btn>
            <Btn kind="accent" size="md" icon={<Ic.download s={12}/>}>Exportar PDF</Btn>
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}
function PropRow({ k, v }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 10px', background:'var(--n50)', borderRadius:'var(--r-sm)' }}>
      <span style={{ fontSize:11, color:'var(--n500)' }}>{k}</span>
      <span style={{ fontSize:12, fontWeight:500 }}>{v} <Ic.arrowDown s={8}/></span>
    </div>
  );
}

// ============================================================
// 07.7 REPORT PDF (US Letter portrait)
// ============================================================
function BBReportPDF() {
  return (
    <div style={{ width:'100%', height:'100%', background:'#fff', padding:'72px 88px', position:'relative', fontFamily:'var(--font-serif)', color:'var(--n900)', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:36, left:88, right:88, display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--n500)', fontFamily:'var(--font-mono)', letterSpacing:'.08em', textTransform:'uppercase' }}>
        <span>Benchmark Builder · Cartagena Q2 2026</span>
        <span>04 / 14</span>
      </div>
      <div style={{ position:'absolute', top:36, left:88, width:6, height:24, background:'var(--sa-base)' }}/>

      <div style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--sa-base)', letterSpacing:'.12em', textTransform:'uppercase', fontWeight:600, marginTop:8 }}>SECCIÓN 04 · VOLUMEN Y SOV</div>
      <h1 style={{ fontSize:54, lineHeight:'58px', fontWeight:500, letterSpacing:'-0.03em', margin:'14px 0 10px', textWrap:'balance' }}>
        Cartagena, en el aire <em style={{ fontStyle:'italic', color:'var(--n700)' }}>de cuatro aerolíneas.</em>
      </h1>
      <div style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--n500)', marginBottom:18, letterSpacing:'.04em' }}>
        Período · 1 mar – 30 abr 2026 · 5 competidores · 7 plataformas · 2.418 menciones
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, marginBottom:20 }}>
        <p style={{ fontSize:14, lineHeight:'22px', margin:0, textWrap:'pretty' }}>
          Entre el 1 de marzo y el 30 de abril de 2026, las cinco aerolíneas con presencia activa en la ruta produjeron <span style={{ fontFamily:'var(--font-mono)', fontSize:13 }}>2.418</span> piezas relacionadas a Cartagena. <em>Avianca</em> concentra el <b style={{ color:'var(--sa-base)' }}>41,3 %</b> del volumen total, seguida por LATAM (24 %) y Wingo (12,9 %).
        </p>
        <p style={{ fontSize:14, lineHeight:'22px', margin:0, textWrap:'pretty' }}>
          Copa, en quinta posición con <span style={{ fontFamily:'var(--font-mono)', fontSize:13 }}>240</span> menciones (<b>9,9 %</b>), opera con un perfil más orgánico que paid: 78 % del contenido es no-pago, frente al 62 % de Avianca. Esto sugiere una oportunidad — y un costo — de igualar la cadencia paga del líder.
        </p>
      </div>

      {/* Figure */}
      <div style={{ borderTop:'1px solid var(--n200)', borderBottom:'1px solid var(--n200)', padding:'18px 0', margin:'8px 0 22px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
          <div style={{ fontSize:10, fontFamily:'var(--font-mono)', textTransform:'uppercase', letterSpacing:'.08em', color:'var(--n500)' }}>FIG. 4.1</div>
          <div style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--n500)' }}>fuente · run #042 · 04/05/26</div>
        </div>
        <div style={{ fontSize:18, fontWeight:500, marginBottom:8, letterSpacing:'-0.01em' }}>Volumen mensual por competidor (menciones)</div>
        <BBBarChart/>
        <div style={{ display:'flex', gap:14, marginTop:8, fontFamily:'var(--font-sans)' }}>
          {[['Avianca', 'var(--n900)'], ['LATAM','var(--n700)'], ['Wingo','var(--n500)'], ['Arajet','var(--n300)'], ['Copa', 'var(--sa-base)']].map(([n,c]) => (
            <div key={n} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--n700)' }}>
              <span style={{ width:9, height:9, background:c, borderRadius:1 }}/>{n}
            </div>
          ))}
        </div>
      </div>

      {/* Pull quote */}
      <div style={{ borderLeft:'3px solid var(--sa-base)', padding:'4px 0 4px 18px', marginBottom:22 }}>
        <div style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--sa-base)', letterSpacing:'.1em', textTransform:'uppercase', fontWeight:600 }}>HALLAZGO · 4.1</div>
        <div style={{ fontSize:22, lineHeight:'30px', fontWeight:500, marginTop:6, letterSpacing:'-0.015em', textWrap:'balance' }}>
          El volumen de Avianca casi cuadruplica al de Copa, pero su <em>engagement</em> por pieza es sólo 1,8 × más alto.
        </div>
      </div>

      {/* Mini table */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:0, fontFamily:'var(--font-sans)', borderTop:'1px solid var(--n900)' }}>
        {[
          ['Avianca','998','41,3 %'],
          ['LATAM Colombia','581','24,0 %'],
          ['Wingo','312','12,9 %'],
          ['Arajet','287','11,9 %'],
          ['Copa Airlines','240','9,9 %'],
        ].map((r,i) => (
          <React.Fragment key={i}>
            <div style={{ padding:'10px 0', fontSize:13, borderBottom:'1px solid var(--n200)', color: r[0]==='Copa Airlines'?'var(--sa-base)':'var(--n900)', fontWeight: r[0]==='Copa Airlines'?600:400 }}>{r[0]}</div>
            <div style={{ padding:'10px 0', fontSize:13, fontFamily:'var(--font-mono)', borderBottom:'1px solid var(--n200)', textAlign:'right' }}>{r[1]}</div>
            <div style={{ padding:'10px 0', fontSize:13, fontFamily:'var(--font-mono)', borderBottom:'1px solid var(--n200)', textAlign:'right' }}>{r[2]}</div>
          </React.Fragment>
        ))}
      </div>

      <div style={{ position:'absolute', bottom:36, left:88, right:88, display:'flex', justifyContent:'space-between', fontSize:9, color:'var(--n400)', fontFamily:'var(--font-mono)', letterSpacing:'.08em', textTransform:'uppercase' }}>
        <span>preparado para Copa Airlines · uso interno</span>
        <span>generado con Benchmark Builder</span>
      </div>
    </div>
  );
}

Object.assign(window, {
  BBOverview, BBLiveFeed, BBComparativa, BBGallery, BBResearchPlan, BBEditor, BBReportPDF,
});
