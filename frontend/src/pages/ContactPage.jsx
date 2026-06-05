"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Mail,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  FileText,
  Bug,
  Lightbulb,
  HelpCircle,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import GithubIcon from "@/components/githubIcon";
import LinkedinIcon from "@/components/linkedinIcon";
import XIcon from "@/components/xIcon";

const CONTACT_REASONS = [
  { value: "general", label: "General Enquiry", icon: MessageSquare },
  { value: "bug", label: "Report a Bug", icon: Bug },
  { value: "feature", label: "Feature Request", icon: Lightbulb },
  { value: "content", label: "Content / Notes", icon: FileText },
  { value: "support", label: "Account Support", icon: HelpCircle },
];

const socialLinks = [
  {
    href: "https://github.com/abhijeetSinghRajput",
    handle: "@abhijeetSinghRajput",
    icon: GithubIcon,
    label: "GitHub",
  },
  {
    href: "https://www.linkedin.com/in/abhijeet-singh27/",
    handle: "@abhijeet-singh27",
    icon: LinkedinIcon,
    label: "LinkedIn",
  },
  {
    href: "https://x.com/abhijeet62008",
    handle: "@abhijeet62008",
    icon: XIcon,
    label: "X",
  },
];

export default function ContactPage() {
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    reason: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormState((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Replace with your actual submission logic (API route, email service, etc.)
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSubmitted(true);
  };

  const isValid =
    formState.name.trim() &&
    formState.email.trim() &&
    formState.reason &&
    formState.message.trim().length >= 20;

  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <section className="border-b border-border/60 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <Badge variant="secondary" className="mb-4 text-xs font-medium">
            Contact Us
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-4">
            Get in touch
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
            Have a question, spotted a bug, or want to share an idea? We'd love
            to hear from you. Usually respond within 24–48 hours.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Button asChild>
              <Link to="/#articles">
                Browse Notes <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/about">About us</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Form */}
          <div className="lg:col-span-3 lg:order-2">
            {submitted ? (
              <SuccessState
                name={formState.name}
                onReset={() => {
                  setSubmitted(false);
                  setFormState({
                    name: "",
                    email: "",
                    reason: "",
                    subject: "",
                    message: "",
                  });
                }}
              />
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                {/* Name + Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Your name"
                      value={formState.name}
                      onChange={handleChange}
                      required
                      autoComplete="name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={formState.email}
                      onChange={handleChange}
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Reason */}
                <div className="space-y-2">
                  <Label htmlFor="reason">
                    Reason <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formState.reason}
                    onValueChange={(val) =>
                      setFormState((prev) => ({ ...prev, reason: val }))
                    }
                  >
                    <SelectTrigger id="reason">
                      <SelectValue placeholder="What's this about?" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTACT_REASONS.map(({ value, label, icon: Icon }) => (
                        <SelectItem key={value} value={value}>
                          <span className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            {label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <Label htmlFor="subject">
                    Subject{" "}
                    <span className="text-muted-foreground text-xs font-normal">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="subject"
                    name="subject"
                    placeholder="Brief summary of your message"
                    value={formState.subject}
                    onChange={handleChange}
                  />
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="message">
                    Message <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Describe your question, issue, or idea in detail..."
                    className="resize-none min-h-[160px]"
                    value={formState.message}
                    onChange={handleChange}
                    required
                  />
                  <p
                    className={cn(
                      "text-xs transition-colors",
                      formState.message.length > 0 &&
                        formState.message.length < 20
                        ? "text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    {formState.message.length} / 20 characters minimum
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full sm:w-auto gap-2"
                  disabled={!isValid || loading}
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send message
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground">
                  By submitting this form you agree to our{" "}
                  <Link
                    to="/privacy-policy"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Privacy Policy
                  </Link>
                  .
                </p>
              </form>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-2 space-y-8 order-2 lg:order-1">
            {/* Direct email */}
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-3">
                Email
              </p>
              <a
                to="mailto:abhijeet62008@gmail.com"
                className="inline-flex items-center gap-2 transition-colors group"
              >
                <Mail className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                abhijeet62008@gmail.com
                <ExternalLink className="size-3.5" />
              </a>
            </div>

            <Separator />

            {/* Response time */}
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-3">
                Response time
              </p>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Typically within 24–48 hours
              </div>
            </div>

            <Separator />

            {/* Socials */}
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-3">
                Follow us
              </p>
              <ul className="space-y-3">
                {socialLinks.map(({ label, href, icon: Icon, handle }) => (
                  <li key={label}>
                    <Link
                      to={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors group"
                    >
                      <span className="w-8 h-8 rounded-md bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <Icon className="size-4" />
                      </span>
                      <span className="text-muted-foreground group-hover:text-primary transition-colors">
                        {handle}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function SuccessState({ name, onReset }) {
  return (
    <div className="flex flex-col items-start gap-6 py-4">
      <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
        <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          Message received{name ? `, ${name.split(" ")[0]}` : ""}!
        </h2>
        <p className="text-muted-foreground leading-relaxed max-w-md">
          Thanks for reaching out. We'll get back to you at the email you
          provided within 24–48 hours.
        </p>
      </div>
      <Button variant="outline" onClick={onReset} className="gap-2">
        <Send className="w-4 h-4" />
        Send another message
      </Button>
    </div>
  );
}
