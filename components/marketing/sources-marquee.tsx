import s from "./marketing.module.css";

const SOURCES = ["YouTube", "Reddit", "X", "Instagram", "TikTok", "Meta Ads", "Prensa", "Bluesky", "Mastodon"];

// The track renders two IDENTICAL halves and the CSS animates translateX(-50%)
// for a seamless loop. For it to never expose empty space, ONE half must be at
// least as wide as the viewport — with only 9 short words a single copy is
// narrower than a wide desktop, so the loop went blank. Repeat the list enough
// times per half that it overflows even ultrawide screens.
const REPEAT = 5;

export function SourcesMarquee() {
  const half = Array.from({ length: REPEAT }, () => SOURCES).flat();
  const items = [...half, ...half];
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
