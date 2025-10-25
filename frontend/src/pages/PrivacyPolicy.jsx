import BaseHeader from "@/components/BaseHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Bug, Github, Linkedin, Mail } from "lucide-react";
import React from "react";

const PrivacyPolicy = () => {
  return (
    <>
      <BaseHeader />
      <div className="mt-14 tiptap max-w-screen-md m-auto px-4 py-8">
        <h1>Privacy Policy – NoteHub</h1>

        <p className="italic text-muted-foreground">
          Last Updated: July 20, 2025
        </p>

        <h3>Introduction</h3>
        <p className="text-muted-foreground">
          Welcome to <strong>NoteHub</strong> ("we", "our", "us"). We value your
          privacy and are committed to protecting your personal information.
          This Privacy Policy explains how we collect, use, and protect your
          data when you use our application.
        </p>
        <Separator />
        <h3>What Information We Collect</h3>
        <ul className="text-muted-foreground">
          <li>
            <strong>Account Information</strong>: Email address, name (if you
            sign in via Google).
          </li>
          <li>
            <strong>Content</strong>: Notes, documents, and any media you upload
            or create.
          </li>
          <li>
            <strong>Usage Data</strong>: Pages visited, actions performed,
            timestamps.
          </li>
          <li>
            <strong>Device Information</strong>: Browser type, OS, IP address
            (for analytics/security).
          </li>
        </ul>
        <Separator />

        <h3>How We Use Your Information</h3>
        <ul className="text-muted-foreground">
          <li>Provide and improve NoteHub's features.</li>
          <li>Sync and store your notes securely.</li>
          <li>Analyze usage for app optimization.</li>
          <li>Ensure security and prevent abuse.</li>
        </ul>

        <Separator />

        <h3>How Your Data Is Stored</h3>
        <ul className="text-muted-foreground">
          <li>
            Notes and user data are securely stored in our database (e.g.,
            MongoDB).
          </li>
          <li>We use HTTPS to encrypt data in transit.</li>
          <li>Access to user data is restricted and protected.</li>
        </ul>

        <Separator />

        <h3>Third-Party Services</h3>
        <p className="text-muted-foreground">
          We may use third-party services like:
        </p>
        <ul className="text-muted-foreground">
          <li>
            <strong>Google Authentication</strong> for login.
          </li>
          <li>
            <strong>Analytics tools</strong> to understand user behavior.
          </li>
        </ul>
        <p className="text-muted-foreground">
          These services may collect their own data according to their policies.
        </p>

        <Separator />

        <h3>Cookies & Local Storage</h3>
        <p className="text-muted-foreground">
          We use cookies/local storage to maintain sessions and store minimal
          preferences (like themes or recent files).
        </p>

        <Separator />

        <h3>Your Rights</h3>
        <ul className="text-muted-foreground">
          <li>View, edit, or delete your data anytime.</li>
          <li>Contact us for account/data deletion.</li>
        </ul>

        <Separator />

        <h3>Children’s Privacy</h3>
        <p className="text-muted-foreground">
          NoteHub is not intended for children under 13. We do not knowingly
          collect data from children.
        </p>

        <Separator />

        <h3>Changes to This Policy</h3>
        <p className="text-muted-foreground">
          We may update this Privacy Policy. Changes will be posted on this page
          with a revised date.
        </p>
        <Separator className="mb-8" />
        <h3>Contact us</h3>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>
              Have questions or ideas about this app? We'd love to hear from you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:abhijeet62008@gmail.com"
                  className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  abhijeet62008@gmail.com
                </a>
              </li>

              <li>
                <a
                  href="https://github.com/abhijeetsinghrajput"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
                >
                  <Github className="h-4 w-4" />
                  GitHub Profile
                </a>
              </li>

              <li>
                <a
                  href="https://www.linkedin.com/in/abhijeetsinghrajput"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
                >
                  <Linkedin className="h-4 w-4" />
                  LinkedIn Profile
                </a>
              </li>

              <li>
                <a
                  href="https://github.com/abhijeetsinghrajput/geu-erp/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
                >
                  <Bug className="h-4 w-4" />
                  Report an Issue
                </a>
              </li>
            </ul>

            <blockquote className="rounded-md border-l-4 border-muted-foreground bg-muted/40 p-4 italic text-muted-foreground">
              “We welcome feedback and suggestions to improve the portal for
              everyone.”
            </blockquote>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default PrivacyPolicy;
