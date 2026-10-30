import { Masthead } from "@/components/press/primitives";
import { Croc } from "@/components/press/croc";
import { Bank, Dragonfly, LilyPad, PEEK_LOOKS, Reeds, Water } from "@/components/press/habitat";

const MESSAGES: Record<string, string> = {
  denied: "That Google account isn’t on this wout.daily. Sign in with the account it was set up for.",
  failed: "Signing in didn’t work. Please try again.",
  cancelled: "Sign-in was cancelled.",
  gmail: "wout.daily needs to read your Gmail to find your newsletters. Sign in again and allow Gmail access.",
};

/** The shore under the sign-in card: Peek's pond, with Peek sunning on the bank. */
function Shore() {
  const water = "clamp(140px, 22vh, 210px)";
  const at = (px: number) => `calc(${water} + ${px}px)`;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <Dragonfly className="absolute right-[22%] top-[26%] w-10" />
      <Reeds className="absolute left-[2%] h-[300px] w-[150px]" style={{ bottom: at(-60) }} />
      <Reeds flip rushes={1} className="absolute left-[11%] h-[170px] w-[90px]" style={{ bottom: at(-50) }} />
      <Reeds rushes={2} className="absolute right-[1%] h-[340px] w-[160px]" style={{ bottom: at(-70) }} />
      <Bank className="absolute right-[9%] h-[64px] w-[380px]" style={{ bottom: at(-34) }} />
      <Water className="absolute inset-x-0 bottom-0" style={{ height: water }} />
      <Croc {...PEEK_LOOKS.basker} className="absolute right-[calc(9%+80px)] w-[210px]" style={{ bottom: at(14) }} />
      <Reeds flip rushes={0} className="absolute right-[calc(9%+340px)] h-[120px] w-[70px]" style={{ bottom: at(-36) }} />
      <LilyPad flower className="absolute left-[24%] w-24" style={{ bottom: `calc(${water} * 0.55)` }} />
      <LilyPad flip className="absolute left-[38%] w-14" style={{ bottom: `calc(${water} * 0.22)` }} />
      <LilyPad className="absolute right-[36%] w-16" style={{ bottom: `calc(${water} * 0.48)` }} />
      <LilyPad flower flip className="absolute right-[6%] w-12" style={{ bottom: `calc(${water} * 0.18)` }} />
    </div>
  );
}

/** One button: signing in with Google also connects Gmail. */
export default function SignIn() {
  const reason = new URLSearchParams(window.location.search).get("signin");
  const message = reason ? MESSAGES[reason] : null;
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div className="relative min-h-dvh overflow-hidden bg-paper text-ink grid place-items-center px-4 pb-[12vh]">
      <Shore />
      <main className="relative w-full max-w-[420px] rounded-[20px] bg-paper-raised p-8 text-center" style={{ boxShadow: "var(--overlay-shadow)" }}>
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
