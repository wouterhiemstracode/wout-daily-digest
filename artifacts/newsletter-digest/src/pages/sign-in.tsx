import { Masthead } from "@/components/press/primitives";
import { Croc } from "@/components/press/croc";

const MESSAGES: Record<string, string> = {
  denied: "That Google account isn’t on this wout.daily. Sign in with the account it was set up for.",
  failed: "Signing in didn’t work. Please try again.",
  cancelled: "Sign-in was cancelled.",
  gmail: "wout.daily needs to read your Gmail to find your newsletters. Sign in again and allow Gmail access.",
};

/** One button: signing in with Google also connects Gmail. */
export default function SignIn() {
  const reason = new URLSearchParams(window.location.search).get("signin");
  const message = reason ? MESSAGES[reason] : null;
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div className="min-h-dvh bg-paper text-ink grid place-items-center px-4">
      <main className="w-full max-w-[420px] rounded-[20px] bg-paper-raised p-8 text-center">
        <Masthead className="inline-block" />
        <Croc mood="hello" prop="newspaper" tail className="mx-auto mt-8 w-36" />
        <h1 className="t-h2 mt-4">Your newsletters, one calm briefing</h1>
        <p className="t-body-sm mt-3">
          Sign in with Google. wout.daily finds the newsletters in your Gmail and writes your briefing from them.
        </p>
        {message && (
          <p role="alert" className="mt-5 rounded-xl bg-paper px-4 py-3 t-label text-danger">
            {message}
          </p>
        )}
        <a
          href={`${base}/api/auth/google/start`}
          className="mt-8 inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full bg-sage text-sage-ink font-sans font-medium text-[15px] hover:bg-sage/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage"
        >
          Sign in with Google
        </a>
        <p className="t-caption mt-4">Read-only access to Gmail. Nothing is sent or deleted.</p>
      </main>
    </div>
  );
}
