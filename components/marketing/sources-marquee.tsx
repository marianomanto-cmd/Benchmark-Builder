import s from "./marketing.module.css";

const SOURCES = ["YouTube", "Reddit", "X", "Instagram", "TikTok", "Meta Ads", "Prensa", "Bluesky", "Mastodon"];

// Infinite horizontal ticker. The track is duplicated so the -50% loop is seamless.
export function SourcesMarquee() {
  const items = [...SOURCES, ...SOURCES];
  return (
    <div className={s.marquee} aria-hidden="true">
      <div className="bb-marquee-track">
        {items.map((src, i) => (
          <span key={i}>
            <span className={s.marqueeItem}>{src}</span>
            <span className={s.marqueeSep}>—</span>
          </span>
        ))}
      </div>
    </div>
  );
}
