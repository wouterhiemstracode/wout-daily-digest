import { openai } from "@workspace/integrations-openai-ai-server";
import { batchProcess } from "@workspace/integrations-openai-ai-server/batch";
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

export async function processEmailsIntoDigest(emails: EmailContent[]): Promise<DigestOutput> {
  if (emails.length === 0) {
    return { sections: buildEmptySections() };
  }

  // Build combined email content for the AI
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

  const systemPrompt = `You are an elite intelligence analyst specializing in tech, startups, AI, and business. 
Your job is to process multiple newsletter emails and extract only the highest-signal information, then organize it into a structured daily briefing.

PRIORITIES (extract these):
- Startup funding rounds (all sizes)
- IPO announcements and preparations
- Acquisitions and mergers
- AI model releases, breakthroughs, and business developments
- Software and SaaS trends
- Tech industry shifts and notable moves
- Emerging tools, products, and platforms
- Automation workflows and productivity tools
- Startup ecosystem trends
- Business and technology trends
- Global news relevant to tech/business

DEPRIORITIZE (skip or minimize):
- Sponsored content and ads
- Referral programs and promotional offers
- Generic newsletter intros/outros and "About us" sections
- Unsubscribe links and footer sections
- Creator economy content
- E-commerce content
- Generic market commentary without specific signal
- Generic investing advice
- Political commentary without clear tech/business relevance
- Self-promotional content
- Duplicate stories already covered in a previous item

SECTION TYPES:
- top_stories: The 3-5 most important stories of the day, ranked by significance
- funding_ipos: Funding rounds, IPOs, M&A deals
- ai_software: AI developments, software launches, developer tools
- trends: Startup ecosystem, industry shifts, emerging patterns
- takeaways: Key insights and lessons, actionable intelligence
- watch: Things to monitor closely in coming days/weeks
- links: Useful resources, tools, or articles worth bookmarking

For each story, provide:
- headline: 5-10 words, punchy
- summary: 2-4 sentences of clear, dense information
- whyItMatters: 1-2 sentences explaining the significance
- sourceUrl: URL if clearly mentioned in the content, otherwise null
- sourceName: Publication or newsletter name
- relevanceScore: 1-100 (100 = critical, must-know; 50 = interesting; 1 = marginal)
- section: one of the section types above

Return ONLY valid JSON matching this exact schema:
{
  "stories": [
    {
      "headline": "string",
      "summary": "string",
      "whyItMatters": "string",
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
    stories = parsed.stories ?? [];
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

  // Assign top stories: top 5 by relevance score across all sections
  const sortedAll = [...stories].sort((a, b) => b.relevanceScore - a.relevanceScore);
  const topStoryIds = new Set(sortedAll.slice(0, 5).map((s, i) => i));

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
