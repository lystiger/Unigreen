"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { InquiryStatusBadge } from "@/components/admin/InquiryStatusBadge";
import { ApiErrorState } from "@/components/ui/AsyncState";
import { ApiClientError, apiRequest } from "@/lib/api/client";
import type { InquiryStatus, StaffInquiryDetail, StaffSummary } from "@/lib/api/types";
import { useCurrentStaff } from "@/lib/auth";

const STATUS_OPTIONS: InquiryStatus[] = [
  "new",
  "qualified",
  "quoted",
  "won",
  "lost",
  "spam",
  "duplicate",
];

export default function AdminInquiryDetailPage() {
  const params = useParams<{ id: string }>();
  const inquiryId = params.id;
  const staff = useCurrentStaff();
  const queryClient = useQueryClient();

  const canWrite = staff.data?.permissions.includes("inquiry:write") ?? false;

  const inquiryQuery = useQuery({
    queryKey: ["staff-inquiry", inquiryId],
    queryFn: () =>
      apiRequest<StaffInquiryDetail>(`/api/v1/staff/inquiries/${inquiryId}`),
  });

  const assigneesQuery = useQuery({
    queryKey: ["staff-assignees"],
    queryFn: () => apiRequest<StaffSummary[]>("/api/v1/staff/inquiries/assignees"),
  });

  // Local state for mutations
  const [selectedStatus, setSelectedStatus] = useState<InquiryStatus | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState("");

  const [statusNotice, setStatusNotice] = useState("");
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);

  const [assignNotice, setAssignNotice] = useState("");
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSaving, setAssignSaving] = useState(false);

  const [noteNotice, setNoteNotice] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteSaving, setNoteSaving] = useState(false);

  const [expandedSnapshots, setExpandedSnapshots] = useState<Record<string, boolean>>(
    {},
  );

  const inquiry = inquiryQuery.data;

  // Handlers
  const handleUpdateStatus = async () => {
    if (!inquiry || !selectedStatus || selectedStatus === inquiry.status) return;
    setStatusSaving(true);
    setStatusNotice("");
    setStatusError(null);
    try {
      await apiRequest(`/api/v1/staff/inquiries/${inquiry.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: selectedStatus,
          version: inquiry.version,
        }),
      });
      setStatusNotice("Status updated successfully.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["staff-inquiry", inquiry.id] }),
        queryClient.invalidateQueries({ queryKey: ["staff-inquiries"] }),
      ]);
    } catch (err) {
      setStatusError(
        err instanceof ApiClientError ? err.message : "Failed to update status.",
      );
    } finally {
      setStatusSaving(false);
    }
  };

  const handleUpdateAssignee = async () => {
    if (!inquiry) return;
    const targetStaffId = selectedAssignee === "" ? null : selectedAssignee;
    if (targetStaffId === inquiry.assigned_staff_id) return;
    setAssignSaving(true);
    setAssignNotice("");
    setAssignError(null);
    try {
      await apiRequest(`/api/v1/staff/inquiries/${inquiry.id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({
          assigned_staff_id: targetStaffId,
          version: inquiry.version,
        }),
      });
      setAssignNotice("Staff assignment updated successfully.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["staff-inquiry", inquiry.id] }),
        queryClient.invalidateQueries({ queryKey: ["staff-inquiries"] }),
      ]);
    } catch (err) {
      setAssignError(
        err instanceof ApiClientError ? err.message : "Failed to update assignment.",
      );
    } finally {
      setAssignSaving(false);
    }
  };

  const handleAddNote = async (event: FormEvent) => {
    event.preventDefault();
    if (!inquiry || !newNoteContent.trim()) return;
    setNoteSaving(true);
    setNoteNotice("");
    setNoteError(null);
    try {
      await apiRequest(`/api/v1/staff/inquiries/${inquiry.id}/notes`, {
        method: "POST",
        body: JSON.stringify({ content: newNoteContent.trim() }),
      });
      setNewNoteContent("");
      setNoteNotice("Internal note added successfully.");
      await queryClient.invalidateQueries({ queryKey: ["staff-inquiry", inquiry.id] });
    } catch (err) {
      setNoteError(
        err instanceof ApiClientError ? err.message : "Failed to add internal note.",
      );
    } finally {
      setNoteSaving(false);
    }
  };

  const toggleSnapshot = (lineId: string) => {
    setExpandedSnapshots((prev) => ({
      ...prev,
      [lineId]: !prev[lineId],
    }));
  };

  if (inquiryQuery.isPending) {
    return (
      <div className="p-12 text-center text-ink-muted" aria-busy="true">
        Loading inquiry details…
      </div>
    );
  }

  if (inquiryQuery.isError || !inquiry) {
    return (
      <ApiErrorState
        title="Inquiry not found"
        message={
          inquiryQuery.error instanceof ApiClientError
            ? inquiryQuery.error.message
            : "Could not retrieve the requested inquiry."
        }
        requestId={
          inquiryQuery.error instanceof ApiClientError
            ? inquiryQuery.error.detail.request_id
            : undefined
        }
        retryLabel="Back to inquiries"
        onRetry={() => {
          window.location.href = "/admin/inquiries";
        }}
      />
    );
  }

  const currentEffectiveStatus = selectedStatus ?? inquiry.status;
  const currentEffectiveAssignee =
    selectedAssignee !== null ? selectedAssignee : (inquiry.assigned_staff_id ?? "");

  return (
    <>
      <div className="mb-6">
        <Link
          href="/admin/inquiries"
          className="text-data text-brand-dark underline decoration-brand-green/40 hover:decoration-brand-green"
        >
          ← Back to Inquiries
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1
              className="font-mono text-h1 font-bold text-ink"
              data-testid="inquiry-reference"
            >
              {inquiry.reference}
            </h1>
            <InquiryStatusBadge status={inquiry.status} />
          </div>
          <p className="mt-1 text-data text-ink-muted">
            Submitted on{" "}
            {new Date(inquiry.created_at).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            {" • "}
            Version: {inquiry.version}
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left 2 Columns: Verbatim Customer Submission */}
        <div className="space-y-8 lg:col-span-2">
          {/* Customer Details Card */}
          <section className="rounded-card border border-line bg-paper-raised p-6">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <span className="font-mono text-eyebrow tracking-widest text-brand-green font-semibold">
                  Customer Submission (Immutable)
                </span>
                <h2 className="text-h2 font-semibold text-ink">Contact & Company</h2>
              </div>
              <span className="rounded-control bg-paper-sunk px-2.5 py-1 text-eyebrow text-ink-muted">
                Source: {inquiry.source} ({inquiry.locale.toUpperCase()})
              </span>
            </div>

            <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 text-data">
              <div>
                <dt className="text-ink-muted">Contact Name</dt>
                <dd className="font-medium text-ink mt-0.5" data-testid="contact-name">
                  {inquiry.contact_name}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Email</dt>
                <dd className="font-medium text-ink mt-0.5" data-testid="contact-email">
                  <a
                    href={`mailto:${inquiry.email}`}
                    className="underline decoration-brand-green/40 hover:decoration-brand-green"
                  >
                    {inquiry.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Phone</dt>
                <dd className="font-medium text-ink mt-0.5" data-testid="contact-phone">
                  {inquiry.phone || <span className="text-ink-muted italic">None</span>}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Company Name</dt>
                <dd className="font-medium text-ink mt-0.5" data-testid="company-name">
                  {inquiry.company_name || (
                    <span className="text-ink-muted italic">
                      Individual / Unspecified
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Tax Code</dt>
                <dd className="font-mono text-ink mt-0.5" data-testid="tax-code">
                  {inquiry.tax_code || (
                    <span className="text-ink-muted italic">Not provided</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Destination / Port</dt>
                <dd className="font-medium text-ink mt-0.5" data-testid="destination">
                  {inquiry.destination || (
                    <span className="text-ink-muted italic">Not provided</span>
                  )}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-ink-muted">Delivery Address</dt>
                <dd className="font-medium text-ink mt-0.5" data-testid="address">
                  {inquiry.address || (
                    <span className="text-ink-muted italic">Not provided</span>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          {/* Customer Notes & OEM Requirements */}
          <section className="rounded-card border border-line bg-paper-raised p-6">
            <span className="font-mono text-eyebrow tracking-widest text-brand-green font-semibold">
              Original Customer Notes (Immutable)
            </span>
            <h2 className="text-h2 font-semibold text-ink mt-1">
              Customer Instructions & OEM
            </h2>

            <div className="mt-6 space-y-4">
              <div>
                <h3 className="text-data font-semibold text-ink-muted">
                  Customer Notes
                </h3>
                <div
                  className="mt-1.5 rounded-control border border-line bg-paper-sunk p-3 text-data text-ink whitespace-pre-wrap font-sans"
                  data-testid="customer-notes"
                >
                  {inquiry.notes ? (
                    inquiry.notes
                  ) : (
                    <span className="text-ink-muted italic">
                      No additional customer notes submitted.
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-data font-semibold text-ink-muted">
                  OEM / Custom Branding Requirements
                </h3>
                <div
                  className="mt-1.5 rounded-control border border-line bg-paper-sunk p-3 text-data text-ink whitespace-pre-wrap font-sans"
                  data-testid="oem-requirements"
                >
                  {inquiry.oem_requirements ? (
                    inquiry.oem_requirements
                  ) : (
                    <span className="text-ink-muted italic">
                      No OEM requirements specified.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Inquiry Line Items */}
          <section className="rounded-card border border-line bg-paper-raised p-6">
            <span className="font-mono text-eyebrow tracking-widest text-brand-green font-semibold">
              Requested Products ({inquiry.lines.length})
            </span>
            <h2 className="text-h2 font-semibold text-ink mt-1">Line Items</h2>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left" data-testid="inquiry-lines-table">
                <thead className="border-b border-line bg-paper-sunk text-data">
                  <tr>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Product Name</th>
                    <th className="p-3">Pack Option</th>
                    <th className="p-3 text-right">Quantity</th>
                    <th className="p-3">Unit</th>
                    <th className="p-3">Requirements</th>
                    <th className="p-3 text-center">Snapshot</th>
                  </tr>
                </thead>
                <tbody>
                  {inquiry.lines.map((line) => (
                    <tr
                      key={line.id}
                      className="border-b border-line last:border-0 text-data align-top"
                    >
                      <td className="p-3 font-mono font-medium text-ink">
                        {line.product_sku}
                      </td>
                      <td className="p-3 font-medium text-ink">{line.product_name}</td>
                      <td className="p-3 text-ink-muted">{line.pack_option || "—"}</td>
                      <td className="p-3 text-right font-mono font-medium">
                        {line.quantity}
                      </td>
                      <td className="p-3 text-ink-muted">{line.unit}</td>
                      <td className="p-3 text-ink-muted max-w-xs">
                        {line.requirements || <span className="italic">None</span>}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSnapshot(line.id)}
                          className="text-eyebrow font-mono text-brand-dark underline"
                        >
                          {expandedSnapshots[line.id] ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Expandable Snapshots */}
              {inquiry.lines.map((line) =>
                expandedSnapshots[line.id] ? (
                  <div
                    key={`snapshot-${line.id}`}
                    className="mt-4 rounded-control border border-line bg-paper-sunk p-4"
                  >
                    <p className="font-mono text-eyebrow text-ink-muted mb-2 font-semibold">
                      Snapshot for {line.product_sku} (Captured at submission time):
                    </p>
                    <pre className="overflow-x-auto text-eyebrow font-mono text-ink">
                      {JSON.stringify(line.product_snapshot, null, 2)}
                    </pre>
                  </div>
                ) : null,
              )}
            </div>
          </section>
        </div>

        {/* Right 1 Column: Staff Operations, Assignment, Internal Notes */}
        <div className="space-y-8">
          {/* Status Controls Card */}
          <section className="rounded-card border border-line bg-paper-raised p-6">
            <span className="font-mono text-eyebrow tracking-widest text-brand-green font-semibold">
              Operational Workflow
            </span>
            <h2 className="text-h2 font-semibold text-ink mt-1">Inquiry Status</h2>

            <div className="mt-4 space-y-3">
              <label className="block text-data font-medium text-ink">
                Current Status
                <select
                  value={currentEffectiveStatus}
                  disabled={!canWrite || statusSaving}
                  onChange={(e) => setSelectedStatus(e.target.value as InquiryStatus)}
                  className="mt-1.5 w-full rounded-control border border-line-strong bg-paper px-3 py-2 text-data text-ink disabled:opacity-50"
                  data-testid="status-select"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>

              {statusNotice ? (
                <p className="text-eyebrow text-green-700">{statusNotice}</p>
              ) : null}
              {statusError ? (
                <p className="text-eyebrow text-red-600">{statusError}</p>
              ) : null}

              {canWrite ? (
                <button
                  type="button"
                  onClick={handleUpdateStatus}
                  disabled={
                    statusSaving || !selectedStatus || selectedStatus === inquiry.status
                  }
                  className="min-h-11 inline-flex items-center justify-center w-full rounded-control bg-brand-green px-4 py-2 text-data font-medium text-white disabled:opacity-40"
                  data-testid="update-status-button"
                >
                  {statusSaving ? "Updating…" : "Update Status"}
                </button>
              ) : (
                <p className="text-eyebrow text-ink-muted italic">
                  Requires inquiry:write permission to update status.
                </p>
              )}
            </div>
          </section>

          {/* Staff Assignment Card */}
          <section className="rounded-card border border-line bg-paper-raised p-6">
            <span className="font-mono text-eyebrow tracking-widest text-brand-green font-semibold">
              Staff Assignment
            </span>
            <h2 className="text-h2 font-semibold text-ink mt-1">Assigned Staff</h2>

            <div className="mt-4 space-y-3">
              <label className="block text-data font-medium text-ink">
                Assignee
                <select
                  value={currentEffectiveAssignee}
                  disabled={!canWrite || assignSaving || assigneesQuery.isPending}
                  onChange={(e) => setSelectedAssignee(e.target.value)}
                  className="mt-1.5 w-full rounded-control border border-line-strong bg-paper px-3 py-2 text-data text-ink disabled:opacity-50"
                  data-testid="assignee-select"
                >
                  <option value="">Unassigned</option>
                  {(assigneesQuery.data ?? []).map((staffUser) => (
                    <option key={staffUser.id} value={staffUser.id}>
                      {staffUser.email} ({staffUser.role})
                    </option>
                  ))}
                </select>
              </label>

              {assignNotice ? (
                <p className="text-eyebrow text-green-700">{assignNotice}</p>
              ) : null}
              {assignError ? (
                <p className="text-eyebrow text-red-600">{assignError}</p>
              ) : null}

              {canWrite ? (
                <button
                  type="button"
                  onClick={handleUpdateAssignee}
                  disabled={
                    assignSaving ||
                    currentEffectiveAssignee === (inquiry.assigned_staff_id ?? "")
                  }
                  className="min-h-11 inline-flex items-center justify-center w-full rounded-control border border-line-strong bg-paper-raised px-4 py-2 text-data font-medium text-ink disabled:opacity-40"
                  data-testid="update-assignee-button"
                >
                  {assignSaving ? "Assigning…" : "Save Assignment"}
                </button>
              ) : null}
            </div>
          </section>

          {/* Internal Notes Card */}
          <section className="rounded-card border border-line bg-paper-raised p-6">
            <div className="border-b border-line pb-3">
              <span className="font-mono text-eyebrow tracking-widest text-brand-green font-semibold">
                Internal Collaboration
              </span>
              <h2 className="text-h2 font-semibold text-ink mt-1">
                Internal Notes ({inquiry.internal_notes.length})
              </h2>
              <p className="text-eyebrow text-ink-muted mt-1">
                Visible only to staff. Never sent to customer or altering original
                notes.
              </p>
            </div>

            {/* Notes history */}
            <div
              className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1"
              data-testid="internal-notes-list"
            >
              {inquiry.internal_notes.length === 0 ? (
                <p className="text-data text-ink-muted italic p-2">
                  No internal notes recorded yet.
                </p>
              ) : (
                inquiry.internal_notes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-control border border-line bg-paper-sunk p-3 text-data"
                    data-testid={`internal-note-${note.id}`}
                  >
                    <div className="flex items-center justify-between text-eyebrow text-ink-muted mb-1">
                      <span className="font-medium text-ink">
                        {note.author_email || "Staff"}
                      </span>
                      <span>
                        {new Date(note.created_at).toLocaleString(undefined, {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    <p className="text-ink whitespace-pre-wrap font-sans">
                      {note.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Add note form */}
            {canWrite ? (
              <form onSubmit={handleAddNote} className="mt-4 border-t border-line pt-4">
                <label className="block text-data font-medium text-ink">
                  Add Internal Note
                  <textarea
                    rows={3}
                    placeholder="Enter notes about qualification, phone call, quotation details…"
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    disabled={noteSaving}
                    className="mt-1.5 w-full rounded-control border border-line-strong bg-paper p-3 text-data text-ink placeholder:text-ink-muted"
                    data-testid="internal-note-input"
                  />
                </label>

                {noteNotice ? (
                  <p className="mt-2 text-eyebrow text-green-700">{noteNotice}</p>
                ) : null}
                {noteError ? (
                  <p className="mt-2 text-eyebrow text-red-600">{noteError}</p>
                ) : null}

                <button
                  type="submit"
                  disabled={noteSaving || !newNoteContent.trim()}
                  className="mt-3 min-h-11 inline-flex items-center justify-center w-full rounded-control bg-brand-green px-4 py-2 text-data font-medium text-white disabled:opacity-40"
                  data-testid="add-internal-note-button"
                >
                  {noteSaving ? "Saving…" : "Post Note"}
                </button>
              </form>
            ) : null}
          </section>
        </div>
      </div>
    </>
  );
}
