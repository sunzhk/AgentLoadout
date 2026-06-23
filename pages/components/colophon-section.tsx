"use client"

import { useRef, useEffect } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

const commands = [
  { cmd: "npx github:sunzhk/AgentLoadout", desc: "Interactive install (default)" },
  { cmd: "npx github:sunzhk/AgentLoadout install --preset core agent --apply", desc: "Install specific presets" },
  { cmd: "npx github:sunzhk/AgentLoadout install --all --apply", desc: "Install everything" },
  { cmd: "npx github:sunzhk/AgentLoadout verify", desc: "Check what's installed" },
  { cmd: "npx github:sunzhk/AgentLoadout list", desc: "Full catalog" },
  { cmd: "npx github:sunzhk/AgentLoadout skills", desc: "Write skill files" },
  { cmd: "npx github:sunzhk/AgentLoadout skills --link", desc: "Create agent symlinks" },
  { cmd: "npx github:sunzhk/AgentLoadout list --brewfile", desc: "Generate Brewfile (macOS)" },
]

export function ColophonSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return

    const ctx = gsap.context(() => {
      if (headerRef.current) {
        gsap.from(headerRef.current, {
          x: -60,
          opacity: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: headerRef.current,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        })
      }

      if (gridRef.current) {
        const columns = gridRef.current.querySelectorAll(":scope > div")
        gsap.from(columns, {
          y: 40,
          opacity: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: gridRef.current,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        })
      }

      if (footerRef.current) {
        gsap.from(footerRef.current, {
          y: 20,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: footerRef.current,
            start: "top 95%",
            toggleActions: "play none none reverse",
          },
        })
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="colophon"
      className="relative py-32 pl-6 md:pl-28 pr-6 md:pr-12 border-t border-border/30"
    >
      {/* Section header */}
      <div ref={headerRef} className="mb-16">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">06 / Reference</span>
        <h2 className="mt-4 font-[var(--font-bebas)] text-5xl md:text-7xl tracking-tight">COMMANDS</h2>
      </div>

      {/* Commands list */}
      <div className="mb-20 space-y-0 border border-border/30">
        {commands.map((item, index) => (
          <div
            key={index}
            className="group flex flex-col md:flex-row md:items-center gap-2 md:gap-8 px-5 py-4 border-b border-border/20 last:border-b-0 hover:bg-accent/5 transition-colors duration-200"
          >
            <code className="font-mono text-xs text-accent shrink-0">{item.cmd}</code>
            <span className="font-mono text-[10px] text-muted-foreground/60 uppercase tracking-wider">{item.desc}</span>
          </div>
        ))}
      </div>

      {/* Multi-column layout */}
      <div ref={gridRef} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 md:gap-12">
        {/* Requirements */}
        <div className="col-span-1">
          <h4 className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-4">Requirements</h4>
          <ul className="space-y-2">
            <li className="font-mono text-xs text-foreground/80">Node.js 20+</li>
            <li className="font-mono text-xs text-foreground/80">Homebrew (macOS)</li>
            <li className="font-mono text-xs text-foreground/80">apt-get (Linux)</li>
            <li className="font-mono text-xs text-foreground/80">Scoop (Windows)</li>
          </ul>
        </div>

        {/* Platforms */}
        <div className="col-span-1">
          <h4 className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-4">Platforms</h4>
          <ul className="space-y-2">
            <li className="font-mono text-xs text-foreground/80">macOS</li>
            <li className="font-mono text-xs text-foreground/80">Linux</li>
            <li className="font-mono text-xs text-foreground/80">Windows</li>
          </ul>
        </div>

        {/* Skill Paths */}
        <div className="col-span-2">
          <h4 className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-4">Skill Files</h4>
          <ul className="space-y-2">
            <li className="font-mono text-xs text-foreground/80">~/.agents/skills/agent-loadout/</li>
            <li className="font-mono text-xs text-muted-foreground/60 mt-1">→ ~/.claude/skills/agent-loadout</li>
            <li className="font-mono text-xs text-muted-foreground/60">→ ~/.pi/agent/skills/agent-loadout</li>
            <li className="font-mono text-xs text-muted-foreground/60">→ ~/.codex/skills/agent-loadout</li>
            <li className="font-mono text-xs text-muted-foreground/60">→ ~/.gemini/skills/agent-loadout</li>
            <li className="font-mono text-xs text-muted-foreground/60 mt-3">One canonical source, symlinked to 10+ agents</li>
          </ul>
        </div>

        {/* Links */}
        <div className="col-span-1">
          <h4 className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-4">Links</h4>
          <ul className="space-y-2">
            <li>
              <a
                href="https://github.com/sunzhk/AgentLoadout"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-foreground/80 hover:text-accent transition-colors duration-200"
              >
                GitHub
              </a>
            </li>
          </ul>
        </div>

        {/* License */}
        <div className="col-span-1">
          <h4 className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-4">License</h4>
          <ul className="space-y-2">
            <li className="font-mono text-xs text-foreground/80">MIT</li>
            <li className="font-mono text-xs text-foreground/80">Open Source</li>
          </ul>
        </div>
      </div>

      {/* Bottom copyright */}
      <div
        ref={footerRef}
        className="mt-24 pt-8 border-t border-border/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
          agent-loadout / sunzhk
        </p>
        <p className="font-mono text-[10px] text-muted-foreground">One command. 64 tools. Your agent is ready.</p>
      </div>
    </section>
  )
}
