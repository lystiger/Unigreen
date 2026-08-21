"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiClientError, apiRequest } from "@/lib/api/client";
import type { StaffIdentity } from "@/lib/api/types";

export default function AdminLoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useMutation({
    mutationFn: () =>
      apiRequest<StaffIdentity>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    onSuccess: (identity) => {
      queryClient.setQueryData(["staff-me"], identity);
      router.replace("/admin/products");
    },
  });
  const error =
    login.error instanceof ApiClientError
      ? login.error.detail.code === "ACCOUNT_DISABLED"
        ? "This account is disabled. Contact an administrator."
        : "Email or password is incorrect."
      : login.isError
        ? "Sign in could not be completed."
        : null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    login.mutate();
  };
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-6">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-card border border-line bg-paper-raised p-8"
      >
        <p className="font-mono text-eyebrow tracking-widest text-brand-green">
          Staff workspace
        </p>
        <h1 className="mt-3 text-h1 font-semibold text-ink">Sign in</h1>
        {error ? (
          <p role="alert" className="mt-4 text-status-rejected">
            {error}
          </p>
        ) : null}
        <label className="mt-6 block font-medium text-ink">
          Email
          <input
            required
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-control border border-line-strong px-3 py-2"
          />
        </label>
        <label className="mt-4 block font-medium text-ink">
          Password
          <input
            required
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-control border border-line-strong px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={login.isPending}
          className="min-h-11 mt-6 w-full rounded-control bg-brand-green px-4 py-3 font-medium text-white disabled:opacity-50"
        >
          {login.isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
