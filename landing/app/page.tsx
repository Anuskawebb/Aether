"use client";

import React, { useEffect, useRef, useState } from "react";

const APP_URL = "/terminal";

// Small arrow glyph used inside the green "Try Demo" button (matches the
// reference's button-icon swap on hover).
const ArrowIcon = () => (
  <svg height="100%" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4.66699 11.3332L11.3337 4.6665" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4.66699 4.6665H11.3337V11.3332" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Minimalist, bull-inspired geometric brand mark.
// Institutional, modern, and clean. Symmetrical split facets.
export const ToroMark = ({ size = 26, className = "" }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Left Horn/Face Facet */}
    <path
      d="M 47 80 L 25 46 L 16 18 L 38 35 L 47 43 Z"
      fill="currentColor"
    />
    {/* Right Horn/Face Facet */}
    <path
      d="M 53 80 L 75 46 L 84 18 L 62 35 L 53 43 Z"
      fill="currentColor"
    />
  </svg>
);

// ── Right-hand media panels — on-theme mock product UI that swaps as you scroll,
//    standing in for the reference's product videos. ──────────────────────────

function SignalsPanel() {
  const rows = [
    { rank: "01", name: "0xVega (Quant)", win: "94.2%", vol: "$4.1M", up: true },
    { rank: "02", name: "satoshi.eth", win: "89.5%", vol: "$2.8M", up: true },
    { rank: "03", name: "0xNova (Alpha)", win: "83.1%", vol: "$1.7M", up: true },
    { rank: "04", name: "deltahunter", win: "78.4%", vol: "$920K", up: false },
  ];
  return (
    <div className="toro-card">
      <div className="toro-card-head">
        <span className="toro-card-title">Smart Money Signals</span>
        <span className="toro-pill-live"><span className="toro-dot" /> 24h</span>
      </div>
      <div className="toro-leaders">
        {rows.map((r, i) => (
          <div className="toro-leader-row" key={r.name}>
            <span className="toro-leader-rank">{r.rank}</span>
            <span className="toro-leader-name">{r.name}</span>
            <span className="toro-leader-win">{r.win}</span>
            <span className="toro-leader-vol">{r.vol}</span>
            <span className={`toro-copy${i === 0 ? " is-active" : ""}`}>{i === 0 ? "Tracking" : "Track"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeedPanel() {
  const rows = [
    { side: "BUY", asset: "ETH", amt: "2.40", t: "now", ok: true },
    { side: "SELL", asset: "MNT", amt: "12,500", t: "15s", ok: true },
    { side: "BUY", asset: "USDC", amt: "10,000", t: "2m", ok: true },
    { side: "SKIP", asset: "PEPE", amt: "—", t: "4m", ok: false },
  ];
  return (
    <div className="toro-card">
      <div className="toro-card-head">
        <span className="toro-card-title">Agent Activity</span>
        <span className="toro-pill-live"><span className="toro-dot" /> Live</span>
      </div>
      <div className="toro-feed">
        {rows.map((r, i) => (
          <div className="toro-feed-row" key={i}>
            <span className={`toro-side ${r.side.toLowerCase()}`}>{r.side}</span>
            <span className="toro-feed-asset">{r.amt} {r.asset}</span>
            <span className="toro-feed-time">{r.t}</span>
            <span className={`toro-feed-status${r.ok ? "" : " skip"}`}>{r.ok ? "Executed" : "Blocked"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VaultPanel() {
  const limits = [
    { label: "Max trade size", value: "$2,500" },
    { label: "Daily loss limit", value: "$500" },
    { label: "Allowed tokens", value: "ETH · MNT · USDC · WBTC" },
  ];
  return (
    <div className="toro-card">
      <div className="toro-card-head">
        <span className="toro-card-title">Toro Portfolio Overview</span>
        <span className="toro-pill-ghost">Non-custodial</span>
      </div>
      <div className="toro-vault-balance">
        <span className="toro-vault-label">Available Reserve</span>
        <span className="toro-vault-value">$25,480<span className="toro-vault-cur"> tUSD</span></span>
      </div>
      <div className="toro-limits">
        {limits.map((l) => (
          <div className="toro-limit-row" key={l.label}>
            <span className="toro-limit-label">{l.label}</span>
            <span className="toro-limit-value">{l.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const TABS = [
  {
    heading: (
      <>
        Track smart money with <span className="text-color-green">one tap</span>
      </>
    ),
    body: "Monitor institutional flows and smart-money signals in real time. Compare risk profiles, win rates, and volume metrics directly on the terminal dashboard.",
    Panel: SignalsPanel,
  },
  {
    heading: (
      <>
        Deploy agents for <span className="text-color-green">24/7 execution</span>
      </>
    ),
    body: "Toro agents monitor on-chain events and execute mirrored copy-trades autonomously within seconds. Stop loss protections and trade sizing run without manual friction.",
    Panel: FeedPanel,
  },
  {
    heading: (
      <>
        Define custom risk <span className="text-color-green">guardrails</span>
      </>
    ),
    body: "Your funds always remain non-custodial in your vault. Set exact guardrails—including stop-loss limits, maximum slippage, and transaction size caps.",
    Panel: VaultPanel,
  },
];

// "Two-columns" section — feature cards that fade in, staggered.
const CARDS = [
  { title: "Track Smart Money", sub: "Intelligence Feed", body: "Mirror leading on-chain addresses ranked by verified win rate, PnL metrics, and historical risk consistency." },
  { title: "Non-Custodial Safety", sub: "Risk Controls", body: "Toro agents operate exclusively within the bounds of your custom guardrails. Your assets never leave your vault." },
  { title: "Autonomous Execution", sub: "Agent Activity", body: "Deploy scoring and execution agents that work 24/7 to scanner opportunities, score alpha, and execute trades." },
];

export default function Home() {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLAnchorElement>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const heroBgRef = useRef<HTMLDivElement>(null);
  const heroTextRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const revealWordRef = useRef<HTMLHeadingElement>(null);
  const revealKickRef = useRef<HTMLParagraphElement>(null);
  const startRef = useRef({ cx: 0, cy: 0, size: 56 });

  useEffect(() => {
    // easeInOutCubic
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    // Capture the logo's resting position (the nav slot) in scroll-0 viewport
    // coordinates, so we can interpolate from there to the centre.
    const computeStart = () => {
      const a = anchorRef.current;
      if (!a) return;
      const r = a.getBoundingClientRect();
      startRef.current = {
          cx: r.left + r.width / 2 + window.scrollX,
          cy: r.top + r.height / 2 + window.scrollY,
          size: r.width || 56,
      };
      if (logoRef.current) logoRef.current.style.width = `${startRef.current.size}px`;
    };

    const onScroll = () => {
      // ── Scroll-driven tab switcher (no GSAP): map how far the tall track has
      //    scrolled past the sticky viewport into an active index (0..2). ──
      const el = trackRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const total = el.offsetHeight - window.innerHeight;
        const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
        const ratio = scrolled / Math.max(total, 1);
        const idx = Math.min(TABS.length - 1, Math.floor(ratio * TABS.length));
        setActive((prev) => (prev === idx ? prev : idx));
      }

      // ── Toro logo: fly from the nav to the centre + scale up/down over the first
      //    ~viewport of scroll, then hold centred for the rest of the page. ──
      const logo = logoRef.current;
      if (logo) {
        const flyDist = window.innerHeight * 0.9;
        const p = Math.min(Math.max(window.scrollY / flyDist, 0), 1);
        const e = ease(p);
        const { cx, cy, size } = startRef.current;
        const dx = (1 - e) * (cx - window.innerWidth / 2);
        const dy = (1 - e) * (cy - window.innerHeight / 2);
        const endScale = size > 0 ? 56 / size : 1.0;
        const scale = 1 + (endScale - 1) * e;
        logo.style.transform = `translate3d(calc(-50% + ${dx}px), calc(-50% + ${dy}px), 0) scale(${scale})`;
        logo.style.opacity = "1";
      }

      // ── Hero background: zoom out + blur + fade as you scroll
      const heroP = Math.min(Math.max(window.scrollY / (window.innerHeight * 0.8), 0), 1);
      const hero = heroBgRef.current;
      if (hero) {
        hero.style.transform = `scale(${1 + 0.1 * heroP})`;
        hero.style.opacity = `${Math.max(1 - heroP * 1.1, 0)}`;
      }
      // Hero headline: blur out + fade away on scroll
      const heroText = heroTextRef.current;
      if (heroText) {
        heroText.style.filter = `blur(${heroP * 6}px)`;
        heroText.style.opacity = `${Math.max(1 - heroP * 1.2, 0)}`;
      }

      // ── Brand reveal: the word scales up + fades as the section scrolls past
      const rv = revealRef.current;
      if (rv) {
        const rect = rv.getBoundingClientRect();
        const total = Math.max(rv.offsetHeight - window.innerHeight, 1);
        const p = Math.min(Math.max(-rect.top, 0), total) / total;
        if (revealWordRef.current) {
          revealWordRef.current.style.transform = `scale(${1 + p * 4})`;
          revealWordRef.current.style.opacity = `${p < 0.65 ? 1 : Math.max(1 - (p - 0.65) / 0.35, 0)}`;
        }
        if (revealKickRef.current) {
          revealKickRef.current.style.opacity = `${Math.max(1 - p / 0.4, 0)}`;
        }
      }
    };

    const onResize = () => {
      computeStart();
      onScroll();
    };

    computeStart();
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <>
      {/* Minimal top bar — brand slot + primary CTA, floating over the light
          intro. The visible logo is the fixed .toro-logo-fixed below; this anchor just
          reserves its resting position + keeps the top-left link clickable. */}
      <header className="toro-nav">
        <a href={APP_URL} className="toro-brand" aria-label="Toro home">
          <span className="eye-anchor" ref={anchorRef} />
        </a>
        <a href={APP_URL} className="button is-green toro-nav-cta">
          <span className="button-text">Launch Terminal</span>
        </a>
      </header>

      {/* Toro logo — rests in the nav slot, flies to the centre on scroll */}
      <a href={APP_URL} className="eye-logo" ref={logoRef} aria-label="Toro home">
        <ToroMark size={56} />
      </a>

      {/* ── Intro — pinned statement on a light panel ─────────────────────── */}
      <section className="intro-wrapper">
        <div className="intro">
          {/* Mountain background — fills the hero (cover) and recedes/fades on scroll */}
          <div className="hero-bg" ref={heroBgRef} aria-hidden="true" />
          {/* Split headline, stacked over several lines — green serif top-left,
              black condensed bottom-right */}
          <div className="hero-edit" ref={heroTextRef}>
            <h1 className="hero-line-1">
              Trade Smarter.<br />Move <span className="hero-ink">Earlier.</span>
            </h1>
            <span className="hero-line-2">
              Toro continuously tracks smart-money activity, evaluates risk, identifies opportunities, and executes trades autonomously through AI agents.
            </span>
          </div>
        </div>
      </section>

      {/* ── Brand reveal — "Introducing Toro" masthead-style scroll reveal ── */}
      <section className="reveal" ref={revealRef}>
        <div className="reveal-inner">
          <div className="reveal-squares" aria-hidden="true">
            <span className="reveal-square s1" />
            <span className="reveal-square s2" />
            <span className="reveal-square s3" />
          </div>
          <div className="reveal-stack">
            <p className="reveal-kicker" ref={revealKickRef}>Introducing</p>
            <h2 className="reveal-word" ref={revealWordRef}>TORO</h2>
          </div>
        </div>
      </section>

      {/* ── Scroll-driven story sections (tiles · text · columns · subscribe) ── */}
      <div className="sd">
        {/* Tiles — animated grid transition */}
        <section className="sd-section sd-tiles" style={{ "--name": "--tiles-s" } as React.CSSProperties}>
          <div className="tile-section">
            <div className="tile-container">
              {Array.from({ length: 20 }).map((_, i) => (
                <span className="tile" key={i} />
              ))}
            </div>
          </div>
        </section>

        {/* Two columns — cards + a preview image that slides in from the right */}
        <section className="sd-section sd-two" style={{ "--name": "--two-columns-s" } as React.CSSProperties}>
          <div className="two-columns">
            <h2>Why traders choose Toro</h2>
            <div className="content">
              <div className="cards">
                {CARDS.map((c, i) => (
                  <div className="card" key={i}>
                    <h3 className="title">{c.title}</h3>
                    <div className="subtitle">{c.sub}</div>
                    <p>{c.body}</p>
                  </div>
                ))}
              </div>
              <div className="preview">
                <div className="img" />
              </div>
            </div>
          </div>
        </section>

        {/* Subscribe — the form scales up into view */}
        <section className="sd-section sd-subscribe" style={{ "--name": "--subscribe-s" } as React.CSSProperties}>
          <div className="subscribe">
            <h2>Ready to automate?</h2>
            <p>Get early access to the Toro Terminal and deploy autonomous trading agents with institutional-grade risk parameters.</p>
            <form onSubmit={(e) => e.preventDefault()}>
              <input type="email" placeholder="Enter your email" aria-label="Email" />
              <button className="sd-btn" type="submit"><span>Get early access</span></button>
            </form>
          </div>
        </section>
      </div>

      {/* ── Tabs — dark sticky scroll story ──────────────────────────────── */}
      <section className="section_tabs">
        <div className="padding-section-large">
          <div className="tabs_height" ref={trackRef}>
            <div className="tabs_sticky-wrapper">
              <div className="tabs_container">
                <div className="tabs_component">
                  {/* Left: rotating copy + CTA */}
                  <div className="tabs_left">
                    <div className="tabs_left-top">
                      {TABS.map((tab, i) => (
                        <div className={`tabs_let-content${i === active ? " is-active" : ""}`} key={i}>
                          <h2 className="heading-style-h4 text-color-gray100">{tab.heading}</h2>
                          <div className="tabs_line" />
                          <p className="text-size-small text-color-gray400">{tab.body}</p>
                        </div>
                      ))}
                    </div>
                    <div className="tabs_left-bottom">
                      <a href={APP_URL} className="button is-green is-secondary">
                        <div className="button-text">Launch Terminal</div>
                        <div className="button-circle-wrapper">
                          <div className="button-icon _1"><ArrowIcon /></div>
                          <div className="button-icon _2"><ArrowIcon /></div>
                        </div>
                        <div className="button-circlee" />
                      </a>
                    </div>
                  </div>

                  {/* Right: rotating media panels */}
                  <div className="tabs_right">
                    {TABS.map((tab, i) => {
                      const Panel = tab.Panel;
                      return (
                        <div className={`tabs_video${i === active ? " is-active" : ""}`} key={i}>
                          <Panel />
                        </div>
                      );
                    })}
                    {/* Step indicator */}
                    <div className="tabs_progress">
                      {TABS.map((_, i) => (
                        <span className={`tabs_dot${i === active ? " is-active" : ""}`} key={i} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Closing strip */}
        <footer className="toro-foot">
          <a href={APP_URL} className="toro-brand">
            <span className="toro-brand-mark"><ToroMark size={22} /></span>
            <span className="toro-brand-text">Toro</span>
          </a>
          <span className="toro-foot-note">Autonomous on-chain copy-trading · Testnet demo</span>
          <a href={APP_URL} className="button is-green toro-nav-cta">
            <span className="button-text">Launch Terminal</span>
          </a>
        </footer>
      </section>
    </>
  );
}
