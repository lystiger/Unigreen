"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { InquiryStatusBadge } from "@/components/admin/InquiryStatusBadge";
import { ApiErrorState } from "@/components/ui/AsyncState";
import { ApiClientError, apiRequest } from "@/lib/api/client";
import type { InquiryStatus, StaffInquiryPage } from "@/lib/api/types";

const ALL_STATUSES: { label: string; value: InquiryStatus | "" }[] = [
  { label: "All statuses", value: "" },
  { label: "New", value: "new" },
  { label: "Qualified", value: "qualified" },
  { label: "Quoted", value: "quoted" },
  { label: "Won", value: "won" },
  { label: "Lost", value: "lost" },
  { label: "Spam", value: "spam" },
  { label: "Duplicate", value: "duplicate" },
];

export default function AdminInquiriesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<InquiryStatus | "">("");
  const [page, setPage] = useState(1);

  const queryParams = new URLSearchParams();
  if (status) queryParams.set("status", status);
  if (search.trim()) queryParams.set("search", search.trim());
  queryParams.set("page", page.toString());
  queryParams.set("page_size", "20");

  const inquiries = useQuery({
    queryKey: ["staff-inquiries", status, search, page],
    queryFn: () =>
      apiRequest<StaffInquiryPage>(`/api/v1/staff/inquiries?${queryParams.toString()}`),
  });

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusChange = (value: InquiryStatus | "") => {
    setStatus(value);
    setPage(1);
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="font-mono text-eyebrow tracking-widest text-brand-green">
            Sales Operations
          </p>
          <h1 className="mt-2 text-h1 font-semibold text-ink">Inquiries</h1>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <label className="flex-1 min-w-[240px] max-w-md">
          <span className="sr-only">Search inquiries</span>
          <input
            type="search"
            placeholder="Search by reference, customer, company, email…"
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            className="w-full rounded-control border border-line-strong bg-paper px-3.5 py-2 text-ink"
            data-testid="inquiry-search-input"
          />
        </label>
        <label>
          <span className="sr-only">Filter by status</span>
          <select
            value={status}
            onChange={(event) =>
              handleStatusChange(event.target.value as InquiryStatus | "")
            }
            className="rounded-control border border-line-strong bg-paper px-3.5 py-2 text-ink"
            data-testid="inquiry-status-filter"
          >
            {ALL_STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {inquiries.isError ? (
        <div className="mt-8">
          <ApiErrorState
            title="Inquiries unavailable"
            message={
              inquiries.error instanceof ApiClientError
                ? inquiries.error.message
                : "Unable to load inquiries. Please retry."
            }
            requestId={
              inquiries.error instanceof ApiClientError
                ? inquiries.error.detail.request_id
                : undefined
            }
            retryLabel="Retry"
            onRetry={() => void inquiries.refetch()}
          />
        </div>
      ) : null}

      {inquiries.isPending ? (
        <div className="mt-8 p-12 text-center text-ink-muted" aria-busy="true">
          Loading inquiries…
        </div>
      ) : null}

      {inquiries.isSuccess ? (
        <>
          <div className="mt-8 overflow-x-auto rounded-card border border-line bg-paper-raised">
            <table className="w-full text-left" data-testid="inquiries-table">
              <thead className="border-b border-line bg-paper-sunk text-data">
                <tr>
                  <th className="p-4">Reference</th>
                  <th className="p-4">Customer / Company</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Assigned Staff</th>
                  <th className="p-4 text-center">Items</th>
                  <th className="p-4">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.data.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-ink-muted"
                      data-testid="inquiries-empty"
                    >
                      No inquiries match the current search and filters.
                    </td>
                  </tr>
                ) : (
                  inquiries.data.items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-line last:border-0 hover:bg-paper-sunk/30 transition-colors"
                      data-testid={`inquiry-row-${item.id}`}
                    >
                      <td className="p-4">
                        <Link
                          href={`/admin/inquiries/${item.id}`}
                          className="font-mono text-data font-semibold text-brand-dark underline decoration-brand-green/40 hover:decoration-brand-green"
                        >
                          {item.reference}
                        </Link>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-ink">{item.contact_name}</div>
                        {item.company_name ? (
                          <div className="text-data text-ink-muted">
                            {item.company_name}
                          </div>
                        ) : null}
                        <div className="text-eyebrow text-ink-muted/80">
                          {item.email}
                        </div>
                      </td>
                      <td className="p-4">
                        <InquiryStatusBadge status={item.status} />
                      </td>
                      <td className="p-4 text-data">
                        {item.assigned_staff ? (
                          <span className="text-ink font-medium">
                            {item.assigned_staff.email}
                          </span>
                        ) : (
                          <span className="text-ink-muted italic">Unassigned</span>
                        )}
                      </td>
                      <td className="p-4 text-center text-data font-mono">
                        {item.lines_count}
                      </td>
                      <td className="p-4 text-data text-ink-muted whitespace-nowrap">
                        {new Date(item.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {inquiries.data.pagination.total_pages > 1 ? (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <p className="text-data text-ink-muted">
                Showing page {inquiries.data.pagination.page} of{" "}
                {inquiries.data.pagination.total_pages} (
                {inquiries.data.pagination.total} total)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="min-h-11 inline-flex items-center justify-center rounded-control border border-line-strong bg-paper px-3 py-1.5 text-data disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= inquiries.data.pagination.total_pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="min-h-11 inline-flex items-center justify-center rounded-control border border-line-strong bg-paper px-3 py-1.5 text-data disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}
