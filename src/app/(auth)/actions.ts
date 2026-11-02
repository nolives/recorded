"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  errors?: Partial<Record<"username" | "email" | "password", string>>;
  message?: string;
  values?: { username?: string; email?: string };
};

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export async function signUp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const values = { username, email };

  const errors: AuthFormState["errors"] = {};
  if (!username) {
    errors.username = "Pick a username.";
  } else if (!USERNAME_PATTERN.test(username)) {
    errors.username =
      "Use 3–20 lowercase letters, numbers, or underscores (no spaces).";
  }
  if (!email) {
    errors.email = "Enter your email.";
  } else if (!email.includes("@")) {
    errors.email = "That doesn't look like an email address.";
  }
  if (!password) {
    errors.password = "Choose a password.";
  } else if (password.length < 8) {
    errors.password = "Use at least 8 characters.";
  }
  if (Object.keys(errors).length > 0) return { errors, values };

  const supabase = await createClient();

  const { data: available, error: checkError } = await supabase.rpc(
    "username_available",
    { name: username },
  );
  if (checkError) {
    return { message: "Something went wrong. Please try again.", values };
  }
  if (!available) {
    return { errors: { username: "That username is taken." }, values };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });

  if (error) {
    if (error.code === "user_already_exists" || /already registered/i.test(error.message)) {
      return {
        errors: { email: "An account with this email already exists. Try logging in." },
        values,
      };
    }
    if (error.code === "weak_password") {
      return { errors: { password: error.message }, values };
    }
    return { message: "Something went wrong. Please try again.", values };
  }

  // If email confirmation were turned on, there would be no session yet.
  if (!data.session) {
    return { message: "Check your email to confirm your account, then log in.", values };
  }

  redirect("/");
}

export async function logIn(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");
  const values = { email };

  const errors: AuthFormState["errors"] = {};
  if (!email) errors.email = "Enter your email.";
  if (!password) errors.password = "Enter your password.";
  if (Object.keys(errors).length > 0) return { errors, values };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { message: "That email and password don't match. Try again.", values };
  }

  // Only follow links inside this site.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
