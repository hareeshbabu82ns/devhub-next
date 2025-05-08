import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, FileText, FileUp, Search, User2Icon } from 'lucide-react';
import { Icons } from '@/components/utils/icons';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16 md:py-24">
          <Icons.logo className="size-24 mb-6" />
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Welcome to <span className="text-primary">DevHub</span>
          </h1>
          <p className="text-lg md:text-xl text-foreground/80 max-w-2xl mb-10">
            Your one-stop platform for devotional content and multilingual dictionaries.
          </p>
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <Link href="/dashboard" passHref>
              <Button size="lg">Explore
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dictionary" passHref>
              <Button size="lg" variant="outline">
                View Dictionary
              </Button>
            </Link>
          </div>
        </section>
        {/* Features Section */}
        <section className="bg-muted py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <FeatureCard
                title="Manage Devotionals"
                description="Organize and explore hierarchical devotional content."
                icon={<FileUp />}
              />
              <FeatureCard
                title="Multilingual Dictionaries"
                description="Access phonetics, origins, and meanings in multiple languages."
                icon={<FileText />}
              />
              <FeatureCard
                title="Search and Bookmark"
                description="Easily find and bookmark your favorite content."
                icon={<Search />}
              />
              <FeatureCard
                title="User-Friendly Interface"
                description="Intuitive design for seamless navigation and management."
                icon={<User2Icon />}
              />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function FeatureCard( { title, description, icon }: { title: string; description: string; icon: React.ReactNode } ) {
  return (
    <div className="bg-background p-6 rounded-lg shadow-sm border border-border flex flex-col items-center text-center">
      <div className="text-primary mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-foreground/80">{description}</p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-foreground/70">
            © {new Date().getFullYear()} DevHub (version: {process.env.npm_package_version || ''}). All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="/privacy" className="text-sm text-foreground/70 hover:text-foreground">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-sm text-foreground/70 hover:text-foreground">
              Terms of Service
            </Link>
            <Link href="/contact" className="text-sm text-foreground/70 hover:text-foreground">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
