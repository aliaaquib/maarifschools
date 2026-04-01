import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function ComingSoonPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-2xl rounded-[28px] border border-border bg-card p-8 text-center md:p-12">
        <p className="text-sm text-muted-foreground">Coming soon</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
          Student access is coming soon
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground md:text-base">
          We are currently building features for students. Stay tuned!
        </p>
        <div className="mt-8">
          <Link href="/">
            <Button size="lg">Back to Home</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
