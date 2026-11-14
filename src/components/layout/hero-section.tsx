import Link from "next/link";
import { ArrowRight, BookOpenText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/utils/icons";
import { Mandala, OrnamentDivider } from "@/components/shared/mandala";
import { siteConfig } from "@/config/site";

export function HeroSection() {
  return (
    <section className="relative isolate flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-16 text-center sm:py-24 md:py-32">
      {/* Dawn glow and slowly turning mandala */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_55%_at_50%_38%,color-mix(in_srgb,var(--gold)_26%,transparent),transparent_70%)]"
      />
      <Mandala className="animate-mandala absolute left-1/2 top-[38%] -z-10 -ml-[min(70vw,26rem)] -mt-[min(70vw,26rem)] size-[min(140vw,52rem)] text-gold/40 dark:text-gold/25" />

      <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <p
          lang="sa"
          className="font-shobhika mb-6 text-base text-kumkum sm:text-lg"
        >
          ॥ श्री गणेशाय नमः ॥
        </p>

        <div className="bg-sunrise mb-6 flex size-20 items-center justify-center rounded-3xl shadow-lg shadow-saffron/30 ring-1 ring-gold/50 md:size-24">
          <Icons.logo className="size-12 text-[#fff6e0] md:size-14" />
        </div>

        <h1 className="mb-4 max-w-4xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
          {siteConfig.name}
        </h1>

        <OrnamentDivider className="mb-5 w-48 sm:w-64" />

        <p className="mb-8 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl">
          A quiet home for stotras, scriptures and the words that explain them
          — in the script you read, with dictionaries, audio and the day's
          panchangam close at hand.
        </p>

        <div className="flex w-full max-w-xs flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:gap-4">
          <Button
            asChild
            size="lg"
            className="h-12 px-8 text-base shadow-lg shadow-primary/25"
          >
            <Link href="/dashboard">
              Enter
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 border-gold/60 bg-card/70 px-8 text-base backdrop-blur-sm"
          >
            <Link href="/dictionary">
              <BookOpenText className="size-4" />
              Dictionary
            </Link>
          </Button>
        </div>

        <p className="mt-8 text-xs tracking-wide text-muted-foreground">
          v{process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"}
        </p>
      </div>
    </section>
  );
}
