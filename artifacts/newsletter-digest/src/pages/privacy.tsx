import { Masthead } from "@/components/press/primitives";

/** Public privacy policy; Google's consent screen links here. Reachable without signing in. */
export default function Privacy() {
  return (
    <div className="min-h-dvh bg-paper text-ink px-4 py-12">
      <main className="max-w-[640px] mx-auto rounded-[20px] bg-paper-raised p-8">
        <Masthead />
        <h1 className="t-h2 mt-8">Privacy</h1>
        <div className="t-body-sm mt-4 space-y-4">
          <p>
            wout.daily is a personal app. Only the Google accounts its owner allows can sign in; everyone else is refused.
          </p>
          <p>
            <b className="text-ink">What it reads.</b> With your permission, wout.daily reads your Gmail (read-only) to find
            newsletters from the last day. It never sends, changes or deletes email.
          </p>
          <p>
            <b className="text-ink">What it keeps.</b> The newsletters it finds, the briefings written from them, which stories
            you keep or skip, and your Google sign-in token. They are stored in the app's own database and used only to write
            your briefing.
          </p>
          <p>
            <b className="text-ink">Who else sees it.</b> Newsletter text is sent to Anthropic's Claude API to write the
            briefing. Nothing is sold or shared with anyone else, and no ads or trackers are used.
          </p>
          <p>
            <b className="text-ink">Removing it.</b> Sign out and revoke access at myaccount.google.com/permissions at any
            time. Ask the owner to delete the database to remove everything.
          </p>
        </div>
        <a href={import.meta.env.BASE_URL} className="inline-block mt-8 t-label text-sage underline underline-offset-4">
          Back to wout.daily
        </a>
      </main>
    </div>
  );
}
