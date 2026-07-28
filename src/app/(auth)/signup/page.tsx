import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "@/components/auth/signup-form";
import { LoadingState } from "@/components/shared/state";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading sign up…" fullPage />}>
      <SignupForm />
    </Suspense>
  );
}
