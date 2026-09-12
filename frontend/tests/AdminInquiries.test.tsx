import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminInquiryDetailPage from "@/app/admin/inquiries/[id]/page";
import AdminInquiriesPage from "@/app/admin/inquiries/page";
import { InquiryStatusBadge } from "@/components/admin/InquiryStatusBadge";
import type {
  InquiryStatus,
  StaffInquiryDetail,
  StaffInquiryPage,
  StaffSummary,
} from "@/lib/api/types";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "inq-12345" }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/admin/inquiries",
}));

// Mock current staff with inquiry read and write permissions
vi.mock("@/lib/auth", () => ({
  useCurrentStaff: () => ({
    data: {
      id: "staff-1",
      email: "staff.reviewer@example.com",
      role: "sales_staff",
      status: "active",
      permissions: ["inquiry:read", "inquiry:write"],
    },
    isPending: false,
    isError: false,
  }),
}));

// Mock apiRequest
const mockApiRequest = vi.fn();
vi.mock("@/lib/api/client", () => ({
  apiRequest: (path: string, init?: RequestInit) => mockApiRequest(path, init),
  ApiClientError: class ApiClientError extends Error {
    constructor(
      public status: number,
      public detail: { code: string; message: string; request_id?: string },
    ) {
      super(detail.message);
    }
  },
  apiBaseUrl: () => "http://localhost:8000",
}));

const mockInquirySummaryPage: StaffInquiryPage = {
  items: [
    {
      id: "inq-12345",
      reference: "UG-INQ-2026-000001",
      status: "new",
      contact_name: "Tran Van Test",
      email: "tran@example.com",
      phone: "+84912345678",
      company_name: "Test Green Logistics",
      destination: "Cat Lai Port",
      locale: "vi",
      assigned_staff_id: "staff-1",
      assigned_staff: {
        id: "staff-1",
        email: "staff.reviewer@example.com",
        role: "sales_staff",
        status: "active",
      },
      lines_count: 2,
      created_at: "2026-09-12T10:00:00Z",
      updated_at: "2026-09-12T10:00:00Z",
      version: 1,
    },
  ],
  pagination: {
    page: 1,
    page_size: 20,
    total: 1,
    total_pages: 1,
  },
};

const mockInquiryDetail: StaffInquiryDetail = {
  id: "inq-12345",
  reference: "UG-INQ-2026-000001",
  status: "new",
  contact_name: "Tran Van Test",
  email: "tran@example.com",
  phone: "+84912345678",
  company_name: "Test Green Logistics",
  tax_code: "0109998888",
  address: "789 Nguyen Thi Minh Khai, District 1, HCMC",
  destination: "Cat Lai Port",
  notes: "Verbatim customer note: urgent quote required by Friday.",
  oem_requirements: "Verbatim OEM: private label logo embossed on inner core.",
  locale: "vi",
  source: "public_website",
  assigned_staff_id: "staff-1",
  assigned_staff: {
    id: "staff-1",
    email: "staff.reviewer@example.com",
    role: "sales_staff",
    status: "active",
  },
  lines: [
    {
      id: "line-1",
      product_id: "prod-1",
      product_sku: "UG-001",
      product_name: "Bathroom Tissue 12 rolls",
      pack_option: "12 rolls",
      product_snapshot: {
        sku: "UG-001",
        name: "Bathroom Tissue 12 rolls",
      },
      quantity: "500",
      unit: "carton",
      requirements: "Export grade master cartons",
      sort_order: 0,
      created_at: "2026-09-12T10:00:00Z",
    },
  ],
  internal_notes: [
    {
      id: "note-1",
      inquiry_id: "inq-12345",
      author_staff_id: "staff-1",
      author_email: "staff.reviewer@example.com",
      content: "Called customer to verify delivery schedule.",
      created_at: "2026-09-12T11:00:00Z",
      updated_at: "2026-09-12T11:00:00Z",
    },
  ],
  created_at: "2026-09-12T10:00:00Z",
  updated_at: "2026-09-12T10:00:00Z",
  version: 1,
};

const mockAssignees: StaffSummary[] = [
  {
    id: "staff-1",
    email: "staff.reviewer@example.com",
    role: "sales_staff",
    status: "active",
  },
  {
    id: "staff-2",
    email: "manager@example.com",
    role: "sales_manager",
    status: "active",
  },
];

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

describe("InquiryStatusBadge", () => {
  const statuses: InquiryStatus[] = [
    "new",
    "qualified",
    "quoted",
    "won",
    "lost",
    "spam",
    "duplicate",
  ];

  it.each(statuses)("renders status badge for '%s'", (status) => {
    render(<InquiryStatusBadge status={status} />);
    const badge = screen.getByTestId(`inquiry-status-badge-${status}`);
    expect(badge).toBeVisible();
    expect(badge).toHaveTextContent(status);
  });
});

describe("AdminInquiriesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders inquiries list, table headers, and inquiry rows", async () => {
    mockApiRequest.mockResolvedValueOnce(mockInquirySummaryPage);

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <AdminInquiriesPage />
      </QueryClientProvider>,
    );

    expect(screen.getByRole("heading", { name: "Inquiries" })).toBeVisible();
    expect(screen.getByTestId("inquiry-search-input")).toBeVisible();
    expect(screen.getByTestId("inquiry-status-filter")).toBeVisible();

    await waitFor(() => {
      expect(screen.getByTestId("inquiries-table")).toBeVisible();
    });

    expect(screen.getByText("UG-INQ-2026-000001")).toBeVisible();
    expect(screen.getByText("Tran Van Test")).toBeVisible();
    expect(screen.getByText("Test Green Logistics")).toBeVisible();
    expect(screen.getByText("staff.reviewer@example.com")).toBeVisible();
  });

  it("triggers search and status filter query updates", async () => {
    mockApiRequest.mockResolvedValue(mockInquirySummaryPage);
    const user = userEvent.setup();

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <AdminInquiriesPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("inquiries-table")).toBeVisible();
    });

    const searchInput = screen.getByTestId("inquiry-search-input");
    fireEvent.change(searchInput, { target: { value: "Alpha" } });

    await waitFor(() => {
      expect(
        mockApiRequest.mock.calls.some(
          (call) => typeof call[0] === "string" && call[0].includes("search=Alpha"),
        ),
      ).toBe(true);
    });

    const statusFilter = screen.getByTestId("inquiry-status-filter");
    await user.selectOptions(statusFilter, "qualified");

    await waitFor(() => {
      expect(
        mockApiRequest.mock.calls.some(
          (call) => typeof call[0] === "string" && call[0].includes("status=qualified"),
        ),
      ).toBe(true);
    });
  });
});

describe("AdminInquiryDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders verbatim customer submission and lines", async () => {
    mockApiRequest.mockImplementation((path: string) => {
      if (path.includes("/assignees")) {
        return Promise.resolve(mockAssignees);
      }
      return Promise.resolve(mockInquiryDetail);
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <AdminInquiryDetailPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("inquiry-reference")).toHaveTextContent(
        "UG-INQ-2026-000001",
      );
    });

    // Customer fields verbatim
    expect(screen.getByTestId("contact-name")).toHaveTextContent("Tran Van Test");
    expect(screen.getByTestId("contact-email")).toHaveTextContent("tran@example.com");
    expect(screen.getByTestId("contact-phone")).toHaveTextContent("+84912345678");
    expect(screen.getByTestId("company-name")).toHaveTextContent(
      "Test Green Logistics",
    );
    expect(screen.getByTestId("tax-code")).toHaveTextContent("0109998888");
    expect(screen.getByTestId("destination")).toHaveTextContent("Cat Lai Port");
    expect(screen.getByTestId("address")).toHaveTextContent(
      "789 Nguyen Thi Minh Khai, District 1, HCMC",
    );
    expect(screen.getByTestId("customer-notes")).toHaveTextContent(
      "Verbatim customer note: urgent quote required by Friday.",
    );
    expect(screen.getByTestId("oem-requirements")).toHaveTextContent(
      "Verbatim OEM: private label logo embossed on inner core.",
    );

    // Line items
    expect(screen.getByText("UG-001")).toBeVisible();
    expect(screen.getByText("Bathroom Tissue 12 rolls")).toBeVisible();
    expect(screen.getByText("500")).toBeVisible();

    // Internal notes list
    expect(
      screen.getByText("Called customer to verify delivery schedule."),
    ).toBeVisible();
  });

  it("allows updating status and posting internal notes", async () => {
    mockApiRequest.mockImplementation((path: string) => {
      if (path.includes("/assignees")) {
        return Promise.resolve(mockAssignees);
      }
      return Promise.resolve(mockInquiryDetail);
    });

    const user = userEvent.setup();
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <AdminInquiryDetailPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("inquiry-reference")).toBeVisible();
    });

    // Change status
    const statusSelect = screen.getByTestId("status-select");
    await user.selectOptions(statusSelect, "qualified");

    const updateStatusBtn = screen.getByTestId("update-status-button");
    expect(updateStatusBtn).toBeEnabled();

    mockApiRequest.mockResolvedValueOnce({
      ...mockInquiryDetail,
      status: "qualified",
      version: 2,
    });
    await user.click(updateStatusBtn);

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/v1/staff/inquiries/inq-12345/status",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ status: "qualified", version: 1 }),
        }),
      );
    });

    // Add note
    const noteInput = screen.getByTestId("internal-note-input");
    await user.type(noteInput, "Sample sent via express courier.");

    const addNoteBtn = screen.getByTestId("add-internal-note-button");
    expect(addNoteBtn).toBeEnabled();

    mockApiRequest.mockResolvedValueOnce({
      id: "note-2",
      inquiry_id: "inq-12345",
      author_staff_id: "staff-1",
      author_email: "staff.reviewer@example.com",
      content: "Sample sent via express courier.",
      created_at: "2026-09-12T12:00:00Z",
      updated_at: "2026-09-12T12:00:00Z",
    });
    await user.click(addNoteBtn);

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/v1/staff/inquiries/inq-12345/notes",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ content: "Sample sent via express courier." }),
        }),
      );
    });
  });
});
