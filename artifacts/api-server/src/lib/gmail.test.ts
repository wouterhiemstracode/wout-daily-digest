import { describe, expect, it } from "vitest";
import { isNewsletter, parseFrom } from "./gmail";

const h = (from: string, subject: string, extra: Record<string, string> = {}) => [
  { name: "From", value: from },
  { name: "Subject", value: subject },
  ...Object.entries(extra).map(([name, value]) => ({ name, value })),
];
const unsubscribe = { "List-Unsubscribe": "<https://example.com/unsub>" };

describe("parseFrom", () => {
  it("splits a display name from the address", () => {
    expect(parseFrom('"Lenny\'s Newsletter" <Lenny@Substack.com>')).toEqual({ email: "lenny@substack.com", name: "Lenny's Newsletter" });
    expect(parseFrom("The Batch <thebatch@deeplearning.ai>")).toEqual({ email: "thebatch@deeplearning.ai", name: "The Batch" });
  });
  it("handles a bare address", () => {
    expect(parseFrom("dan@tldrnewsletter.com")).toEqual({ email: "dan@tldrnewsletter.com", name: null });
  });
});

describe("isNewsletter", () => {
  it("accepts mailing-list mail", () => {
    expect(isNewsletter(h("Lenny <lenny@substack.com>", "How I AI: Sarah Chen", unsubscribe))).toBe(true);
    expect(isNewsletter(h("TLDR <dan@tldrnewsletter.com>", "Smaller models win", { "List-Id": "<tldr.list>" }))).toBe(true);
    expect(isNewsletter(h("Digest <news@example.com>", "This week", { Precedence: "bulk" }))).toBe(true);
  });
  it("rejects personal mail without list headers", () => {
    expect(isNewsletter(h("Anna <anna@example.com>", "Lunch tomorrow?"))).toBe(false);
  });
  it("rejects receipts, security mails and promotions", () => {
    expect(isNewsletter(h("Shop <orders@shop.com>", "Your order has shipped", unsubscribe))).toBe(false);
    expect(isNewsletter(h("Bank <no-reply@bank.com>", "Security alert: new sign-in", unsubscribe))).toBe(false);
    expect(isNewsletter(h("Store <deals@store.com>", "40% off everything", unsubscribe))).toBe(false);
  });
  it("rejects app notifications", () => {
    expect(isNewsletter(h("GitHub <notifications@github.com>", "[repo] New issue", { "List-Id": "<repo.github.com>" }))).toBe(false);
    expect(isNewsletter(h("Slack <feedback@slack.com>", "New messages", unsubscribe))).toBe(false);
  });
});
