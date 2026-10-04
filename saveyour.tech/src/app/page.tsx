import { ArrowRightFilled } from "@mingcute/react/core-filled";
import { Button } from "../components/ui/button";

const features = [
  {
    title: "Save from anywhere",
    description:
      "Share posts from Instagram, Reddit, TikTok, Facebook, and X directly to the Saveyour mobile app, or paste a link on the web.",
  },
  {
    title: "Everything in the cloud",
    description:
      "Your saved posts stay synced across the mobile app and website, so you can pick up wherever you left off.",
  },
  {
    title: "Understand every post",
    description:
      "Media is downloaded and analyzed automatically. Images and video frames are tagged, while audio is transcribed for you.",
  },
  {
    title: "Search by meaning",
    description:
      "Use semantic search to find the post you remember, even when you do not remember the exact words in it.",
  },
  {
    title: "See your interests",
    description:
      "Explore a spatial map of the topics and connections across everything you have saved.",
  },
  {
    title: "Organize and share",
    description:
      "Group posts into albums and share them with anyone through a public link, like a playlist for your ideas.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col gap-y-12 px-6 py-8 sm:px-10">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-y-5 border-b-2 pb-16 pt-12 text-center">
        <h1 className="text-5xl leading-tight sm:text-7xl">
          Save what matters.
        </h1>
        <h2 className="max-w-2xl text-xl font-medium sm:text-2xl">
          Break free from the algorithm and curate a collection of social media
          posts that you genuinely care about
        </h2>
        <a href="https://app.saveyour.tech">
          <Button className="mt-3 h-12 px-8 text-lg">
            Get Started <ArrowRightFilled />
          </Button>
        </a>
      </section>

      <section className="mx-auto w-full max-w-5xl">
        <h1 className="mb-8 text-center text-4xl underline">Features</h1>
        <div className="grid auto-rows-fr items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="card flex h-full min-h-48 flex-col gap-y-4 p-6"
            >
              <h2 className="text-2xl">{feature.title}</h2>
              <p className="leading-relaxed">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
