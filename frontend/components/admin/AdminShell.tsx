"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { apiRequest } from "@/lib/api/client";
import { useCurrentStaff } from "@/lib/auth";

export function AdminShell({ children }: { readonly children: ReactNode }) {
  const staff = useCurrentStaff();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (staff.isError && pathname !== "/admin/login") {
      router.replace("/admin/login");
    }
  }, [pathname, router, staff.isError]);

  if (pathname === "/admin/login") {
    return children;
  }
  if (staff.isPending) {
    return (
      <p className="p-8" aria-busy="true">
        Loading staff workspace…
      </p>
    );
  }
  if (staff.isError) {
    return null;
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-paper-raised">
        <div className="shell flex min-h-16 flex-wrap items-center justify-between gap-4 py-3">
          <Link href="/admin/products" className="text-h3 font-semibold text-ink">
            Uni<span className="text-brand-green">-Green</span> Admin
          </Link>
          <nav aria-label="Staff catalogue">
            <ul className="flex items-center gap-5">
              <li>
                <Link href="/admin/products">Products</Link>
              </li>
              <li>
                <Link href="/admin/categories">Categories</Link>
              </li>
            </ul>
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-data text-ink-muted">{staff.data.email}</span>
            <button
              type="button"
              className="rounded-control border border-line-strong px-3 py-2"
              onClick={async () => {
                await apiRequest<void>("/api/v1/auth/logout", { method: "POST" });
                router.replace("/admin/login");
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="shell py-10">{children}</main>
    </div>
  );
}
