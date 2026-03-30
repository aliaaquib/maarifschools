import Link from "next/link";
import { ArrowRight, Bot, FolderOpen, MessagesSquare, Search } from "lucide-react";

import { Button } from "@/components/ui/button";

const features = [
  {
    icon: FolderOpen,
    title: "Resource sharing",
    description: "Upload and reuse lesson materials, worksheets, presentations, and classroom files in one shared library.",
  },
  {
    icon: Search,
    title: "Smart organization",
    description: "Find the right content quickly with clean search, tags, bookmarks, and a focused workspace.",
  },
  {
    icon: MessagesSquare,
    title: "Community discussions",
    description: "Ask questions, share ideas, and improve teaching content together through simple threaded conversations.",
  },
  {
    icon: Bot,
    title: "AI-powered tools",
    description: "Turn teaching prompts into structured lesson plans with built-in assistance designed for real classroom use.",
  },
];

const steps = [
  "Sign up as a teacher",
  "Upload or explore resources",
  "Collaborate and improve content",
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between px-4 py-4 md:px-8">
          <Link href="/" className="text-sm font-semibold tracking-tight text-foreground">
            Maarif Schools
          </Link>

          <nav className="flex items-center gap-2 md:gap-3">
            <a href="#features" className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground">
              Features
            </a>
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground">
              Login
            </Link>
            <Link href="/signup">
              <Button size="sm">Signup</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="px-4 py-20 md:px-8 md:py-28">
          <div className="mx-auto flex w-full max-w-[1100px] flex-col items-center text-center">
            <div className="inline-flex items-center rounded-full border border-border bg-muted/70 px-4 py-2 text-sm text-muted-foreground">
              A modern collaboration platform for teachers
            </div>
            <h1 className="mt-8 max-w-4xl text-5xl font-semibold tracking-tight text-foreground md:text-7xl">
              Share resources, discover content, and collaborate with educators worldwide
            </h1>
            <p className="mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
              Bring lesson materials, community knowledge, and planning tools into one calm workspace built for teachers.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup">
                <Button size="lg">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">
                  Login
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-border px-4 py-20 md:px-8">
          <div className="mx-auto w-full max-w-[1100px]">
            <div className="max-w-2xl">
              <p className="text-sm text-muted-foreground">Features</p>
              <h2 className="mt-3 text-3xl font-semibold text-foreground md:text-4xl">
                Everything teachers need to build and share better learning materials
              </h2>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {features.map(({ icon: Icon, title, description }) => (
                <div key={title} className="rounded-[28px] border border-border bg-card p-6 transition duration-150 hover:-translate-y-[2px] hover:shadow-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-muted text-muted-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-foreground">{title}</h3>
                  <p className="mt-3 max-w-md text-sm text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="border-t border-border px-4 py-20 md:px-8">
          <div className="mx-auto w-full max-w-[1100px]">
            <div className="max-w-2xl">
              <p className="text-sm text-muted-foreground">How it works</p>
              <h2 className="mt-3 text-3xl font-semibold text-foreground md:text-4xl">
                A simple workflow for stronger collaboration
              </h2>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {steps.map((step, index) => (
                <div key={step} className="rounded-[28px] border border-border bg-card p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted text-sm font-semibold text-foreground">
                    {index + 1}
                  </div>
                  <p className="mt-6 text-lg font-semibold text-foreground">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border px-4 py-20 md:px-8">
          <div className="mx-auto w-full max-w-[900px] rounded-[32px] border border-border bg-muted/50 px-6 py-12 text-center md:px-10">
            <p className="text-sm text-muted-foreground">Ready to begin</p>
            <h2 className="mt-3 text-3xl font-semibold text-foreground md:text-4xl">
              Start collaborating today
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground md:text-base">
              Join a workspace built for teachers who want to share knowledge, improve materials, and move faster together.
            </p>
            <div className="mt-8">
              <Link href="/signup">
                <Button size="lg">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-8 md:px-8">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>Maarif Schools</p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="transition hover:text-foreground">
              Login
            </Link>
            <Link href="/signup" className="transition hover:text-foreground">
              Signup
            </Link>
            <a href="#about" className="transition hover:text-foreground">
              About
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
