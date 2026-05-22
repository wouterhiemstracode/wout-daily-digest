import React, { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

export function ClassicBroadsheet() {
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    setDateStr(
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date())
    );
  }, []);

  return (
    <div className="min-h-screen bg-[#FDF8F0] text-[#1a1a1a] p-4 md:p-8 lg:p-12 font-serif selection:bg-[#2C1810] selection:text-[#FDF8F0]">
      <div className="max-w-5xl mx-auto bg-[#FDF8F0] shadow-[0_0_40px_rgba(0,0,0,0.05)] border border-[#d1c8b4] p-6 md:p-10 relative overflow-hidden">
        {/* Noise overlay for paper texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
          }}
        ></div>

        {/* Top Header / Meta */}
        <div className="flex flex-col md:flex-row justify-between items-center border-b-[3px] border-[#1a1a1a] pb-3 mb-8 uppercase tracking-widest text-xs font-bold font-sans">
          <span>Morning Edition · Vol. 1</span>
          <span className="flex items-center gap-2 mt-2 md:mt-0 bg-[#e8e0cc] px-3 py-1 rounded-full border border-[#d1c8b4]">
            <CheckCircle2 className="w-3 h-3 text-green-700" />
            Connected · wouterhiemstracode@gmail.com
          </span>
          <span className="mt-2 md:mt-0">{dateStr}</span>
        </div>

        {/* Masthead */}
        <div className="text-center mb-10 border-b-[6px] double border-[#2C1810] pb-8">
          <h1 className="font-['Playfair_Display'] text-5xl md:text-7xl lg:text-8xl font-black text-[#2C1810] tracking-tighter mb-4 leading-none uppercase">
            Wout's Daily Digest
          </h1>
          <p className="font-['Playfair_Display'] text-xl md:text-2xl italic text-[#4a3b32]">
            Your morning intelligence, beautifully curated.
          </p>
        </div>

        {/* Actions & Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 border-b-2 border-[#1a1a1a] pb-10 mb-10">
          {/* Actions */}
          <div className="md:col-span-5 flex flex-col justify-center gap-4">
            <button className="font-['Playfair_Display'] text-lg border border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#FDF8F0] transition-colors py-3 px-6 text-center uppercase tracking-wider font-bold group relative overflow-hidden">
              Sync Today's Newsletters
            </button>
            <button className="font-['Playfair_Display'] text-lg border border-[#2C1810] bg-[#2C1810] text-[#FDF8F0] hover:bg-[#1a1a1a] transition-colors py-3 px-6 text-center uppercase tracking-wider font-bold shadow-[4px_4px_0_0_#1a1a1a] hover:shadow-none hover:translate-y-[4px] hover:translate-x-[4px] duration-200">
              Generate My Briefing
            </button>
          </div>

          {/* Divider */}
          <div className="hidden md:block md:col-span-1 relative">
             <div className="absolute left-1/2 top-0 bottom-0 border-r border-[#1a1a1a] -translate-x-1/2"></div>
          </div>

          {/* Stats */}
          <div className="md:col-span-6 grid grid-cols-3 gap-6 text-center items-center">
            <div className="flex flex-col">
              <span className="font-['Playfair_Display'] text-5xl font-bold text-[#2C1810] mb-2">3</span>
              <span className="text-[10px] md:text-xs font-sans uppercase tracking-widest border-t border-[#1a1a1a] pt-2 inline-block mx-auto">Digests<br />Generated</span>
            </div>
            <div className="flex flex-col relative">
              <div className="absolute -left-3 top-2 bottom-2 border-l border-dashed border-[#d1c8b4]"></div>
              <span className="font-['Playfair_Display'] text-5xl font-bold text-[#2C1810] mb-2">47</span>
              <span className="text-[10px] md:text-xs font-sans uppercase tracking-widest border-t border-[#1a1a1a] pt-2 inline-block mx-auto">Stories<br />Read</span>
              <div className="absolute -right-3 top-2 bottom-2 border-r border-dashed border-[#d1c8b4]"></div>
            </div>
            <div className="flex flex-col">
              <span className="font-['Playfair_Display'] text-5xl font-bold text-[#2C1810] mb-2">8</span>
              <span className="text-[10px] md:text-xs font-sans uppercase tracking-widest border-t border-[#1a1a1a] pt-2 inline-block mx-auto">Sources<br />Tracked</span>
            </div>
          </div>
        </div>

        {/* Headlines Section */}
        <div className="mb-8">
          <h2 className="font-['Playfair_Display'] text-2xl font-bold border-b-2 border-[#1a1a1a] pb-2 mb-8 uppercase tracking-widest flex items-center gap-4 text-[#2C1810]">
            <span className="w-full h-[2px] bg-[#1a1a1a] flex-1"></span>
            Today's Front Page
            <span className="w-full h-[2px] bg-[#1a1a1a] flex-1"></span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 relative">
            {/* Decorative divider between columns */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 border-r border-[#1a1a1a] -translate-x-1/2"></div>

            {/* Column 1 */}
            <div className="flex flex-col gap-8 md:pr-2">
              <article>
                <h3 className="font-['Playfair_Display'] text-3xl md:text-4xl font-bold leading-tight mb-4 text-[#1a1a1a] hover:text-[#4a3b32] transition-colors cursor-pointer">
                  OpenAI Unveils Breakthrough Reasoning Model 'Orion'
                </h3>
                <p className="text-sm italic text-gray-600 mb-4 font-['Playfair_Display'] border-y border-[#d1c8b4] py-1 inline-block">By Matt Levine · The Information · 4 min read</p>
                <p className="first-letter:text-7xl first-letter:font-['Playfair_Display'] first-letter:font-black first-letter:mr-2 first-letter:float-left first-letter:leading-none text-base leading-relaxed text-[#1a1a1a]/90 text-justify">
                  In a sweeping announcement that sent ripples through Silicon Valley, OpenAI has introduced its next-generation reasoning engine. Sources familiar with the matter suggest the model demonstrates significant improvements in multi-step logical deduction, a frontier previously thought to be years away from realization. The implications for automated software engineering and legal analysis are profound, sparking immediate reactions from industry leaders and regulatory bodies alike.
                </p>
              </article>

              <div className="border-t-[3px] double border-[#1a1a1a] pt-6 mt-2">
                <article>
                  <h3 className="font-['Playfair_Display'] text-2xl font-bold leading-tight mb-3 hover:text-[#4a3b32] transition-colors cursor-pointer">
                    Tech Stocks Rally as Fed Signals Potential Rate Cuts
                  </h3>
                  <p className="text-sm italic text-gray-600 mb-3 font-['Playfair_Display'] border-y border-[#d1c8b4] py-1 inline-block">By Robin Wigglesworth · Financial Times</p>
                  <p className="text-base leading-relaxed text-[#1a1a1a]/90 text-justify">
                    Markets responded vigorously to Chairman Powell's latest remarks, with the Nasdaq Composite surging 2.4% in afternoon trading. Investors are increasingly pricing in a monetary easing cycle beginning as early as September.
                  </p>
                </article>
              </div>
            </div>

            {/* Column 2 */}
            <div className="flex flex-col gap-8 md:pl-2">
              <article>
                <div className="mb-6 border-4 border-double border-[#1a1a1a] p-1 bg-white">
                  <div className="aspect-[4/3] bg-[#e8e0cc] flex items-center justify-center overflow-hidden group cursor-pointer relative">
                    <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors"></div>
                    <div className="font-['Playfair_Display'] text-lg italic text-[#1a1a1a]/40 border border-[#1a1a1a]/20 p-4 text-center w-[80%]">
                      [Engraving Depicting Modern Industry]
                    </div>
                  </div>
                </div>
                <h3 className="font-['Playfair_Display'] text-3xl font-bold leading-tight mb-4 hover:text-[#4a3b32] transition-colors cursor-pointer">
                  The Quiet Renaissance of Hardware Startups
                </h3>
                <p className="text-sm italic text-gray-600 mb-4 font-['Playfair_Display'] border-y border-[#d1c8b4] py-1 inline-block">By Ben Thompson · Stratechery · 8 min read</p>
                <p className="text-base leading-relaxed text-[#1a1a1a]/90 text-justify">
                  After a decade dominated by SaaS and pure software plays, a new wave of founders is returning to atoms. Driven by commoditized supply chains and advances in rapid prototyping, hardware is no longer the VC taboo it once was. From custom silicon for AI inference to robotics in agriculture, the physical world is once again becoming a canvas for technological innovation.
                </p>
              </article>
            </div>
          </div>
        </div>

        {/* Footer / Empty State */}
        <div className="mt-16 pt-8 border-t-[4px] double border-[#2C1810] text-center">
          <p className="font-['Playfair_Display'] text-xl italic text-[#4a3b32]">
            Add your favourite newsletters in <span className="font-bold border-b border-[#2C1810] hover:text-[#1a1a1a] transition-colors cursor-pointer">Sources</span> to get started →
          </p>
        </div>
      </div>
    </div>
  );
}
