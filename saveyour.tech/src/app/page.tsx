import { ArrowRightFilled, Search2Filled, ShareForwardFilled } from "@mingcute/react/core-filled";
import { Button } from "../components/ui/button";

const features = [
  {
    number: "01",
    title: "Capture first",
    description:
      "Save from Instagram, Reddit, TikTok, Facebook, X, or any link you find in the wild.",
  },
  {
    number: "02",
    title: "Make it useful",
    description:
      "Your archive becomes searchable context, with media, text, and audio understood for you.",
  },
  {
    number: "03",
    title: "Find it later",
    description:
      "Search by meaning, collect ideas into albums, and see the connections across your saves.",
  },
];

const examples = [
  { label: "recipe ideas", color: "bg-[#facc00]" },
  { label: "design references", color: "bg-[#7a83ff]" },
  { label: "places to visit", color: "bg-[#ff4d50]" },
  { label: "things to learn", color: "bg-[#0099ff]" },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-12">
      <header className="card flex items-center justify-between px-4 py-3 sm:px-5">
        <a href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight" aria-label="saveyour.tech home">
          <span className="flex size-8 items-center justify-center border-2 border-black bg-main text-sm shadow-[2px_2px_0_black]">s</span>
          saveyour<span className="text-black/50">.tech</span>
        </a>
        <nav className="hidden items-center gap-6 text-sm font-bold sm:flex" aria-label="Main navigation">
          <a className="underline-offset-4 hover:underline" href="#how-it-works">How it works</a>
          <a className="underline-offset-4 hover:underline" href="#features">Features</a>
        </nav>
        <a href="https://app.saveyour.tech" className="text-sm font-bold underline underline-offset-4">Open app ↗</a>
      </header>

      <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 border-2 border-black bg-white px-3 py-2 text-xs font-bold uppercase tracking-widest shadow-[3px_3px_0_black]">
            <span className="size-2 rounded-full bg-main" aria-hidden="true" /> Your second brain for the internet
          </div>
          <h1 className="max-w-4xl text-[clamp(3.4rem,8vw,7rem)] font-bold leading-[0.92] tracking-[-0.07em]">
            Save what <span className="text-[#00a878]">matters.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed sm:text-xl">
            The good stuff gets buried fast. Keep the posts, ideas, and inspiration you actually want to come back to—in one searchable place.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a href="https://app.saveyour.tech"><Button size="lg">Start saving <ArrowRightFilled /></Button></a>
            <a href="#how-it-works" className="font-bold underline underline-offset-4">See how it works ↓</a>
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-wider text-black/60">Free to start · Your links stay yours</p>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:justify-self-end" aria-label="A preview of an organized saveyour archive">
          <div className="absolute -right-2 -top-7 rotate-6 border-2 border-black bg-[#facc00] px-3 py-2 text-sm font-bold shadow-[3px_3px_0_black]">no more doom-scrolling</div>
          <div className="card rotate-[-3deg] bg-white p-4 sm:p-5">
            <div className="mb-5 flex items-center justify-between border-b-2 border-black pb-3">
              <span className="font-bold">My saves <span className="text-black/50">/ 248</span></span>
              <span className="border-2 border-black bg-main px-2 py-1 text-xs font-bold">ALL POSTS</span>
            </div>
            <div className="mb-4 flex items-center gap-2 border-2 border-black bg-[#f3f3f3] px-3 py-3 text-sm text-black/60"><Search2Filled /> Search your memory...</div>
            <div className="grid grid-cols-2 gap-3">
              {examples.map((example, index) => (
                <div key={example.label} className={`border-2 border-black p-3 shadow-[3px_3px_0_black] ${index === 1 ? "translate-y-4" : ""}`}>
                  <div className={`mb-8 flex h-16 items-end border-2 border-black p-2 ${example.color}`}><span className="text-xs font-bold uppercase">saved</span></div>
                  <p className="text-sm font-bold leading-tight">{example.label}</p>
                  <p className="mt-2 text-xs text-black/60">AI tagged · just now</p>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute -bottom-10 -left-5 flex -rotate-6 items-center gap-2 border-2 border-black bg-white px-3 py-2 text-sm font-bold shadow-[3px_3px_0_black]"><ShareForwardFilled /> share the good stuff</div>
        </div>
      </section>

      <section id="how-it-works" className="border-t-2 border-black py-16 sm:py-20">
        <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-3 text-xs font-bold uppercase tracking-[0.2em]">The simple loop</p><h2 className="text-4xl tracking-tight sm:text-5xl">From fleeting to found.</h2></div><p className="max-w-sm leading-relaxed">Save in the moment. Organize when you have time. Find it when you need it.</p></div>
        <div id="features" className="grid gap-5 md:grid-cols-3">
          {features.map((feature) => <article key={feature.number} className="card flex min-h-52 flex-col justify-between p-5 transition-transform hover:-translate-y-1"><span className="text-5xl font-bold text-black/20">{feature.number}</span><div><h3 className="text-2xl">{feature.title}</h3><p className="mt-2 leading-relaxed">{feature.description}</p></div></article>)}
        </div>
      </section>

      <footer className="flex flex-col gap-4 border-t-2 border-black py-7 text-sm sm:flex-row sm:items-center sm:justify-between"><span className="font-bold">saveyour.tech</span><span>Keep the internet’s good ideas close.</span><a className="font-bold underline" href="https://app.saveyour.tech">Open the app ↗</a></footer>
    </main>
  );
}
