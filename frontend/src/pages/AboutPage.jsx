import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  Users,
  Lightbulb,
  ArrowRight,
  GraduationCap,
  Code2,
  Brain,
  Database,
  Globe,
  BarChart2,
  Bell,
  ShieldCheck,
  Search,
  TrendingUp,
  Youtube,
  ExternalLink,
  ArrowUpRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import GithubIcon from "@/components/githubIcon";
import XIcon from "@/components/xIcon";
import LinkedinIcon from "@/components/linkedinIcon";

export const metadata = {
  title: "About – NoteHub",
  description:
    "NoteHub was born in a college classroom. A platform for students and developers to publish, share, and rank notes — with built-in SEO tools to get global exposure.",
};

const STATS = [
  { value: "100+", label: "Notes published" },
  { value: "40+", label: "Contributors" },
  { value: "8+", label: "Subject collections" },
  { value: "Free", label: "Always & forever" },
];

const FEATURES = [
  {
    icon: Globe,
    title: "Global exposure",
    body: "Every note you publish gets its own SEO-optimised URL, Open Graph tags, structured data, and sitemap entry — discoverable by anyone on the internet.",
  },
  {
    icon: ShieldCheck,
    title: "Article health check",
    body: "NoteHub analyses your articles for readability, structure, and completeness. Know exactly where your content needs improvement before you publish.",
  },
  {
    icon: BarChart2,
    title: "SEO report",
    body: "Get a full SEO score for every note — title length, meta description, keyword density, heading hierarchy, internal links, and more. All in one dashboard.",
  },
  {
    icon: Bell,
    title: "Smart notifications",
    body: "NoteHub alerts you when your article's SEO score drops, when there are broken links, or when you have opportunities to improve ranking.",
  },
  {
    icon: Search,
    title: "Built-in search indexing",
    body: "Your notes are automatically indexed in NoteHub's full-text search engine and submitted to Google via dynamic sitemaps — no manual effort needed.",
  },
  {
    icon: TrendingUp,
    title: "Rank on Google",
    body: "With structured data, canonical URLs, LLMs.txt support, and Core Web Vitals optimisation baked in, your notes are built to rank — not just exist.",
  },
];

const COLLECTIONS = [
  { icon: Brain, label: "AI & Machine Learning", href: "/abhijeetsingh/ai-ml" },
  { icon: Code2, label: "DSA", href: "/abhijeetsingh/dsa" },
  {
    icon: Database,
    label: "Data Science",
    href: "/abhijeetsingh/data-science",
  },
  {
    icon: GraduationCap,
    label: "DAA",
    href: "/abhijeetsingh/daa-design-and-analysis",
  },
];

const TIMELINE = [
  {
    period: "Semester 1",
    title: "The problem appears",
    body: "In the very first semester at Graphic Era Deemed to be University, midterms arrived without warning. Professors lectured — students had to choose between writing notes or actually understanding the content. There was no good middle ground.",
  },
  {
    period: "The idea",
    title: "What if notes were shared?",
    body: "Instead of every student scrambling to write everything down, what if one person wrote quality notes and everyone benefited? NoteHub was conceived as that shared layer — a place where knowledge compounds.",
  },
  {
    period: "Building",
    title: "100+ notes, one platform",
    body: "Abhijeet started writing. Machine Learning, DSA, DAA, Data Science, Frontend System Design — note by note, the library grew. Then other contributors joined: Vikash, Naveen, Divya, Gyan, Himanshu, Aditya, and many more.",
  },
  {
    period: "Today",
    title: "A platform with real reach",
    body: "NoteHub now hosts notes from 40+ contributors, with SEO tooling that gives every article a real chance at Google ranking. Students and developers publish here to reach a global audience — not just their classmates.",
  },
];

// Top contributors sorted by notesCount, with real avatar URLs
const TOP_CONTRIBUTORS = [
  {
    fullName: "Abhijeet Singh Rajput",
    userName: "abhijeetsingh",
    avatar:
      "https://res.cloudinary.com/dhtxrpqna/image/upload/f_auto,q_auto,w_200,h_200,c_fill,g_face/v1761375351/user_profiles/679d1d7836e2c3f6adf32631/cxonj7buwg5kifztx9gy.jpg",
    notesCount: 83,
    collectionsCount: 10,
    role: "admin",
    skills: [
      "nodejs",
      "react",
      "nextjs",
      "mongodb",
      "express",
      "tailwindcss",
      "typescript",
      "javascript",
    ],
  },
  {
    fullName: "divya sachan",
    userName: "divyasachan",
    avatar:
      "https://res.cloudinary.com/dhtxrpqna/image/upload/v1778624859/user_profiles/68513d1ae99975de510c72a0/y4iu0xyl87ncvhvjq8uc.jpg",
    notesCount: 20,
    collectionsCount: 3,
    role: "admin",
    skills: [
      "nodejs",
      "javascript",
      "typescript",
      "nextjs",
      "figma",
      "react",
      "mongodb",
      "tailwindcss",
    ],
  },
  {
    fullName: "Naveen Kumar",
    userName: "naveen09",
    avatar:
      "https://res.cloudinary.com/dhtxrpqna/image/upload/f_auto,q_auto,w_200,h_200,c_fill,g_face/v1769851785/user_profiles/6854162c9c980780bb6aa506/kpoqaqruaayeiy6ynrmd.png",
    notesCount: 10,
    collectionsCount: 2,
    skills: [],
  },
  {
    fullName: "Himanshu Kumar",
    userName: "himanshu-kumar",
    avatar:
      "https://lh3.googleusercontent.com/a/ACg8ocI85TFAO8B7WTryAiIExmQ0WfRkTsGrC-646yF1IsZSCXnKvy0=s400-c",
    notesCount: 6,
    collectionsCount: 3,
    skills: ["html5", "css3", "javascript"],
  },
  {
    fullName: "Aditya Sahu",
    userName: "adidev",
    avatar:
      "https://res.cloudinary.com/dhtxrpqna/image/upload/v1779863943/user_profiles/6a168e74d2ceab49d32e6614/rh5no1zuxl9qxkirqfsm.png",
    notesCount: 5,
    collectionsCount: 2,
    skills: [
      "googlecloud",
      "illustrator",
      "javascript",
      "jira",
      "docker",
      "kubernetes",
      "python",
      "electron",
      "opencv",
      "nodejs",
    ],
  },
  {
    fullName: "Gyan Prakash",
    userName: "gyan-prakash",
    avatar:
      "https://lh3.googleusercontent.com/a/ACg8ocLYfoME-gIb1kKDuqB9F0g_9cUxYpr9X5LVBvo9U-PnvfTmOEwk=s400-c",
    notesCount: 5,
    collectionsCount: 1,
    skills: [],
  },
  {
    fullName: "vikash kumar",
    userName: "vikashkumar",
    avatar:
      "https://lh3.googleusercontent.com/a/ACg8ocJUifBiaA1eB55dEQ88lYLPbNAlceqAtPwabe7PEqjRGpRLdpw=s400-c",
    notesCount: 8,
    collectionsCount: 3,
    skills: [],
  },
  {
    fullName: "Adarsh Kumar",
    userName: "adarshkashyap",
    avatar:
      "https://res.cloudinary.com/dhtxrpqna/image/upload/f_auto,q_auto,w_200,h_200,c_fill,g_face/v1767624567/user_profiles/695bc1a1f4d2469b3edebf4c/aryo5qclwbvqc7k3frir.jpg",
    notesCount: 2,
    collectionsCount: 1,
    skills: [],
  },
  {
    fullName: "Ashutosh Kumar",
    userName: "ashutosharyan033",
    avatar:
      "https://res.cloudinary.com/dhtxrpqna/image/upload/f_auto,q_auto,w_200,h_200,c_fill,g_face/v1753549086/user_profiles/688507c1b7a618d8ad699fea/iefjrchzcxhlxqoau1no.jpg",
    notesCount: 1,
    collectionsCount: 1,
    skills: [],
  },
  {
    fullName: "Utsav Raj",
    userName: "utsavraj",
    avatar:
      "https://lh3.googleusercontent.com/a/ACg8ocJ8NSwqc8PuG_4eMSwKn7GWpQoP811Pd9mWtErDYB9Szw8G3SR8OA=s400-c",
    notesCount: 1,
    collectionsCount: 1,
    skills: [],
  },
  {
    fullName: "Vikash Thakur",
    userName: "vikash-thakur",
    avatar:
      "https://lh3.googleusercontent.com/a/ACg8ocKOHWkfhOSytUmoztFoXHfXcVCPKrauHkWDYb9WOVwLwoKZekZm=s400-c",
    notesCount: 1,
    collectionsCount: 1,
    skills: [],
  },
  {
    fullName: "Basant Kumar",
    userName: "basantkumar",
    avatar:
      "https://lh3.googleusercontent.com/a/ACg8ocLOaFKqvi5EXflmIGxfiF1QpZhUPBVx8u2O9-i90pCx7NWwadJE=s400-c",
    notesCount: 1,
    collectionsCount: 1,
    skills: [],
  },
];

function ContributorCard({
  fullName,
  userName,
  avatar,
  notesCount,
  collectionsCount,
  role,
  skills = [],
}) {
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Link
      to={`/${userName}`}
      className="group flex flex-col gap-3 p-4 rounded-xl border border-border/60 bg-background hover:bg-muted/30 hover:border-border transition-all duration-200"
    >
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          {avatar ? (
            <img
              src={avatar}
              alt={fullName}
              className="w-10 h-10 rounded-full object-cover ring-1 ring-border/40"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
              {initials}
            </div>
          )}
          {role === "admin" && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center">
              <svg
                viewBox="0 0 10 10"
                className="w-2 h-2 fill-primary-foreground"
              >
                <path d="M5 1l1.18 2.39L9 3.82 7 5.77l.47 2.73L5 7.25 2.53 8.5 3 5.77 1 3.82l2.82-.43z" />
              </svg>
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate leading-tight capitalize">
            {fullName}
          </p>
          <p className="text-xs text-muted-foreground truncate">@{userName}</p>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground border-t border-border/40 pt-3">
        <span className="flex items-center gap-1">
          <BookOpen className="w-3 h-3" />
          {notesCount} {notesCount === 1 ? "note" : "notes"}
        </span>
        <span className="flex items-center gap-1">
          <Database className="w-3 h-3" />
          {collectionsCount}{" "}
          {collectionsCount === 1 ? "collection" : "collections"}
        </span>
      </div>
    </Link>
  );
}

export default function AboutPage() {
  const creator = TOP_CONTRIBUTORS[0];

  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <section className="border-b border-border/60 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <Badge variant="secondary" className="mb-4 text-xs font-medium">
            Our story
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-5 max-w-2xl leading-tight">
            Born in a classroom.
            <br />
            Built for the world.
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
            NoteHub started with a simple frustration — you can't listen and
            write at the same time. So we built a platform where quality notes
            are shared, ranked on Google, and read globally.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Button asChild>
              <Link to="/">
                Browse notes <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/contact">Contact us</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {STATS.map(({ value, label }) => (
              <div key={label}>
                <p className="text-3xl font-bold tracking-tight text-foreground">
                  {value}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story timeline */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground mb-3">
              How it started
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm">
              A first-semester student at{" "}
              <span className="text-foreground font-medium">
                Graphic Era Deemed to be University
              </span>{" "}
              realised the classroom forced an impossible choice. That student
              was Abhijeet Singh Rajput — and NoteHub is what he built instead
              of accepting the problem.
            </p>
          </div>

          <div className="lg:col-span-3 space-y-0">
            {TIMELINE.map(({ period, title, body }, i) => (
              <div key={title} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  {i < TIMELINE.length - 1 && (
                    <div className="w-px flex-1 bg-border mt-2 mb-2" />
                  )}
                </div>
                <div className="pb-8">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                    {period}
                  </span>
                  <h3 className="text-base font-semibold text-foreground mt-1 mb-2">
                    {title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* Platform features */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="mb-10">
          <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">
            More than a note-taking app
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
            NoteHub gives your writing the infrastructure it deserves — SEO
            tooling, health checks, and ranking signals built right in.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="space-y-3">
              <div className="flex items-center gap-3">
                <Icon className="size-4.5 text-primary" />
                <h3 className="font-medium text-foreground">{title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* Mission */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            {
              icon: BookOpen,
              title: "Quality over quantity",
              body: "Every note on NoteHub is written by someone who actually studied the topic — not scraped, not generated. Real students, real understanding.",
            },
            {
              icon: Users,
              title: "Shared knowledge",
              body: "40+ contributors have written notes across DSA, ML, Data Science, SQL, React, Node.js, and more. One good note benefits hundreds of students.",
            },
            {
              icon: Lightbulb,
              title: "Free, forever",
              body: "NoteHub has never charged a rupee and never will. Knowledge shouldn't have a paywall, especially for students figuring things out.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="space-y-3">
              <div className="flex gap-3 items-center">
                <Icon className="size-4.5 text-primary" />
                <h3 className="font-medium text-foreground">{title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* Creator — with real photo */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground mb-6">
              The creator
            </h2>
            <Link
              to="/abhijeetsingh"
              className="flex items-start gap-4 mb-5 w-max"
            >
              <img
                src={creator.avatar}
                alt={creator.fullName}
                className="w-16 h-16 rounded-xl object-cover ring-1 ring-border/40 shrink-0"
              />
              <div>
                <p className="font-semibold text-foreground leading-tight flex gap-1 items-center">
                  {creator.fullName}
                  <ArrowUpRight className="size-4" />
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  aka{" "}
                  <span className="text-foreground font-medium">
                    Mr. Codium
                  </span>
                </p>
                <Badge variant="secondary" className="mt-2 text-xs">
                  Admin · Founder
                </Badge>
              </div>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">
              A final-year MCA student and MERN stack developer. He built
              NoteHub from scratch — backend, frontend, SEO pipeline,
              everything.
            </p>
            <div className="flex flex-wrap gap-2 mt-5">
              <Button variant="outline" size="sm" asChild>
                <Link
                  to="https://x.com/abhijeetsinghrajput"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <XIcon />
                  X/Twitter
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link
                  to="https://github.com/abhijeetsinghrajput"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <GithubIcon />
                  GitHub
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link
                  to="https://www.youtube.com/@mrcodium"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <LinkedinIcon />
                  Linkedin
                </Link>
              </Button>
            </div>
          </div>

          <div className="lg:col-span-3">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-4">
              Featured collections
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {COLLECTIONS.map(({ icon: Icon, label, href }) => (
                <Link
                  key={label}
                  to={href}
                  className="flex items-center gap-3 p-3.5 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/60 hover:border-border transition-colors group"
                >
                  <span className="w-8 h-8 rounded-md bg-background border border-border/60 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {label}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-16 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Ready to get global exposure?
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Create an account, write your first note, and let NoteHub handle
              the rest.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Button asChild>
              <Link to="/signup">Get started free</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/contact">Contact us</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
