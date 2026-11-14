import { BookOpenText, Languages, Library, Search } from "lucide-react";
import { OrnamentDivider } from "@/components/shared/mandala";

const features = [
  {
    title: "Stotras & Scriptures",
    description:
      "Browse devotional works by deity and author, chapter by chapter, verse by verse.",
    icon: Library,
    tone: "text-saffron bg-saffron/12",
  },
  {
    title: "Multilingual Dictionaries",
    description:
      "Look up meanings, phonetics and origins across Sanskrit, Telugu and more.",
    icon: BookOpenText,
    tone: "text-kumkum bg-kumkum/10",
  },
  {
    title: "Read in Your Script",
    description:
      "Switch any text between Devanagari, Telugu, IAST and other scripts instantly.",
    icon: Languages,
    tone: "text-peacock bg-peacock/12",
  },
  {
    title: "Search & Bookmarks",
    description:
      "Find a verse by a few remembered words and keep your favourites close.",
    icon: Search,
    tone: "text-tulsi bg-tulsi/12",
  },
];

export function FeaturesSection() {
  return (
    <section className="bg-rangoli border-t border-border/60 bg-muted/40 py-16 sm:py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
          <h2 className="mb-3 text-2xl font-semibold sm:text-3xl">
            Everything for daily study and worship
          </h2>
          <OrnamentDivider className="mx-auto mb-4 w-40" />
          <p className="text-muted-foreground">
            Built for unhurried reading on a phone, a tablet or a desk.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
          {features.map(({ title, description, icon: Icon, tone }) => (
            <div
              key={title}
              className="group rounded-2xl border border-border/70 bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gold/60 hover:shadow-md"
            >
              <div
                className={`mb-4 inline-flex items-center justify-center rounded-xl p-3 ${tone}`}
              >
                <Icon className="size-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
