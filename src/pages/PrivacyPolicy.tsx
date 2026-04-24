import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
  useEffect(() => {
    document.title = "Privacy Policy — F5 Videos";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-10 md:py-16 max-w-3xl">
        <Button asChild variant="ghost" size="sm" className="mb-6 gap-2">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </Button>

        <h1 className="font-display text-4xl md:text-5xl tracking-wider mb-2">
          Privacy <span className="text-gradient">Policy</span>
        </h1>
        <p className="text-sm text-muted-foreground mb-10">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <div className="prose prose-invert max-w-none space-y-6 text-foreground/90">
          <section>
            <h2 className="font-display text-2xl tracking-wide mb-3">The short version</h2>
            <p className="text-muted-foreground">
              We don&apos;t steal your data. We don&apos;t sell your data. We don&apos;t
              build creepy profiles to follow you around the internet. F5 Videos is meant
              to be a no-account, no-nonsense way to share clips.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl tracking-wide mb-3">What we don&apos;t collect</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>No accounts, no emails, no passwords required to upload or watch.</li>
              <li>No third-party advertising trackers.</li>
              <li>No selling of any information to anyone — ever.</li>
              <li>No cross-site fingerprinting or behavioral profiling.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl tracking-wide mb-3">What we do store</h2>
            <p className="text-muted-foreground mb-2">
              The bare minimum needed to run the site and keep it free of abuse:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>The video file you upload and the title/description you give it.</li>
              <li>A view counter for each video.</li>
              <li>Comments you post (anonymous, with whatever name you choose).</li>
              <li>
                Your IP address — only visible to site moderators, used solely for
                blocking spam, abuse, or illegal content.
              </li>
              <li>
                A small <code className="px-1 py-0.5 rounded bg-muted text-xs">localStorage</code>{" "}
                value to remember your chosen comment name on this device.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl tracking-wide mb-3">Takedowns</h2>
            <p className="text-muted-foreground">
              If a video shouldn&apos;t be up — illegal, non-consensual, or otherwise
              harmful — use the report button on the video page. Reports are reviewed
              and acted on quickly.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl tracking-wide mb-3">Cookies</h2>
            <p className="text-muted-foreground">
              No tracking cookies. The site uses local browser storage only for your
              theme preference and comment name.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl tracking-wide mb-3">Contact</h2>
            <p className="text-muted-foreground">
              Questions or takedown requests can be sent through the report button on
              any video, or by reaching out to the maintainer linked in the footer.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border/60 mt-10">
        <div className="container py-8 text-sm text-muted-foreground">
          <p>© F5 Videos · We respect your privacy.</p>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
