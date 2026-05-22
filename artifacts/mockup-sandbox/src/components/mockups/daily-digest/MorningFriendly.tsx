import React from "react";
import { Coffee, Mail, RefreshCw, Sparkles, BookOpen, Layers, Rss, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import "./morning-friendly.css";

export function MorningFriendly() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen morning-bg text-stone-800 font-sans selection:bg-amber-100">
      <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
        
        {/* Masthead */}
        <header className="mb-10 text-center space-y-4">
          <div className="flex justify-center mb-6">
             <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 hover:bg-green-50 px-3 py-1 font-normal text-sm flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                Gmail connected · wouterhiemstracode@gmail.com
             </Badge>
          </div>
          
          <h1 className="font-['Playfair_Display'] text-5xl md:text-6xl font-bold tracking-tight text-stone-900 flex items-center justify-center gap-4">
            Wout's Daily Digest
            <Coffee className="w-10 h-10 text-amber-500 stroke-[2.5]" />
          </h1>
          
          <div className="flex flex-col items-center justify-center gap-1 mt-4 text-stone-500">
            <p className="text-xl font-medium text-stone-700">Good morning, Wout! Here's what you missed.</p>
            <p className="text-sm uppercase tracking-widest">{today}</p>
          </div>
        </header>

        <Separator className="bg-stone-200/60 my-8" />

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Button variant="outline" className="h-12 px-6 rounded-full border-stone-200 hover:bg-stone-100 hover:text-stone-900 text-stone-600 bg-white shadow-sm font-medium transition-all">
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync my newsletters
          </Button>
          <Button className="h-12 px-8 rounded-full bg-accent-morning hover:bg-accent-morning/90 text-white shadow-md shadow-amber-500/20 font-medium transition-all border-none">
            <Sparkles className="w-4 h-4 mr-2" />
            Generate today's briefing
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <Card className="border-stone-200/60 shadow-sm bg-white/50 backdrop-blur-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100/50 flex items-center justify-center text-amber-600">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-['Playfair_Display'] font-bold text-stone-900">3</p>
                <p className="text-sm font-medium text-stone-500">digests ready</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-stone-200/60 shadow-sm bg-white/50 backdrop-blur-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-100/50 flex items-center justify-center text-orange-600">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-['Playfair_Display'] font-bold text-stone-900">47</p>
                <p className="text-sm font-medium text-stone-500">stories curated</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-stone-200/60 shadow-sm bg-white/50 backdrop-blur-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-rose-100/50 flex items-center justify-center text-rose-600">
                <Rss className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-['Playfair_Display'] font-bold text-stone-900">8</p>
                <p className="text-sm font-medium text-stone-500">sources active</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Briefing Preview */}
        <section className="mb-12">
          <h2 className="font-['Playfair_Display'] text-3xl font-bold text-stone-900 mb-8 pb-4 border-b border-stone-200/60 flex items-center gap-3">
            Today's Top Stories ☀️
          </h2>
          
          <div className="space-y-8">
            {/* Story 1 */}
            <article className="group">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="bg-stone-100 text-stone-600 hover:bg-stone-200 border-none rounded-md px-2 py-0.5 text-xs font-medium">
                    TechCrunch · 2h ago
                  </Badge>
                </div>
                <h3 className="text-2xl font-['Playfair_Display'] font-bold text-stone-900 leading-snug group-hover:text-amber-600 transition-colors cursor-pointer">
                  OpenAI unveils specialized reasoning models for complex logic tasks
                </h3>
                <p className="text-stone-600 leading-relaxed text-lg">
                  The new "o1" series aims to solve harder problems in physics, coding, and math by spending more time thinking before answering.
                </p>
              </div>
            </article>

            <Separator className="bg-stone-200/40" />

            {/* Story 2 */}
            <article className="group">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="bg-stone-100 text-stone-600 hover:bg-stone-200 border-none rounded-md px-2 py-0.5 text-xs font-medium">
                    The Verge · 4h ago
                  </Badge>
                </div>
                <h3 className="text-2xl font-['Playfair_Display'] font-bold text-stone-900 leading-snug group-hover:text-amber-600 transition-colors cursor-pointer">
                  Apple Intelligence features finally arrive in iOS 18.1 developer beta
                </h3>
                <p className="text-stone-600 leading-relaxed text-lg">
                  Users can now test out notification summaries, writing tools, and a redesigned Siri interface, though ChatGPT integration is still pending.
                </p>
              </div>
            </article>

            <Separator className="bg-stone-200/40" />

            {/* Story 3 */}
            <article className="group">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="bg-stone-100 text-stone-600 hover:bg-stone-200 border-none rounded-md px-2 py-0.5 text-xs font-medium">
                    Stratechery · 8h ago
                  </Badge>
                </div>
                <h3 className="text-2xl font-['Playfair_Display'] font-bold text-stone-900 leading-snug group-hover:text-amber-600 transition-colors cursor-pointer">
                  The End of the Aggregation Era
                </h3>
                <p className="text-stone-600 leading-relaxed text-lg">
                  As infinite AI content floods the internet, the value shifts from aggregating supply to trusted curation and verified human insight.
                </p>
              </div>
            </article>
          </div>
        </section>

        {/* Bottom Nudge */}
        <div className="bg-amber-50 border border-amber-100/50 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4 text-amber-900 font-medium text-lg">
            <span className="text-2xl">🗞️</span>
            Add your first newsletter source to get started!
          </div>
          <Button variant="ghost" className="text-amber-700 hover:text-amber-800 hover:bg-amber-100 font-semibold rounded-full px-6">
            Head to Sources
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

      </div>
    </div>
  );
}
