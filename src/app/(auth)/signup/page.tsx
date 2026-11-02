import type { Metadata } from "next";
import { SignUpForm } from "./signup-form";

export const metadata: Metadata = { title: "Sign up · Recorded" };

export default function SignUpPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <p className="mt-2 mb-8 text-muted">
        Start your album diary. Your listens stay private to you.
      </p>
      <SignUpForm />
    </main>
  );
}
