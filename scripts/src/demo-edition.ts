/**
 * A sample edition shaped like the digests the API writes: Top Stories holds the five most
 * relevant stories, every story appears once, and each has body paragraphs.
 * Used by `pnpm --filter @workspace/scripts run seed-demo` and the frontend's e2e tests.
 */

export const demoSenders = [
  { email: "lenny@substack.com", name: "Lenny’s Newsletter" },
  { email: "pragmaticengineer@substack.com", name: "The Pragmatic Engineer" },
  { email: "thebatch@deeplearning.ai", name: "The Batch" },
  { email: "dan@tldrnewsletter.com", name: "TLDR" },
  { email: "email@stratechery.com", name: "Stratechery" },
  { email: "hello@densediscovery.com", name: "Dense Discovery" },
];

export interface DemoStory {
  headline: string;
  summary: string;
  whyItMatters: string;
  takeaways: string[];
  body: string[];
  pullQuote: string | null;
  sourceName: string;
  sourceUrl: string | null;
  relevanceScore: number;
}

export const demoEdition: {
  intro: string;
  sections: { type: string; title: string; stories: DemoStory[] }[];
} = {
  intro:
    "Good evening, Wout. Today: practical AI workflows, better developer experiences, and a few ideas for protecting your focus. Here’s what’s worth your attention.",
  sections: [
    {
      type: "top_stories",
      title: "Top Stories",
      stories: [
        {
          headline: "AI agents are becoming a workflow, not a feature",
          summary:
            "Teams are moving beyond chat interfaces and putting AI into the repeatable parts of their work: research, drafting, and review. The most effective pilots keep a person responsible for each decision.",
          whyItMatters: "Design around a complete job rather than an isolated prompt.",
          takeaways: ["Start with a small, measurable workflow.", "Keep approvals visible and reversible."],
          body: [
            "For two years, adding AI to a product mostly meant adding a box to type into. It demoed well and then sat quiet, because people went back to the work they were already doing somewhere else.",
            "The teams seeing real value now treat a model as one step in a workflow they already run every week. Research, first drafts, review and routing come up most, because each has a clear input, a clear output and an owner.",
            "One product lead’s weekly competitor digest used to take a researcher most of Monday. An agent now gathers the week’s changes overnight and drafts a summary of each. The researcher still reads every line, but starts from a draft.",
            "The pilots that last share three habits. They start with a job small enough to measure. They keep the person who owned the work responsible for the decision. And every claim the agent makes links back to where it came from.",
          ],
          pullQuote: "The interesting surface is no longer the prompt box. It is the hand-off.",
          sourceName: "Lenny’s Newsletter",
          sourceUrl: "https://www.lennysnewsletter.com/",
          relevanceScore: 96,
        },
        {
          headline: "What platform teams measure when developer tools grow up",
          summary:
            "Engineering leaders judge internal tools by time saved, adoption and fewer interruptions. Counting shipped features turned out to say little.",
          whyItMatters: "Measure the developer’s day, not the tool’s roadmap.",
          takeaways: ["Track interruptions per engineer.", "Ask what people stopped doing by hand."],
          body: [
            "Platform teams used to report on what they shipped. The better ones now report on what changed for the people who use their tools.",
            "Three numbers come up again and again: hours saved per week, the share of teams actually using a tool, and how often engineers get pulled out of focus.",
          ],
          pullQuote: null,
          sourceName: "The Pragmatic Engineer",
          sourceUrl: "https://newsletter.pragmaticengineer.com/",
          relevanceScore: 92,
        },
        {
          headline: "Smaller models find a place in everyday AI products",
          summary:
            "Specialised models handle classification and summarisation for a fraction of the cost. Larger models are kept for the hard reasoning.",
          whyItMatters: "A mixed-model setup can make AI features faster and cheaper.",
          takeaways: ["Route easy tasks to small models.", "Evaluate on your own tasks, not benchmarks."],
          body: [
            "Most requests an AI product handles are routine: sort this, tag that, shorten this paragraph. Small models do these well, quickly and cheaply.",
            "Teams that route by difficulty report lower bills and faster responses, with the large model reserved for the few requests that need it.",
          ],
          pullQuote: null,
          sourceName: "The Batch",
          sourceUrl: "https://www.deeplearning.ai/the-batch/",
          relevanceScore: 90,
        },
        {
          headline: "Designing for focus in a world of constant updates",
          summary:
            "Product teams are cutting notifications back to what someone can act on. Fewer, calmer alerts get more attention.",
          whyItMatters: "Every alert spends some of the user’s attention.",
          takeaways: ["Batch low-priority updates.", "Let people choose quiet hours."],
          body: [
            "Notification counts went up for a decade. The products people now call calm are the ones that send less, and only when there is something to do.",
          ],
          pullQuote: null,
          sourceName: "Dense Discovery",
          sourceUrl: "https://www.densediscovery.com/",
          relevanceScore: 84,
        },
        {
          headline: "The next wave of software distribution is inside the workflow",
          summary:
            "Where a product shows up in someone’s day can matter as much as what it does. Integrations are becoming the storefront.",
          whyItMatters: "Being present in the tools people already use beats a better landing page.",
          takeaways: ["Ship where your users already work."],
          body: [
            "Software used to be found in app stores and search results. Increasingly it is found inside other tools, at the moment someone needs it.",
          ],
          pullQuote: null,
          sourceName: "Stratechery",
          sourceUrl: "https://stratechery.com/",
          relevanceScore: 82,
        },
      ],
    },
    {
      type: "how_i_ai",
      title: "How I AI",
      stories: [
        {
          headline: "How one product team uses AI to turn interviews into decisions",
          summary:
            "A product lead runs every customer interview through a simple AI workflow. Themes come out the same day, and each one links to the original quote.",
          whyItMatters: "Research only helps if it reaches the people deciding.",
          takeaways: ["Keep links back to the original interview.", "Separate what people said from what you concluded."],
          body: [
            "After each customer call, the transcript goes to an assistant that pulls out recurring themes and quotes the lines behind them.",
            "The team reviews the themes on Friday and decides what to act on. Nothing goes into the roadmap without a quote attached.",
          ],
          pullQuote: null,
          sourceName: "Lenny’s Newsletter",
          sourceUrl: "https://www.lennysnewsletter.com/",
          relevanceScore: 88,
        },
      ],
    },
    {
      type: "product",
      title: "Product & Design",
      stories: [
        {
          headline: "A practical framework for prioritising product bets",
          summary: "Score each bet on reach, confidence and effort, then revisit the scores monthly.",
          whyItMatters: "Written-down bets are easier to drop when they stop paying off.",
          takeaways: ["Revisit scores every month."],
          body: ["The framework is deliberately plain. Its value is that the team argues about the inputs, not the answer."],
          pullQuote: null,
          sourceName: "Lenny’s Newsletter",
          sourceUrl: null,
          relevanceScore: 74,
        },
        {
          headline: "Building calmer notification experiences",
          summary: "Group updates into one daily digest and let urgent items through on their own.",
          whyItMatters: "People mute products that interrupt them too often.",
          takeaways: [],
          body: [],
          pullQuote: null,
          sourceName: "Dense Discovery",
          sourceUrl: null,
          relevanceScore: 66,
        },
      ],
    },
    {
      type: "engineering",
      title: "Engineering & AI",
      stories: [
        {
          headline: "What reliable AI evaluation looks like in production",
          summary: "Teams keep a fixed set of real tasks and re-run it on every model or prompt change.",
          whyItMatters: "Without an eval set, every change is a guess.",
          takeaways: ["Collect real failures into the eval set."],
          body: ["The eval set starts small, around fifty real examples, and grows every time something breaks in production."],
          pullQuote: null,
          sourceName: "The Batch",
          sourceUrl: null,
          relevanceScore: 78,
        },
        {
          headline: "Why engineering onboarding needs a clear first win",
          summary: "New engineers who ship something in week one stay more engaged.",
          whyItMatters: "A first win teaches the codebase faster than any document.",
          takeaways: [],
          body: [],
          pullQuote: null,
          sourceName: "The Pragmatic Engineer",
          sourceUrl: null,
          relevanceScore: 64,
        },
      ],
    },
    {
      type: "jobs",
      title: "Job Openings",
      stories: [
        {
          headline: "Senior Product Designer · Developer Experience · Remote",
          summary: "Design the tools engineers use every day, from CLI to dashboard.",
          whyItMatters: "A role where calm, clear design is the product.",
          takeaways: [],
          body: [],
          pullQuote: null,
          sourceName: "Lenny’s Newsletter",
          sourceUrl: null,
          relevanceScore: 70,
        },
        {
          headline: "AI Product Engineer · Applied Workflows · Amsterdam",
          summary: "Build agent workflows with a small product team.",
          whyItMatters: "Hands-on work on exactly the shift in today’s lead story.",
          takeaways: [],
          body: [],
          pullQuote: null,
          sourceName: "TLDR",
          sourceUrl: null,
          relevanceScore: 68,
        },
      ],
    },
  ],
};
