import { openai } from "@workspace/integrations-openai-ai-server";
import { parse } from "node-html-parser";
import { logger } from "./logger";

export interface EmailContent {
  senderId: number;
  senderEmail: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  receivedAt: Date;
}

export interface ProcessedStory {
  headline: string;
  summary: string;
  whyItMatters: string;
  takeaways: string[];
  sourceUrl: string | null;
  sourceName: string | null;
  relevanceScore: number;
  section: "top_stories" | "funding_ipos" | "ai_software" | "trends" | "takeaways" | "watch" | "links";
}

export interface DigestOutput {
  sections: {
    type: "top_stories" | "funding_ipos" | "ai_software" | "trends" | "takeaways" | "watch" | "links";
    title: string;
    stories: ProcessedStory[];
  }[];
}

export interface FeedbackContext {
  likedTopics: string[];
  dislikedTopics: string[];
}

function stripHtml(html: string): string {
  try {
    const root = parse(html);
    return root.text.replace(/\s+/g, " ").trim();
  } catch {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
}

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "...";
}

export async function processEmailsIntoDigest(
  emails: EmailContent[],
  feedback?: FeedbackContext
): Promise<DigestOutput> {
  if (emails.length === 0) {
    return { sections: buildEmptySections() };
  }

  const emailSummaries = emails.map((e, i) => {
    const text = e.bodyText
      ? truncate(e.bodyText, 3000)
      : truncate(stripHtml(e.bodyHtml), 3000);
    return `--- NEWSLETTER ${i + 1} ---
From: ${e.senderEmail}
Subject: ${e.subject}
Date: ${e.receivedAt.toISOString()}
Content:
${text}`;
  });

  const combined = emailSummaries.join("\n\n");

  let preferenceBlock = "";
  if (feedback && (feedback.likedTopics.length > 0 || feedback.dislikedTopics.length > 0)) {
    preferenceBlock = `
LEARNED PREFERENCES (from Wout's past ratings — use these to adjust relevanceScore):
- Previously enjoyed: ${feedback.likedTopics.length > 0 ? feedback.likedTopics.join(" | ") : "none yet"}
- Previously disliked or skipped: ${feedback.dislikedTopics.length > 0 ? feedback.dislikedTopics.join(" | ") : "none yet"}
Boost relevanceScore for stories similar to liked ones. Lower it for anything like the disliked ones.
`;
  }

  const systemPrompt = `You are Wout's personal morning editor. Your job is to read through all his newsletters, pull out exactly what's relevant to him, throw away everything that isn't, and present it in a warm, clear, friendly newspaper style — like a smart colleague who read everything so he didn't have to.

WHO WOUT IS AND WHAT HE CARES ABOUT:
Wout works in the world of AI, B2B SaaS, go-to-market strategy, and startups. He follows newsletters on GTM, revenue leadership, product-led growth, AI tools, startup funding, and tech trends. His reading is professional — he wants to stay sharp on what's moving in his world.

WHAT TO INCLUDE (these matter to Wout):
- AI tools, models, and business applications — especially for GTM, sales, and SaaS
- Go-to-market strategy: new plays, frameworks, what's working in sales and marketing
- Revenue leadership: how companies are structuring and scaling their revenue orgs
- Product-led growth and growth strategy
- SaaS metrics, benchmarks, and business model insights
- Startup funding rounds, IPOs, and acquisitions (especially B2B/AI)
- Emerging software tools that could help him or his work
- Founder insights and lessons from building companies
- Venture capital trends and what investors are betting on
- Genuinely interesting tech or business ideas worth knowing

WHAT TO CUT — ruthlessly (do not include these):
- Sponsored content, ads, or affiliate links — even if disguised as editorial
- Referral programs, "share with a friend", discount offers
- Newsletter housekeeping (intros, outros, "this week in...", "welcome new readers")
- Unsubscribe instructions, footers, legal text
- Consumer tech gossip, celebrity news, lifestyle content
- Crypto/web3 unless directly tied to AI or SaaS business models
- Vague market commentary with no specific insight ("markets are uncertain...")
- Political news unless it directly affects tech or startup ecosystem
- Generic motivational content or platitudes
- Anything you've already covered — no duplicate stories
- Anything with a relevanceScore below 35 — just skip it entirely
${preferenceBlock}
WRITING STYLE — this is important:
- Write like you're telling Wout over morning coffee, not writing a corporate report
- Headlines: direct and punchy, 6-10 words — tell the news, don't tease it
- Summaries: 2-3 plain sentences. Start with what happened, then why it's interesting. No jargon unless it's necessary, and if it is, briefly explain it. Never start with "This" or a company name — lead with the news.
- Takeaways: 1-3 short, sharp bullets. Each one should be a genuinely useful thought Wout can carry into his day. Max 20 words each. Start each with an action verb or concrete observation.
- Friendly but not fluffy. Informative but not dry. Smart but not condescending.

SECTION TYPES:
- top_stories: The 3-5 most important and relevant stories today, ranked by significance to Wout
- funding_ipos: Funding rounds, IPOs, M&A deals worth knowing about
- ai_software: AI developments, new tools, software launches that matter for business
- trends: GTM, SaaS, and startup ecosystem shifts and emerging patterns
- takeaways: Practical insights and lessons Wout can actually use
- watch: Things moving that are worth keeping an eye on this week
- links: Genuinely useful articles, tools, or resources (not promotional)

For each story output:
- headline: 6-10 words, punchy, tells the news directly
- summary: 2-3 sentences in plain conversational English — what happened and why it's interesting
- whyItMatters: 1 sentence — so what? Why does this matter to Wout specifically?
- takeaways: array of 1-3 short bullet strings (max 20 words each) — practical, sharp, action-oriented
- sourceUrl: the most relevant URL mentioned in the content, or null
- sourceName: the newsletter or publication name (short form, e.g. "Lenny's Newsletter" not the full email)
- relevanceScore: 1-100 based on how relevant and important this is to Wout's world. Only include stories scoring 35+.
- section: one of the section types above

Return ONLY valid JSON:
{
  "stories": [
    {
      "headline": "string",
      "summary": "string",
      "whyItMatters": "string",
      "takeaways": ["string", "string"],
      "sourceUrl": "string or null",
      "sourceName": "string or null",
      "relevanceScore": number,
      "section": "top_stories|funding_ipos|ai_software|trends|takeaways|watch|links"
    }
  ]
}`;

  const userPrompt = `Process the following newsletters and extract the highest-signal stories:\n\n${combined}`;

  let stories: ProcessedStory[] = [];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: truncate(userPrompt, 50000) },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as { stories?: ProcessedStory[] };
    stories = (parsed.stories ?? []).map((s) => ({
      ...s,
      takeaways: Array.isArray(s.takeaways) ? s.takeaways : [],
    }));
  } catch (err) {
    logger.error({ err }, "AI processing failed");
    stories = [];
  }

  return buildDigestFromStories(stories);
}

function buildDigestFromStories(stories: ProcessedStory[]): DigestOutput {
  const sectionDefs = [
    { type: "top_stories" as const, title: "Top Stories" },
    { type: "funding_ipos" as const, title: "Funding Rounds & IPOs" },
    { type: "ai_software" as const, title: "AI & Software" },
    { type: "trends" as const, title: "Startup & Tech Trends" },
    { type: "takeaways" as const, title: "Important Takeaways" },
    { type: "watch" as const, title: "Things To Watch" },
    { type: "links" as const, title: "Useful Links" },
  ];

  const sortedAll = [...stories].sort((a, b) => b.relevanceScore - a.relevanceScore);

  const sections = sectionDefs.map((def) => {
    let sectionStories: ProcessedStory[];
    if (def.type === "top_stories") {
      sectionStories = sortedAll.slice(0, 5);
    } else {
      sectionStories = stories
        .filter((s) => s.section === def.type)
        .sort((a, b) => b.relevanceScore - a.relevanceScore);
    }
    return { type: def.type, title: def.title, stories: sectionStories };
  });

  return { sections };
}

function buildEmptySections(): DigestOutput["sections"] {
  return [
    { type: "top_stories", title: "Top Stories", stories: [] },
    { type: "funding_ipos", title: "Funding Rounds & IPOs", stories: [] },
    { type: "ai_software", title: "AI & Software", stories: [] },
    { type: "trends", title: "Startup & Tech Trends", stories: [] },
    { type: "takeaways", title: "Important Takeaways", stories: [] },
    { type: "watch", title: "Things To Watch", stories: [] },
    { type: "links", title: "Useful Links", stories: [] },
  ];
}
