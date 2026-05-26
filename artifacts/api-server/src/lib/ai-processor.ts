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
  section: "top_stories" | "funding_ipos" | "ai_software" | "trends" | "takeaways" | "watch" | "links" | "how_i_ai";
}

export interface DigestOutput {
  intro: string;
  sections: {
    type: "top_stories" | "funding_ipos" | "ai_software" | "trends" | "takeaways" | "watch" | "links" | "how_i_ai" | "jobs";
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
    return buildEmptySections();
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
WRITING STYLE — read this carefully, it is the most important instruction:

Wout reads this in bed on his phone first thing in the morning. His brain is not fully on yet. Write accordingly.

GOLDEN RULE: If a sentence takes more than 5 seconds to read, rewrite it. Short sentences only. One idea per sentence. No semicolons. No em dashes mid-sentence. No jargon.

Headlines:
- Tell the whole story in 6-8 words. No teasing, no clickbait. Just the news.
- Bad: "A new development in the AI space raises questions"
- Good: "OpenAI launches an AI that writes code for you"

Summaries — MAXIMUM 2 SHORT SENTENCES:
- Sentence 1: What happened? Plain and direct.
- Sentence 2: Why is it interesting or different?
- Use words a smart 16-year-old would understand. If you need a technical term, explain it in the same sentence.
- Never start with "This", "The", or a company name. Lead with the news itself.
- Bad: "Anthropic has released Claude 3.7 Sonnet, a new model that demonstrates enhanced reasoning capabilities across multiple domains, signaling a continued push toward more capable AI systems."
- Good: "Anthropic released a smarter version of its AI assistant Claude. It's noticeably better at figuring out complex problems step by step."

Takeaways — treat these like a text from a smart friend:
- 1-3 bullets max. Each one under 15 words.
- Answer "so what?" in plain language. No insider language.
- Bad: "This represents a paradigm shift in GTM motion architecture"
- Good: "Sales teams that don't adopt AI tools will fall behind fast"
- Each bullet should be something Wout can remember 10 minutes after reading it.

Intro: Casual, warm, 1-2 short sentences. Like a friend texting before a meeting.

SECTION TYPES:
- top_stories: The 3-5 most important and relevant stories today, ranked by significance to Wout
- funding_ipos: Funding rounds, IPOs, M&A deals worth knowing about
- ai_software: AI developments, new tools, software launches that matter for business
- trends: GTM, SaaS, and startup ecosystem shifts and emerging patterns
- takeaways: Practical insights and lessons Wout can actually use
- watch: Things moving that are worth keeping an eye on this week
- links: Genuinely useful articles, tools, or resources (not promotional)
- how_i_ai: SPECIAL — only use this if Lenny's Newsletter contains a "How I AI" feature. Extract that specific feature as a single story. The headline should be the person's name and role (e.g. "Sarah Chen, Head of Growth at Acme"). The summary should explain what they shared about using AI. The takeaways should be their 1-3 most useful AI tips or habits. If there is no "How I AI" feature in Lenny's Newsletter today, do not create a how_i_ai story.
- jobs: Job openings mentioned in any newsletter. Each story = one job. Headline format: "Role · Company · Location". Summary: 1-2 sentences on what the role is and why it's interesting. Only include roles relevant to Wout's world (GTM, revenue, growth, AI, product, SaaS leadership — no engineering or unrelated roles). Max 5 jobs total. If no relevant jobs are mentioned, skip this section entirely.

For each story output:
- headline: 6-8 words, tells the full story directly — no teasing
- summary: EXACTLY 2 short sentences. Plain language only. Max 30 words total.
- whyItMatters: 1 short sentence — "so what?" in plain language, under 15 words
- takeaways: 1-3 bullets, each under 15 words, plain conversational language
- sourceUrl: the most relevant URL mentioned in the content, or null
- sourceName: the newsletter or publication name (short form, e.g. "Lenny's Newsletter" not the full email)
- relevanceScore: 1-100 based on how relevant and important this is to Wout's world. Only include stories scoring 35+.
- section: one of the section types above

Also generate a short "intro" field: a warm, friendly 1-2 sentence good morning note. Mention roughly how many stories there are and what the main themes are today. Keep it light and human — like a colleague poking their head in before a meeting. Example tone: "Good morning! Busy one today — 9 stories, mostly AI tooling and a couple of interesting funding rounds."

Return ONLY valid JSON:
{
  "intro": "string",
  "stories": [
    {
      "headline": "string",
      "summary": "string",
      "whyItMatters": "string",
      "takeaways": ["string", "string"],
      "sourceUrl": "string or null",
      "sourceName": "string or null",
      "relevanceScore": number,
      "section": "top_stories|funding_ipos|ai_software|trends|takeaways|watch|links|how_i_ai"
    }
  ]
}`;

  const userPrompt = `Process the following newsletters and extract the highest-signal stories:\n\n${combined}`;

  let stories: ProcessedStory[] = [];
  let intro = "";

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
    const parsed = JSON.parse(content) as { intro?: string; stories?: ProcessedStory[] };
    intro = parsed.intro ?? "";
    stories = (parsed.stories ?? []).map((s) => ({
      ...s,
      takeaways: Array.isArray(s.takeaways) ? s.takeaways : [],
    }));
  } catch (err) {
    logger.error({ err }, "AI processing failed");
    stories = [];
  }

  return buildDigestFromStories(stories, intro);
}

function buildDigestFromStories(stories: ProcessedStory[], intro = ""): DigestOutput {
  const sectionDefs = [
    { type: "top_stories" as const, title: "Top Stories" },
    { type: "funding_ipos" as const, title: "Funding Rounds & IPOs" },
    { type: "ai_software" as const, title: "AI & Software" },
    { type: "trends" as const, title: "Startup & Tech Trends" },
    { type: "takeaways" as const, title: "Important Takeaways" },
    { type: "watch" as const, title: "Things To Watch" },
    { type: "links" as const, title: "Useful Links" },
    { type: "how_i_ai" as const, title: "How I AI" },
    { type: "jobs" as const, title: "Job Openings" },
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

  return { intro, sections };
}

function buildEmptySections(): DigestOutput {
  return { intro: "", sections: buildEmptySectionList() };
}

function buildEmptySectionList(): DigestOutput["sections"] {
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
