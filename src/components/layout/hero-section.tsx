import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/utils/icons";

export function HeroSection() {
    return (
        <section className="relative flex-1 flex flex-col items-center justify-center text-center px-4 py-20 md:py-32 overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-6xl -z-10 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/20 rounded-full blur-3xl opacity-50 animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl opacity-50 animate-pulse delay-1000" />
            </div>

            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-700 slide-in-from-bottom-4">
                <div className="inline-flex items-center rounded-full border border-primary/20 bg-secondary/30 px-3 py-1 text-sm font-medium text-primary backdrop-blur-sm mb-6">
                    <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
                    v{process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'} available now
                </div>

                <Icons.logo className="size-20 md:size-24 mb-6 text-primary drop-shadow-sm" />

                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 max-w-4xl bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
                    Welcome to <span className="text-primary">DevHub</span>
                </h1>

                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
                    Your premium destination for devotional content, multilingual dictionaries, and spiritual resources.
                    Experience the depth of knowledge with modern tools.
                </p>

                <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                    <Link href="/dashboard" passHref>
                        <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/20 transition-all hover:scale-105">
                            Explore Now
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                    <Link href="/dictionary" passHref>
                        <Button size="lg" variant="outline" className="h-12 px-8 text-base backdrop-blur-sm bg-background/50 hover:bg-background/80 transition-all hover:scale-105">
                            Dictionary
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    );
}
