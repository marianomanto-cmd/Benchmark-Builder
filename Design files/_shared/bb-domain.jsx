// bb-domain.jsx — Domain components: platform badges, mentions, competitors, media, ranking, sidebar

// ============================================================
// Platform glyphs (simplified abstract marks — original, not literal logos)
// ============================================================
const PG = {
  ig: (s=12) => <svg width={s} height={s} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="1.5" y="1.5" width="9" height="9" rx="2.5"/><circle cx="6" cy="6" r="2"/><circle cx="8.7" cy="3.3" r=".5" fill="currentColor"/></svg>,
  tt: (s=12) => <svg width={s} height={s} viewBox="0 0 12 12" fill="currentColor"><path d="M7 1v5.5a2 2 0 1 1-2-2"  fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M7 1c.3 1.6 1.5 2.6 3 2.8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  yt: (s=12) => <svg width={s} height={s} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="1" y="3" width="10" height="6" rx="1.5"/><path d="m5 4.5 2.5 1.5L5 7.5z" fill="currentColor"/></svg>,
  fb: (s=12) => <svg width={s} height={s} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M7 11V6.5h1.5l.3-1.8H7v-1c0-.6.2-1 1-1H9V1h-1.5C6 1 5 2 5 3.5v1.2H3.5v1.8H5V11"/></svg>,
  x:  (s=12) => <svg width={s} height={s} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="m1.5 1.5 9 9M10.5 1.5l-9 9"/></svg>,
  rd: (s=12) => <svg width={s} height={s} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="6" cy="7" r="4"/><circle cx="4.5" cy="7" r=".5" fill="currentColor"/><circle cx="7.5" cy="7" r=".5" fill="currentColor"/><path d="M4.5 8.5c.7.5 2.3.5 3 0" strokeLinecap="round"/><circle cx="9.5" cy="3" r="1"/><path d="M6 3 7 1.5h2" strokeLinecap="round"/></svg>,
  ms: (s=12) => <svg width={s} height={s} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 4c0-2 1.5-2.5 4-2.5s4 .5 4 2.5v3a2 2 0 0 1-2 2H6.5L4 11V4" strokeLinejoin="round"/><path d="M5 4v3M7 4v3" strokeLinecap="round"/></svg>,
  bs: (s=12) => <svg width={s} height={s} viewBox="0 0 12 12" fill="currentColor"><path d="M6 4.5C5 2.5 3.5 1 2 1v6.5c0 1.5 2 2 4 2s4-.5 4-2V1c-1.5 0-3 1.5-4 3.5z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  web:(s=12) => <svg width={s} height={s} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="6" cy="6" r="4.5"/><path d="M1.5 6h9M6 1.5c1.5 1.5 2 3 2 4.5s-.5 3-2 4.5C4.5 9 4 7.5 4 6s.5-3 2-4.5z"/></svg>,
  meta:(s=12)=> <svg width={s} height={s} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M1.5 6c0-2 1.4-3 3-3 1.6 0 2.5 1.5 3.5 3s1.6 3 3 3c-.6-2-1.5-6-3-6-1.4 0-2.4 1.5-3.5 3s-2 3-3 3z"/></svg>,
};

const PLATFORMS = {
  instagram:{ name:'Instagram', short:'IG', color:'#c13584', glyph: PG.ig },
  tiktok:   { name:'TikTok',    short:'TT', color:'#111111', glyph: PG.tt },
  youtube:  { name:'YouTube',   short:'YT', color:'#c4302b', glyph: PG.yt },
  facebook: { name:'Facebook',  short:'FB', color:'#1877f2', glyph: PG.fb },
  x:        { name:'X / Grok',  short:'X',  color:'#0f0f0f', glyph: PG.x  },
  reddit:   { name:'Reddit',    short:'RD', color:'#ff4500', glyph: PG.rd },
  mastodon: { name:'Mastodon',  short:'MS', color:'#6364ff', glyph: PG.ms },
  bluesky:  { name:'Bluesky',   short:'BS', color:'#1083fe', glyph: PG.bs },
  web:      { name:'Web',       short:'WB', color:'#6b6b6b', glyph: PG.web},
  meta_ads: { name:'Meta Ads',  short:'AD', color:'#4267b2', glyph: PG.meta },
};

function PlatformBadge({ platform, size='md', label }) {
  const p = PLATFORMS[platform] || PLATFORMS.web;
  const sz = { sm:14, md:18, lg:24 }[size];
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
      <span style={{
        width:sz, height:sz, borderRadius:'var(--r-xs)', background:p.color, color:'#fff',
        display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0,
      }}>{p.glyph(Math.round(sz*.65))}</span>
      {label && <span style={{ fontSize:12, color:'var(--n700)' }}>{p.name}</span>}
    </span>
  );
}

function BBPlatformBadges() {
  return (
    <div style={{ width:'100%', height:'100%', background:'var(--paper)', padding:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:14 }}>
        <div className="t-h2">PlatformBadge · SentimentIndicator</div>
        <div className="t-micro">SM · MD · LG · CON LABEL</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:16 }}>
        <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:18 }}>
          <div className="t-micro">Plataformas</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:14, marginTop:14 }}>
            {Object.keys(PLATFORMS).map(k => <PlatformBadge key={k} platform={k} size="lg" label/>)}
          </div>
          <div style={{ display:'flex', gap:10, marginTop:18, alignItems:'center' }}>
            <div className="t-micro" style={{ color:'var(--n500)' }}>SM</div>
            {Object.keys(PLATFORMS).slice(0,6).map(k => <PlatformBadge key={k} platform={k} size="sm"/>)}
            <div className="t-micro" style={{ color:'var(--n500)', marginLeft:14 }}>MD</div>
            {Object.keys(PLATFORMS).slice(0,6).map(k => <PlatformBadge key={k} platform={k} size="md"/>)}
          </div>
        </div>
        <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:18 }}>
          <div className="t-micro">SentimentIndicator</div>
          <div style={{ marginTop:14, display:'flex', flexDirection:'column', gap:10 }}>
            {[['pos','positivo'],['neu','neutro'],['neg','negativo'],['mix','mixto']].map(([k,n]) => (
              <div key={k} style={{ display:'flex', alignItems:'center', gap:18 }}>
                <SentimentChip kind={k}/>
                <SentimentChip kind={k} big/>
                <div style={{ flex:1 }}/>
                <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--n500)' }}>0.{k==='pos'?'82':k==='neg'?'31':k==='mix'?'48':'55'}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop:14, padding:10, background:'var(--n50)', borderRadius:'var(--r-sm)', fontSize:11, color:'var(--n600)' }}>
            Score 0–1 · IA · sentimiento <em>aplica al contenido</em>, no al competidor.
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MentionCard — variantes por plataforma
// ============================================================
function MentionCard({ platform, author, handle, ts, body, metrics, sentiment, isAd, thumbType, brand }) {
  const p = PLATFORMS[platform] || PLATFORMS.web;
  return (
    <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', overflow:'hidden', display:'flex', flexDirection:'column', position:'relative' }}>
      {isAd && (
        <div style={{ position:'absolute', top:8, right:8, zIndex:2, padding:'2px 7px', background:'var(--sa-base)', color:'#fff', borderRadius:2, fontSize:10, fontFamily:'var(--font-mono)', letterSpacing:'.08em', textTransform:'uppercase', fontWeight:500, display:'flex', alignItems:'center', gap:4 }}>
          <Ic.bolt s={9}/> AD
        </div>
      )}
      <div style={{ padding:'12px 14px 10px', display:'flex', alignItems:'center', gap:10, borderBottom:'1px solid var(--n100)' }}>
        <PlatformBadge platform={platform} size="md"/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:500, color:'var(--n900)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{author}</div>
          <div style={{ fontSize:11, color:'var(--n500)', fontFamily:'var(--font-mono)' }}>@{handle} · {ts}</div>
        </div>
        <BBBadge tone="neutral" size="sm">{brand}</BBBadge>
      </div>
      {thumbType && (
        <div style={{ height:140, background:'var(--n100)', position:'relative', overflow:'hidden' }}>
          <ThumbPlaceholder kind={thumbType}/>
        </div>
      )}
      <div style={{ padding:'10px 14px', flex:1 }}>
        <div style={{ fontSize:13, lineHeight:'19px', color:'var(--n700)', textWrap:'pretty', display:'-webkit-box', WebkitLineClamp:thumbType?2:4, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{body}</div>
      </div>
      <div style={{ padding:'8px 14px 12px', borderTop:'1px solid var(--n100)', display:'flex', alignItems:'center', gap:14, fontSize:11, color:'var(--n600)', fontFamily:'var(--font-mono)' }}>
        {metrics.map((m,i) => (
          <span key={i} style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ color:'var(--n400)' }}>{m[0]}</span>
            <span style={{ color:'var(--n900)' }}>{m[1]}</span>
          </span>
        ))}
        <div style={{ flex:1 }}/>
        <SentimentChip kind={sentiment}/>
      </div>
    </div>
  );
}

function ThumbPlaceholder({ kind, label }) {
  const grad = {
    photo:  'linear-gradient(135deg, #d9c9b8, #a89e8b)',
    video:  'linear-gradient(135deg, #2a241c, #635a4b)',
    article:'linear-gradient(135deg, #f4f1eb, #ddd6c7)',
    ad:     'linear-gradient(135deg, #6b1a36, #8a2a5f)',
  }[kind] || 'var(--n100)';
  return (
    <div style={{ position:'absolute', inset:0, background:grad, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ position:'absolute', inset:0, backgroundImage:'repeating-linear-gradient(135deg, transparent 0 14px, rgba(255,255,255,.08) 14px 15px)' }}/>
      {kind==='video' && (
        <span style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,.85)', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'var(--n900)', zIndex:1 }}>
          <Ic.play s={14}/>
        </span>
      )}
      <span style={{ position:'absolute', bottom:8, left:10, fontSize:10, fontFamily:'var(--font-mono)', textTransform:'uppercase', letterSpacing:'.08em', color: kind==='video'||kind==='ad' ?'rgba(255,255,255,.8)':'var(--n600)' }}>{label || kind}</span>
    </div>
  );
}

function BBMentionCards() {
  return (
    <div style={{ width:'100%', height:'100%', background:'var(--paper)', padding:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:14 }}>
        <div>
          <div className="t-h2">MentionCard</div>
          <div className="t-small" style={{ color:'var(--n500)', marginTop:2 }}>Variantes por plataforma. Tag <span style={{ color:'var(--sa-base)', fontFamily:'var(--font-mono)' }}>AD</span> en sangría sólo cuando es Meta Ad Library.</div>
        </div>
        <div className="t-micro">IG · TT · YT · X · RD · WEB · AD</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14 }}>
        <MentionCard platform="instagram" author="Avianca" handle="avianca" ts="hace 4 h" brand="Avianca"
          body="Cartagena en frecuencia diaria desde Bogotá y Medellín. Conocé los nuevos horarios de mañana ☀️"
          thumbType="photo" sentiment="pos"
          metrics={[['♡','12,4k'],['💬','284'],['↗','842']]}/>
        <MentionCard platform="tiktok" author="LATAM Colombia" handle="latamcol" ts="hace 9 h" brand="LATAM"
          body="POV: tu primera vez en Cartagena. Etiquetá a quien te llevarías 👇 #latamtok"
          thumbType="video" sentiment="pos"
          metrics={[['▷','1,2M'],['♡','98k'],['💬','3,4k']]}/>
        <MentionCard platform="youtube" author="Wingo" handle="wingo.col" ts="hace 1 d" brand="Wingo"
          body="Vlog · Cartagena en 48h con vuelo Wingo · Costos reales · Recorridos imperdibles · Tips de viaje 2026"
          thumbType="video" sentiment="neu"
          metrics={[['▷','42k'],['♡','2,1k'],['📌','312']]}/>
        <MentionCard platform="meta_ads" author="Avianca" handle="avianca · ad" ts="activo · 12 d" brand="Avianca" isAd
          body="Vuelos a Cartagena desde USD 89. Combiná con Medellín y Santa Marta. Reservá hasta el 30/05."
          thumbType="ad" sentiment="pos"
          metrics={[['€','USD 8–12k'],['👁','est. 1,4M'],['🌎','CO · PA · US']]}/>
        <MentionCard platform="x" author="Arajet" handle="arajetdom" ts="hace 6 h" brand="Arajet"
          body="Punto Arajet a Cartagena: tarifa promo desde RD$ 3.999 ida. Tarifa final con impuestos publicada."
          sentiment="neu"
          metrics={[['♡','312'],['🔁','48'],['💬','22']]}/>
        <MentionCard platform="reddit" author="r/ColombiaTravel" handle="u/sanmt" ts="hace 2 d" brand="—"
          body="¿Vale la pena Wingo Bogotá–Cartagena? Compré ida + vuelta a $410k. Hubo cambio de horario 2 veces…"
          sentiment="neg"
          metrics={[['↑','142'],['💬','38']]}/>
        <MentionCard platform="web" author="El Espectador" handle="elespectador.com" ts="03/05" brand="—"
          body="Avianca, LATAM y Wingo aumentan frecuencia a Cartagena para temporada 2026: análisis de capacidad instalada."
          thumbType="article" sentiment="neu"
          metrics={[['📄','prensa'],['👁','est. 24k']]}/>
        <MentionCard platform="meta_ads" author="LATAM" handle="latamcol · ad" ts="activo · 4 d" brand="LATAM" isAd
          body="Cartagena con escala en Bogotá. Equipaje incluido. Reservá tu vuelo con LATAM Pass."
          thumbType="ad" sentiment="neu"
          metrics={[['€','USD 4–6k'],['👁','est. 620k'],['🌎','CO · CL']]}/>
      </div>
    </div>
  );
}

// ============================================================
// CompetitorCard
// ============================================================
function CompetitorCard({ name, handle, brand, platforms, mentions, sov, sent, sparkData, accent }) {
  return (
    <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:16, display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:36, height:36, borderRadius:'var(--r-sm)', background: accent || 'var(--n200)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:600, fontSize:13, fontFamily:'var(--font-sans)' }}>{brand}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:600 }}>{name}</div>
          <div style={{ fontSize:11, color:'var(--n500)', fontFamily:'var(--font-mono)' }}>@{handle}</div>
        </div>
        <Ic.more/>
      </div>
      <div style={{ display:'flex', gap:6 }}>
        {platforms.map(p => <PlatformBadge key={p} platform={p} size="sm"/>)}
      </div>
      <div style={{ height:36, position:'relative' }}>
        <Sparkline data={sparkData}/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, paddingTop:10, borderTop:'1px solid var(--n100)' }}>
        <Stat label="menciones" value={mentions}/>
        <Stat label="SOV" value={sov + ' %'}/>
        <Stat label="sentim." value={<SentimentChip kind={sent}/>} raw/>
      </div>
    </div>
  );
}
function Stat({ label, value, raw }) {
  return (
    <div>
      <div style={{ fontSize:10, letterSpacing:'.08em', color:'var(--n500)', textTransform:'uppercase', fontFamily:'var(--font-mono)' }}>{label}</div>
      <div style={{ fontSize: raw?12:15, fontFamily: raw?'inherit':'var(--font-mono)', fontWeight:500, color:'var(--n900)', marginTop:3 }}>{value}</div>
    </div>
  );
}
function Sparkline({ data, color='var(--n900)', accent }) {
  const max = Math.max(...data), min = Math.min(...data);
  const w = 100, h = 100;
  const pts = data.map((v,i) => `${(i/(data.length-1))*w},${h - ((v-min)/(max-min || 1))*h}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height="100%">
      <polyline fill="none" stroke={accent || color} strokeWidth="1.5" points={pts} vectorEffect="non-scaling-stroke"/>
      {data.map((v,i) => i===data.length-1 && (
        <circle key={i} cx={(i/(data.length-1))*w} cy={h - ((v-min)/(max-min || 1))*h} r="2.5" fill={accent || color} vectorEffect="non-scaling-stroke"/>
      ))}
    </svg>
  );
}

function BBCompetitorCards() {
  const sd = (n) => Array.from({length:14}, (_,i) => Math.sin(i*0.7+n)*8 + 12 + i*1.2);
  return (
    <div style={{ width:'100%', height:'100%', background:'var(--paper)', padding:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:14 }}>
        <div className="t-h2">CompetitorCard</div>
        <div className="t-micro">DEFAULT · CON SPARK · CON ACENTO CLIENTE</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:14 }}>
        <CompetitorCard name="Avianca" handle="avianca" brand="A" accent="var(--n900)"
          platforms={['instagram','tiktok','youtube','x','meta_ads']}
          mentions="998" sov="41,3" sent="pos" sparkData={sd(0.3)}/>
        <CompetitorCard name="LATAM Colombia" handle="latamcol" brand="L" accent="var(--n700)"
          platforms={['instagram','facebook','x','meta_ads']}
          mentions="581" sov="24,0" sent="mix" sparkData={sd(1.1)}/>
        <CompetitorCard name="Wingo" handle="wingo.col" brand="W" accent="var(--n500)"
          platforms={['instagram','tiktok','facebook']}
          mentions="312" sov="12,9" sent="neu" sparkData={sd(2.0)}/>
        <CompetitorCard name="Arajet" handle="arajetdom" brand="J" accent="var(--n400)"
          platforms={['instagram','x','web']}
          mentions="287" sov="11,9" sent="neu" sparkData={sd(2.7)}/>
        <CompetitorCard name="Copa Airlines" handle="copaairlines" brand="C" accent="var(--sa-base)"
          platforms={['instagram','youtube','x','meta_ads']}
          mentions="240" sov="9,9" sent="pos" sparkData={sd(0.8)}/>
      </div>
    </div>
  );
}

// ============================================================
// InsightCard · AlertCard · CostMeter
// ============================================================
function InsightCard({ kind, title, body, sources, confidence }) {
  const cfg = {
    opp: { name:'OPORTUNIDAD', c:'var(--success)', icon:<Ic.trend s={11}/> },
    thr: { name:'AMENAZA',     c:'var(--danger)',  icon:<Ic.alert s={11}/> },
    pat: { name:'PATRÓN',      c:'var(--info)',    icon:<Ic.sort s={11}/> },
    ano: { name:'ANOMALÍA',    c:'var(--warn)',    icon:<Ic.bolt s={11}/> },
  }[kind];
  return (
    <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:16, display:'flex', flexDirection:'column', gap:10, borderLeft:`3px solid ${cfg.c}` }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'2px 7px', borderRadius:99, color:cfg.c, border:`1px solid ${cfg.c}`, fontSize:10, fontFamily:'var(--font-mono)', letterSpacing:'.06em', fontWeight:500 }}>
          {cfg.icon}{cfg.name}
        </span>
        <div style={{ flex:1 }}/>
        <span style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--n500)', letterSpacing:'.06em' }}>CONF · {confidence}</span>
      </div>
      <div style={{ fontSize:14, fontWeight:600, color:'var(--n900)', textWrap:'balance', lineHeight:'19px' }}>{title}</div>
      <div style={{ fontSize:13, color:'var(--n600)', lineHeight:'19px', textWrap:'pretty' }}>{body}</div>
      <div style={{ marginTop:'auto', paddingTop:8, borderTop:'1px solid var(--n100)', display:'flex', alignItems:'center', gap:8, fontSize:11, color:'var(--n500)', fontFamily:'var(--font-mono)' }}>
        soportado por <b style={{ color:'var(--n900)' }}>{sources}</b> fuentes
        <div style={{ flex:1 }}/>
        <a style={{ color:'var(--sa-base)', textDecoration:'underline' }}>Ver evidencia →</a>
      </div>
    </div>
  );
}

function AlertCard({ severity, title, body, when, evidence }) {
  const cfg = { high:{c:'var(--danger)', name:'ALTA'}, med:{c:'var(--warn)', name:'MEDIA'}, low:{c:'var(--info)', name:'BAJA'} }[severity];
  return (
    <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:14, display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ width:8, height:8, borderRadius:'50%', background:cfg.c }}/>
        <span style={{ fontSize:10, fontFamily:'var(--font-mono)', color:cfg.c, letterSpacing:'.08em', fontWeight:500 }}>SEV · {cfg.name}</span>
        <div style={{ flex:1 }}/>
        <span style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--n500)' }}>{when}</span>
      </div>
      <div style={{ fontSize:13, fontWeight:600, color:'var(--n900)' }}>{title}</div>
      <div style={{ fontSize:12, color:'var(--n600)', lineHeight:'18px' }}>{body}</div>
      {evidence && <div style={{ padding:8, background:'var(--n50)', borderRadius:'var(--r-sm)', fontSize:11, color:'var(--n700)', fontFamily:'var(--font-mono)' }}>{evidence}</div>}
      <div style={{ display:'flex', gap:6, marginTop:4 }}>
        <Btn kind="ghost" size="sm">Marcar leída</Btn>
        <Btn kind="ghost" size="sm">Descartar</Btn>
        <div style={{ flex:1 }}/>
        <Btn kind="secondary" size="sm" iconRight={<Ic.arrow s={10}/>}>Abrir</Btn>
      </div>
    </div>
  );
}

function CostMeter({ used, soft, hard, period }) {
  const pct = Math.min(100, (used/hard)*100);
  const softPct = (soft/hard)*100;
  const tone = used >= hard ? 'var(--danger)' : used >= soft ? 'var(--warn)' : 'var(--success)';
  return (
    <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:14 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div className="t-micro">Costo · {period}</div>
        <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:tone, fontWeight:500 }}>{used >= soft ? 'WARN' : 'OK'}</span>
      </div>
      <div style={{ display:'flex', alignItems:'baseline', gap:6, marginTop:8 }}>
        <span style={{ fontSize:22, fontFamily:'var(--font-mono)', fontWeight:500 }}>USD {used.toFixed(2)}</span>
        <span style={{ fontSize:11, color:'var(--n500)', fontFamily:'var(--font-mono)' }}>/ {hard.toFixed(0)} cap</span>
      </div>
      <div style={{ height:6, background:'var(--n100)', borderRadius:3, marginTop:10, position:'relative' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:tone, borderRadius:3 }}/>
        <div style={{ position:'absolute', left:`${softPct}%`, top:-3, bottom:-3, width:1, background:'var(--n400)' }}/>
        <div style={{ position:'absolute', left:`${softPct}%`, top:-12, fontSize:9, color:'var(--n500)', fontFamily:'var(--font-mono)', transform:'translateX(-50%)' }}>soft · {soft}</div>
      </div>
    </div>
  );
}

function BBInsightCards() {
  return (
    <div style={{ width:'100%', height:'100%', background:'var(--paper)', padding:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:14 }}>
        <div className="t-h2">InsightCard · AlertCard · CostMeter</div>
        <div className="t-micro">OPP · THR · PAT · ANO</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
        <InsightCard kind="opp" title="LATAM no está usando TikTok orgánico para Cartagena"
          body="Cero piezas orgánicas en TikTok en los últimos 60 días, mientras Avianca y Wingo concentran 124 videos combinados. Nicho abierto."
          sources="38" confidence="0,87"/>
        <InsightCard kind="thr" title="Avianca duplicó inversión en Meta Ads sobre Cartagena"
          body="Spend estimado pasó de USD 4–6k (mes 1) a USD 8–12k (mes 2). 22 nuevos creativos, segmentación CO + PA + US."
          sources="14" confidence="0,79"/>
        <InsightCard kind="pat" title="Picos de menciones coinciden con jueves a la mañana"
          body="89 % de las publicaciones top en engagement se publicaron entre martes 18 h y jueves 11 h. Patrón estable a 8 semanas."
          sources="62" confidence="0,92"/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr 1fr', gap:14, marginTop:14 }}>
        <AlertCard severity="high" title="Mención negativa viral en Reddit · Wingo"
          body="Hilo en r/ColombiaTravel sobre cambio de horario en ruta Bogotá–Cartagena alcanzó 142 upvotes en 6 horas."
          when="hace 2 h" evidence="r/ColombiaTravel · u/sanmt · 142↑ · 38💬"/>
        <AlertCard severity="med" title="Caída en menciones · LATAM"
          body="−38 % vs período anterior. Sin runs fallidos."
          when="ayer" evidence="run #041 · 12:04"/>
        <CostMeter used={42.18} soft={50} hard={75} period="run #042"/>
      </div>
    </div>
  );
}

// ============================================================
// MediaThumbnail + Galería organic vs ad
// ============================================================
function MediaThumb({ kind, platform, isAd, size='md', label, metrics, ratio='4/5' }) {
  const sizes = { sm:120, md:160, lg:200 };
  return (
    <div style={{ position:'relative', borderRadius:'var(--r-sm)', overflow:'hidden', aspectRatio:ratio, background:'var(--n100)', border: isAd?'1px solid var(--sa-base)':'1px solid var(--n200)' }}>
      <ThumbPlaceholder kind={kind} label={label}/>
      {/* platform badge top-left */}
      <div style={{ position:'absolute', top:6, left:6 }}>
        <PlatformBadge platform={platform} size="sm"/>
      </div>
      {/* AD ribbon */}
      {isAd && (
        <div style={{ position:'absolute', top:6, right:6, padding:'2px 6px', background:'var(--sa-base)', color:'#fff', fontSize:9, fontFamily:'var(--font-mono)', letterSpacing:'.08em', borderRadius:2, fontWeight:500 }}>AD</div>
      )}
      {/* play overlay */}
      {kind==='video' && (
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
          <span style={{ width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,.85)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--n900)' }}>
            <Ic.play s={11}/>
          </span>
        </div>
      )}
      {/* metric overlay */}
      {metrics && (
        <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'14px 8px 6px', background:'linear-gradient(transparent, rgba(0,0,0,.5))', color:'#fff', fontSize:11, fontFamily:'var(--font-mono)', display:'flex', gap:8 }}>
          {metrics.map((m,i) => <span key={i}>{m}</span>)}
        </div>
      )}
    </div>
  );
}

function BBMedia() {
  return (
    <div style={{ width:'100%', height:'100%', background:'var(--paper)', padding:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:14 }}>
        <div>
          <div className="t-h2">MediaThumbnail · galería con separación org / ad</div>
          <div className="t-small" style={{ color:'var(--n500)', marginTop:2 }}>Borde sangría + ribbon en anuncios. Crítico que se distinga de un vistazo.</div>
        </div>
        <div className="t-micro">4/5 · 1/1 · 9/16 · OVERLAYS</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, height:'calc(100% - 60px)' }}>
        <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ width:10, height:10, background:'var(--organic)', borderRadius:2 }}/>
              <div className="t-h3">Orgánico · 218</div>
            </div>
            <span className="t-micro" style={{ color:'var(--n500)' }}>4 / 218</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8 }}>
            <MediaThumb kind="photo" platform="instagram" label="post · IG" metrics={['12,4k ♡','4 h']}/>
            <MediaThumb kind="video" platform="tiktok" label="video · TT" metrics={['1,2M ▷','9 h']}/>
            <MediaThumb kind="video" platform="youtube" label="vlog · YT" metrics={['42k ▷','1 d']}/>
            <MediaThumb kind="photo" platform="instagram" label="reel · IG" metrics={['8,1k ♡','12 h']}/>
            <MediaThumb kind="photo" platform="instagram" label="post · IG" metrics={['3,2k ♡','2 d']}/>
            <MediaThumb kind="video" platform="tiktok" label="duet · TT" metrics={['98k ▷','3 d']}/>
            <MediaThumb kind="article" platform="web" label="artículo" metrics={['est. 24k 👁']}/>
            <MediaThumb kind="photo" platform="x" label="thread · X" metrics={['312 ♡']}/>
          </div>
        </div>
        <div style={{ background:'var(--sa-soft)', border:'1px solid var(--sa-base)', borderRadius:'var(--r-md)', padding:16, position:'relative' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ width:10, height:10, background:'var(--ad)', borderRadius:2 }}/>
              <div className="t-h3" style={{ color:'var(--sa-strong)' }}>Anuncios pagos · Meta Ad Library · 84</div>
            </div>
            <span className="t-micro" style={{ color:'var(--sa-strong)' }}>USD 18–28k · est.</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8 }}>
            <MediaThumb kind="ad" platform="meta_ads" isAd label="creativo · 12d" metrics={['USD 8–12k','est. 1,4M 👁']}/>
            <MediaThumb kind="ad" platform="meta_ads" isAd label="creativo · 4d" metrics={['USD 4–6k','620k 👁']}/>
            <MediaThumb kind="ad" platform="meta_ads" isAd label="video · 8d" metrics={['USD 6–9k','940k 👁']}/>
            <MediaThumb kind="ad" platform="meta_ads" isAd label="carousel · 6d" metrics={['USD 3–5k','410k 👁']}/>
            <MediaThumb kind="ad" platform="meta_ads" isAd label="creativo · 2d" metrics={['USD 1–2k','180k 👁']}/>
            <MediaThumb kind="ad" platform="meta_ads" isAd label="video · 14d" metrics={['USD 12–18k','1,8M 👁']}/>
            <MediaThumb kind="ad" platform="meta_ads" isAd label="creativo · 3d" metrics={['USD 2–4k','280k 👁']}/>
            <MediaThumb kind="ad" platform="meta_ads" isAd label="static · 9d" metrics={['USD 5–8k','680k 👁']}/>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// RankingBlock — 3 layouts (grid · list · comparison_table)
// ============================================================
function BBRanking() {
  return (
    <div style={{ width:'100%', height:'100%', background:'var(--paper)', padding:24, display:'flex', flexDirection:'column', gap:14 }}>
      <div>
        <div className="t-h2">RankingBlock · Top N por métrica</div>
        <div className="t-small" style={{ color:'var(--n500)', marginTop:2 }}>Tres layouts: grid · list · comparison_table. Bloque de alto impacto en el reporte.</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:14, flex:1 }}>
        {/* GRID layout */}
        <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:18 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:14 }}>
            <div>
              <div className="t-micro">RANKING · GRID</div>
              <div className="t-h3" style={{ marginTop:4 }}>Top 3 piezas orgánicas · engagement</div>
            </div>
            <span className="t-micro" style={{ color:'var(--n500)' }}>60 DÍAS</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
            {[
              { rank:1, kind:'video', platform:'tiktok', author:'LATAM Colombia', metric:'1,24M', secondary:'98k ♡ · 3,4k 💬', label:'POV · primera vez' },
              { rank:2, kind:'photo', platform:'instagram', author:'Avianca', metric:'412k', secondary:'52k ♡ · 1,1k 💬', label:'Sunset Cartagena' },
              { rank:3, kind:'video', platform:'youtube', author:'Wingo', metric:'42k', secondary:'2,1k ♡ · 312 📌', label:'48h en Cartagena' },
            ].map((r) => (
              <div key={r.rank} style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <MediaThumb kind={r.kind} platform={r.platform} label={r.label}/>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:13, color:'var(--sa-base)', fontWeight:600 }}>#{r.rank}</span>
                  <span style={{ fontSize:13, fontWeight:500 }}>{r.author}</span>
                </div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:24, fontWeight:500, lineHeight:1, letterSpacing:'-0.01em' }}>{r.metric}</div>
                <div style={{ fontSize:11, color:'var(--n500)', fontFamily:'var(--font-mono)' }}>{r.secondary}</div>
              </div>
            ))}
          </div>
        </div>

        {/* LIST layout */}
        <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:18 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:14 }}>
            <div>
              <div className="t-micro">RANKING · LIST</div>
              <div className="t-h3" style={{ marginTop:4 }}>Top 5 anuncios pagos · reach</div>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column' }}>
            {[
              { r:1, t:'Avianca · creativo 12d', m:'1,4M', s:'USD 8–12k', p:'meta_ads' },
              { r:2, t:'Avianca · video 14d',    m:'1,8M', s:'USD 12–18k', p:'meta_ads' },
              { r:3, t:'LATAM · creativo 4d',    m:'620k', s:'USD 4–6k', p:'meta_ads' },
              { r:4, t:'LATAM · video 8d',       m:'940k', s:'USD 6–9k', p:'meta_ads' },
              { r:5, t:'Copa · static 9d',       m:'680k', s:'USD 5–8k', p:'meta_ads' },
            ].map((r,i) => (
              <div key={r.r} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderTop: i?'1px solid var(--n100)':'none' }}>
                <span style={{ width:24, fontFamily:'var(--font-mono)', fontSize:12, color: r.r<=3?'var(--sa-base)':'var(--n500)', fontWeight:600 }}>#{r.r}</span>
                <div style={{ width:36, height:36, borderRadius:'var(--r-xs)', background:'var(--sa-base)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>
                  <Ic.bolt s={12}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.t}</div>
                  <div style={{ fontSize:11, color:'var(--n500)', fontFamily:'var(--font-mono)' }}>spend · {r.s}</div>
                </div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:16, fontWeight:500 }}>{r.m}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* COMPARISON TABLE layout */}
      <div style={{ background:'#fff', border:'1px solid var(--n200)', borderRadius:'var(--r-md)', padding:18 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:12 }}>
          <div>
            <div className="t-micro">RANKING · COMPARISON_TABLE</div>
            <div className="t-h3" style={{ marginTop:4 }}>Competidor × métrica · 60 días</div>
          </div>
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ color:'var(--n500)' }}>
              {['', 'Menciones', 'Engagement', 'Reach est.', 'SOV', 'Sentiment', 'Top pieza'].map((h,i) => (
                <th key={i} style={{ padding:'6px 10px', textAlign: i>0?'right':'left', fontWeight:500, fontSize:10, letterSpacing:'.08em', textTransform:'uppercase', borderBottom:'1px solid var(--n200)', fontFamily:'var(--font-mono)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['Avianca','998','412k','1,8M','41,3','pos','reel · sunset'],
              ['LATAM Colombia','581','264k','1,1M','24,0','mix','POV TikTok'],
              ['Wingo','312','198k','680k','12,9','neu','vlog 48h'],
              ['Arajet','287','142k','420k','11,9','neu','tarifa promo'],
              ['Copa Airlines','240','188k','520k','9,9','pos','sunset post'],
            ].map((r,i) => (
              <tr key={i} style={{ borderBottom:'1px solid var(--n100)' }}>
                <td style={{ padding:'9px 10px', fontWeight: r[0]==='Copa Airlines'?600:500, color: r[0]==='Copa Airlines'?'var(--sa-base)':'var(--n900)' }}>{r[0]}</td>
                <td style={{ padding:'9px 10px', textAlign:'right', fontFamily:'var(--font-mono)' }}>{r[1]}</td>
                <td style={{ padding:'9px 10px', textAlign:'right', fontFamily:'var(--font-mono)' }}>{r[2]}</td>
                <td style={{ padding:'9px 10px', textAlign:'right', fontFamily:'var(--font-mono)' }}>{r[3]}</td>
                <td style={{ padding:'9px 10px', textAlign:'right', fontFamily:'var(--font-mono)' }}>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                    <span style={{ width: parseFloat(r[4].replace(',','.'))*1.2, maxWidth:60, height:6, background: r[0]==='Copa Airlines'?'var(--sa-base)':'var(--n900)', borderRadius:3 }}/>
                    {r[4]} %
                  </span>
                </td>
                <td style={{ padding:'9px 10px', textAlign:'right' }}><SentimentChip kind={r[5]}/></td>
                <td style={{ padding:'9px 10px', textAlign:'right', fontSize:12, color:'var(--n600)' }}>{r[6]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// Sidebar + Topbar (light + dark)
// ============================================================
const NavIc = {
  grid: (s=14) => <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="1.5" y="1.5" width="4.5" height="4.5" rx="1"/><rect x="8" y="1.5" width="4.5" height="4.5" rx="1"/><rect x="1.5" y="8" width="4.5" height="4.5" rx="1"/><rect x="8" y="8" width="4.5" height="4.5" rx="1"/></svg>,
  folder:(s=14) => <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"><path d="M1.5 4.5V11a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V5.5a1 1 0 0 0-1-1H7L5.5 3h-3a1 1 0 0 0-1 1v.5z"/></svg>,
  users: (s=14) => <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="5" cy="5" r="2.2"/><path d="M1.5 12c.5-2 2-3 3.5-3s3 1 3.5 3M9.5 5a2 2 0 1 1 0-2M12.5 11.5c-.4-1.5-1.4-2.4-2.5-2.7"/></svg>,
  doc: (s=14) => <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"><path d="M3 1.5h5l3 3V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2.5a1 1 0 0 1 1-1z"/><path d="M8 1.5v3h3M4 7h6M4 9.5h6"/></svg>,
  bulb:(s=14) => <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M7 1.5a4 4 0 0 0-2 7.5v1.5h4V9a4 4 0 0 0-2-7.5zM5.5 12.5h3M6 11h2"/></svg>,
  bell:(s=14) => <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M3 10.5h8l-1-1.5V6a3 3 0 1 0-6 0v3l-1 1.5zM6 12.5a1 1 0 0 0 2 0"/></svg>,
  cog:(s=14) => <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="7" cy="7" r="2"/><path d="M7 1v1.5M7 11.5V13M2 7H.5M13.5 7H12M3.4 3.4l1 1M9.6 9.6l1 1M3.4 10.6l1-1M9.6 4.4l1-1"/></svg>,
};

function BBSidebar({ mode='light' }) {
  const dark = mode==='dark';
  const colors = dark ? {
    bg:'#0e0c09', sidebar:'#0e0c09', topbar:'#0e0c09',
    panel:'#1a1612', border:'#2a241c',
    text:'#ddd6c7', muted:'#847a68', hi:'#fff',
    grid:'rgba(255,255,255,.04)',
  } : {
    bg:'var(--paper)', sidebar:'#181410', topbar:'#fff',
    panel:'#fff', border:'var(--n200)',
    text:'#ddd6c7', muted:'#847a68', hi:'#fff',
    grid:'var(--n200)',
  };
  const SBG = colors.sidebar;

  const nav = [
    ['Dashboard', NavIc.grid, false],
    ['Proyectos', NavIc.folder, true],
    ['Catálogo de competidores', NavIc.users, false],
    ['Templates', NavIc.doc, false],
    ['Insights globales', NavIc.bulb, false],
    ['Alertas', NavIc.bell, false, 4],
  ];

  return (
    <div style={{ width:'100%', height:'100%', background:colors.bg, display:'flex', overflow:'hidden' }}>
      {/* Sidebar */}
      <aside style={{ width:240, background:SBG, color:'#ddd6c7', display:'flex', flexDirection:'column', padding:'16px 12px', borderRight:`1px solid ${dark?'#2a241c':'#2a241c'}`, position:'relative' }}>
        {/* sangría accent border-left */}
        <div style={{ position:'absolute', top:0, bottom:0, left:0, width:2, background:'var(--sa-base)' }}/>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'4px 8px 14px' }}>
          <span style={{ width:18, height:18, borderRadius:'50%', background:'var(--sa-base)', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#fff' }}/>
          </span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>Benchmark Builder</div>
            <div style={{ fontSize:10, color:'#847a68', fontFamily:'var(--font-mono)', letterSpacing:'.05em' }}>SANGRÍA · OS</div>
          </div>
          <Ic.arrowDown s={9}/>
        </div>

        {/* workspace selector */}
        <div style={{ padding:'8px 10px', background:'#1a1612', border:'1px solid #2a241c', borderRadius:'var(--r-sm)', display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
          <span style={{ width:18, height:18, borderRadius:'var(--r-xs)', background:'#1d3fb8', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:10, fontWeight:600 }}>CO</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, color:'#fff', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>Copa Airlines</div>
            <div style={{ fontSize:10, color:'#847a68', fontFamily:'var(--font-mono)' }}>4 proyectos</div>
          </div>
          <Ic.arrowDown s={8}/>
        </div>

        <div style={{ fontSize:9, fontFamily:'var(--font-mono)', color:'#635a4b', letterSpacing:'.12em', textTransform:'uppercase', padding:'0 10px 6px' }}>NAVEGACIÓN</div>
        <nav style={{ display:'flex', flexDirection:'column', gap:1 }}>
          {nav.map(([n, ic, active, count], i) => (
            <a key={i} style={{
              display:'flex', alignItems:'center', gap:10, padding:'7px 10px', borderRadius:'var(--r-sm)',
              color: active ? '#fff' : '#a89e8b',
              background: active ? '#2a241c' : 'transparent',
              fontSize:13, fontWeight: active?500:400,
              borderLeft: active ? '2px solid var(--sa-base)' : '2px solid transparent',
              paddingLeft: active ? 8 : 10,
            }}>
              <span style={{ color: active?'#fff':'#847a68' }}>{ic()}</span>
              <span style={{ flex:1 }}>{n}</span>
              {count && <span style={{ fontSize:10, padding:'1px 6px', borderRadius:99, background:'var(--sa-base)', color:'#fff', fontFamily:'var(--font-mono)' }}>{count}</span>}
            </a>
          ))}
        </nav>

        <div style={{ marginTop:18, fontSize:9, fontFamily:'var(--font-mono)', color:'#635a4b', letterSpacing:'.12em', textTransform:'uppercase', padding:'0 10px 6px' }}>PROYECTOS RECIENTES</div>
        <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
          {[['Cartagena · Q2 2026', true],['Lanzamiento clase ejecutiva', false],['Black Friday 2025', false]].map(([n, active], i) => (
            <a key={i} style={{
              display:'flex', alignItems:'center', gap:10, padding:'6px 10px', borderRadius:'var(--r-sm)',
              color: active ? '#fff' : '#847a68', fontSize:12, fontWeight: active?500:400,
              background: active ? 'rgba(107,26,54,.18)' : 'transparent',
            }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background: active?'var(--sa-light)':'#3d352a' }}/>
              <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n}</span>
            </a>
          ))}
        </div>

        <div style={{ flex:1 }}/>

        <a style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 10px', color:'#a89e8b', fontSize:13, borderRadius:'var(--r-sm)' }}>
          <NavIc.cog/> Settings
        </a>
        <div style={{ marginTop:8, padding:'8px 10px', display:'flex', alignItems:'center', gap:10, borderTop:'1px solid #2a241c' }}>
          <div style={{ width:26, height:26, borderRadius:'50%', background:'var(--n400)', flexShrink:0 }}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, color:'#fff', fontWeight:500 }}>Sebastián M.</div>
            <div style={{ fontSize:10, color:'#847a68', fontFamily:'var(--font-mono)' }}>operador · solo</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex:1, display:'flex', flexDirection:'column' }}>
        {/* Topbar */}
        <header style={{ height:56, background:colors.topbar, borderBottom:`1px solid ${colors.border}`, display:'flex', alignItems:'center', padding:'0 24px', gap:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12 }}>
            <span style={{ color:dark?'#847a68':'var(--n500)' }}>Proyectos</span>
            <span style={{ color:dark?'#3d352a':'var(--n300)' }}>/</span>
            <span style={{ color:dark?'#ddd6c7':'var(--n900)', fontWeight:500 }}>Cartagena · Q2 2026</span>
            <BBBadge tone="success" size="sm">activo</BBBadge>
            <span style={{ color:dark?'#635a4b':'var(--n400)', fontFamily:'var(--font-mono)', fontSize:11 }}>· run #042 · hace 12 min</span>
          </div>
          <div style={{ flex:1 }}/>
          <div style={{ display:'flex', alignItems:'center', border:`1px solid ${colors.border}`, borderRadius:'var(--r-sm)', padding:'4px 10px', background: dark?'#1a1612':'var(--n50)', width:280 }}>
            <span style={{ color: dark?'#635a4b':'var(--n400)' }}><Ic.search s={12}/></span>
            <span style={{ marginLeft:8, fontSize:12, color:dark?'#635a4b':'var(--n500)' }}>Buscar mención, competidor, insight…</span>
            <span style={{ marginLeft:'auto', fontSize:10, fontFamily:'var(--font-mono)', color: dark?'#635a4b':'var(--n400)', padding:'1px 5px', border:`1px solid ${colors.border}`, borderRadius:3 }}>⌘K</span>
          </div>
          <Btn kind="ghost" size="sm" icon={<Ic.presentation s={12}/>} style={{ color:dark?'#a89e8b':'var(--n700)' }}>Presentación</Btn>
          <Btn kind="primary" size="sm" icon={<Ic.bolt s={11}/>}>Nuevo run</Btn>
        </header>
        {/* canvas hint */}
        <div style={{ flex:1, padding:24, display:'flex', flexDirection:'column', gap:14, background: dark?'#0e0c09':'var(--paper)' }}>
          <div style={{ height:14, background:colors.grid, borderRadius:2 }}/>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14 }}>
            {[1,2,3,4].map(i => <div key={i} style={{ height:88, background:colors.grid, borderRadius:'var(--r-sm)' }}/>)}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:14, flex:1 }}>
            <div style={{ background:colors.grid, borderRadius:'var(--r-sm)' }}/>
            <div style={{ background:colors.grid, borderRadius:'var(--r-sm)' }}/>
          </div>
        </div>
      </main>
    </div>
  );
}

Object.assign(window, {
  PLATFORMS, PlatformBadge,
  BBPlatformBadges, BBMentionCards, MentionCard,
  BBCompetitorCards, CompetitorCard, Sparkline, Stat,
  BBInsightCards, InsightCard, AlertCard, CostMeter,
  BBMedia, MediaThumb, ThumbPlaceholder,
  BBRanking, BBSidebar, NavIc,
});
