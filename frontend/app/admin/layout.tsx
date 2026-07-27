import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { QueryProvider } from "@/components/providers/QueryProvider";

export default function AdminLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <AdminShell>{children}</AdminShell>
        </QueryProvider>
      </body>
    </html>
  );
}
