import { FileText, FileUp, Search, User2Icon, Sparkles } from "lucide-react";

export function FeaturesSection() {
    const features = [
        {
            title: "Manage Devotionals",
            description: "Organize and explore hierarchical devotional content with ease.",
            icon: <FileUp className="size-6" />,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
        },
        {
            title: "Multilingual Dictionaries",
            description: "Access phonetics, origins, and meanings across multiple languages.",
            icon: <FileText className="size-6" />,
            color: "text-green-500",
            bg: "bg-green-500/10",
        },
        {
            title: "Smart Search",
            description: "Instantly find and bookmark your favorite stotras and songs.",
            icon: <Search className="size-6" />,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
        },
        {
            title: "Premium Interface",
            description: "Intuitive glassmorphism design for a seamless user experience.",
            icon: <Sparkles className="size-6" />, // Changed icon for variety
            color: "text-amber-500",
            bg: "bg-amber-500/10",
        },
    ];

    return (
        <section className="bg-muted/30 py-20 border-t border-border/50 relative overflow-hidden">
            {/* Background blobs for section */}
            <div className="absolute top-1/2 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-secondary/5 rounded-full blur-3xl -z-10" />

            <div className="container mx-auto px-4">
                <div className="text-center mb-16 max-w-2xl mx-auto">
                    <h2 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Key Features</h2>
                    <p className="text-muted-foreground">
                        Everything you need to deepen your spiritual practice, built with modern technology.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {features.map((feature, index) => (
                        <FeatureCard
                            key={index}
                            {...feature}
                            index={index}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}

function FeatureCard({ title, description, icon, color, bg, index }: { title: string; description: string; icon: React.ReactNode; color: string; bg: string; index: number }) {
    return (
        <div
            className="group relative bg-background/50 p-6 rounded-2xl shadow-sm border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 backdrop-blur-sm"
            style={{ animationDelay: `${index * 100}ms` }}
        >
            <div className={`mb-4 inline-flex items-center justify-center rounded-xl p-3 ${bg} ${color} transition-transform group-hover:scale-110 duration-300`}>
                {icon}
            </div>
            <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">{title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
        </div>
    );
}
