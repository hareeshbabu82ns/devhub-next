import Link from "next/link";

export function Footer() {
    return (
        <footer className="border-t border-border/60 bg-background py-8">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-center text-center">
                    <p className="text-sm text-foreground/70">
                        © {new Date().getFullYear()} DevHub (version: {process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'}). All rights reserved.
                    </p>
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4 md:mt-0">
                        <Link href="/privacy" className="text-sm text-foreground/70 hover:text-primary transition-colors">
                            Privacy Policy
                        </Link>
                        <Link href="/terms" className="text-sm text-foreground/70 hover:text-primary transition-colors">
                            Terms of Service
                        </Link>
                        <Link href="/contact" className="text-sm text-foreground/70 hover:text-primary transition-colors">
                            Contact
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
