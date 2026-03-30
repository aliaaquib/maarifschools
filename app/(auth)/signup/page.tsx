import { AuthPageGuard } from "@/components/auth/auth-page-guard";
import { AuthForm } from "@/components/auth/auth-form";

export default function SignupPage() {
  return (
    <AuthPageGuard>
      <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
        <AuthForm mode="signup" />
      </main>
    </AuthPageGuard>
  );
}
