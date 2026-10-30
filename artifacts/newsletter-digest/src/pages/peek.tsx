import { Masthead } from "@/components/press/primitives";
import { Croc, type CrocMood, type CrocPose, type CrocProp } from "@/components/press/croc";

/*
 * The Peek sheet: every mood, pose and prop of the croc, with where each is used.
 * Public, like /privacy, so design tools (Dessn) can show it; it holds no data.
 */

const MOODS: { mood: CrocMood; name: string; use: string }[] = [
  { mood: "idle", name: "Idle", use: "Default: blinks and bobs. Sort card header." },
  { mood: "hello", name: "Hello", use: "Rises out of the water. Sign-in, no briefing yet." },
  { mood: "reading", name: "Reading", use: "Eyes scan while a briefing is written." },
  { mood: "keep", name: "Happy hop", use: "After a keep." },
  { mood: "skip", name: "Head shake", use: "After a skip." },
  { mood: "done", name: "Happy, twice", use: "All sorted, with confetti." },
  { mood: "curious", name: "Curious", use: "My sources, Search." },
  { mood: "worried", name: "Worried", use: "Gmail didn't answer." },
  { mood: "bored", name: "Bored", use: "A quiet day: nothing new arrived." },
  { mood: "sleepy", name: "Sleepy", use: "Night edition, with floating Zs." },
  { mood: "proud", name: "Proud", use: "Seven days in a row." },
];

const POSES: { pose: CrocPose; name: string; use: string }[] = [
  { pose: "water", name: "Eyes above the water", use: "Default." },
  { pose: "card", name: "Over a card", use: "Empty states." },
  { pose: "newspaper", name: "Over the newspaper", use: "While reading your newsletters." },
];

const PROPS: { prop: CrocProp; name: string; use: string; mood?: CrocMood }[] = [
  { prop: "newspaper", name: "Little newspaper", use: "Sign-in hero, with the tail flick." },
  { prop: "glasses", name: "Reading glasses", use: "End of a story." },
  { prop: "nightcap", name: "Night cap", use: "Night edition.", mood: "sleepy" },
  { prop: "sunglasses", name: "Sunglasses", use: "Saturdays and Sundays." },
];

function Tile({ name, use, children }: { name: string; use: string; children: React.ReactNode }) {
  return (
    <figure className="m-0 rounded-[20px] bg-paper-raised p-4">
      <div className="rounded-xl bg-paper aspect-[4/3] grid place-items-center">{children}</div>
      <figcaption className="mt-3">
        <div className="t-label text-ink">{name}</div>
        <div className="t-caption">{use}</div>
      </figcaption>
    </figure>
  );
}

export default function PeekSheet() {
  return (
    <div className="min-h-dvh bg-paper text-ink px-4 md:px-12 py-10">
      <div className="max-w-[1100px] mx-auto space-y-12">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Masthead />
            <h1 className="t-display max-md:text-[36px] max-md:leading-[42px] mt-6">Peek</h1>
            <p className="t-standfirst mt-2 max-w-[56ch]">
              The wout.daily croc: two eyes above the water, like reading over a newspaper. Peek marks moments and never covers the reading.
            </p>
          </div>
          <Croc mood="hello" prop="newspaper" tail className="w-48" />
        </header>

        <section>
          <h2 className="t-h2">Moods</h2>
          <p className="t-caption">{`<Croc mood="…" />`}</p>
          <div className="mt-4 grid gap-4 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
            {MOODS.map((m) => (
              <Tile key={m.mood} name={m.name} use={m.use}><Croc mood={m.mood} className="w-[78%]" /></Tile>
            ))}
          </div>
        </section>

        <section>
          <h2 className="t-h2">Poses</h2>
          <p className="t-caption">{`<Croc pose="water | card | newspaper" />, plus tail for a flick`}</p>
          <div className="mt-4 grid gap-4 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
            {POSES.map((p) => (
              <Tile key={p.pose} name={p.name} use={p.use}><Croc pose={p.pose} className="w-[78%]" /></Tile>
            ))}
            <Tile name="Tail flick" use="Sign-in and all sorted."><Croc tail className="w-[78%]" /></Tile>
          </div>
        </section>

        <section>
          <h2 className="t-h2">Props</h2>
          <p className="t-caption">{`<Croc prop="…" />: one at a time, for special editions`}</p>
          <div className="mt-4 grid gap-4 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
            {PROPS.map((p) => (
              <Tile key={p.prop} name={p.name} use={p.use}><Croc prop={p.prop} mood={p.mood} className="w-[78%]" /></Tile>
            ))}
          </div>
        </section>

        <section>
          <h2 className="t-h2">Sizes</h2>
          <div className="mt-4 rounded-[20px] bg-paper-raised p-6 flex flex-wrap items-end gap-8">
            {[40, 64, 96, 144, 200].map((w) => (
              <div key={w} className="grid justify-items-center gap-2">
                <Croc style={{ width: w }} />
                <span className="t-caption tabular-nums">{w}px</span>
              </div>
            ))}
            <div className="grid justify-items-center gap-2">
              <img src="/icon-192.png" alt="" className="h-12 w-12 rounded-[12px]" />
              <span className="t-caption">App icon</span>
            </div>
          </div>
        </section>

        <section>
          <h2 className="t-h2">Rules</h2>
          <ul className="mt-3 space-y-2 t-body-sm list-disc pl-5 max-w-[70ch]">
            <li>Peek marks a moment (a reaction, an empty state, a wait) and never sits on top of something to read.</li>
            <li>One Peek per screen. Keep and skip reactions last under a second.</li>
            <li>Garden green only. Night edition switches the green automatically; add the night cap after dark.</li>
            <li>One prop at a time, and only for its edition: glasses for reading, sunglasses at the weekend.</li>
            <li>Animations stop for people who ask their device for reduced motion.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
