from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from typing import Any, cast
from uuid import UUID, uuid4

import pytest
from httpx import AsyncClient

from unigreen.api.errors import ApiError
from unigreen.audit.models import AuditEvent
from unigreen.auth.dependencies import get_auth_context, require_csrf
from unigreen.auth.models import StaffSession
from unigreen.auth.service import AuthContext
from unigreen.auth.tokens import hash_token
from unigreen.domain.enums import InquiryStatus, Locale, StaffRole, StaffStatus
from unigreen.inquiries.models import Inquiry, InquiryInternalNote, InquiryLine
from unigreen.inquiries.staff_router import get_staff_inquiry_service
from unigreen.inquiries.staff_schemas import StaffInquiryUpdate
from unigreen.inquiries.staff_service import StaffInquiryService
from unigreen.main import app
from unigreen.staff.models import StaffUser


class FakeStaffInquiryRepository:
    def __init__(
        self,
        inquiries: list[Inquiry] | None = None,
        staff_users: list[StaffUser] | None = None,
    ) -> None:
        self.inquiries: dict[UUID, Inquiry] = {inq.id: inq for inq in (inquiries or [])}
        self.staff_users: dict[UUID, StaffUser] = {u.id: u for u in (staff_users or [])}
        self.internal_notes: list[InquiryInternalNote] = []
        self.audits: list[AuditEvent] = []
        self.commits = 0

    async def list_staff_inquiries(
        self,
        *,
        status: InquiryStatus | None = None,
        search: str | None = None,
        assigned_staff_id: UUID | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Inquiry], int]:
        results = list(self.inquiries.values())

        if status is not None:
            results = [i for i in results if i.status == status]
        if assigned_staff_id is not None:
            results = [i for i in results if i.assigned_staff_id == assigned_staff_id]
        if search:
            q = search.strip().lower()
            results = [
                i
                for i in results
                if q in i.reference.lower()
                or q in i.contact_name.lower()
                or (i.company_name and q in i.company_name.lower())
                or q in i.email.lower()
                or (i.phone and q in i.phone.lower())
            ]

        results.sort(key=lambda i: i.created_at, reverse=True)
        total = len(results)
        start = (page - 1) * page_size
        items = results[start : start + page_size]
        return items, total

    async def get_staff_inquiry_by_id(self, inquiry_id: UUID) -> Inquiry | None:
        return self.inquiries.get(inquiry_id)

    async def get_staff_user_by_id(self, staff_user_id: UUID) -> StaffUser | None:
        return self.staff_users.get(staff_user_id)

    async def list_active_staff_users(self) -> list[StaffUser]:
        return sorted(
            [u for u in self.staff_users.values() if u.status == StaffStatus.ACTIVE],
            key=lambda u: u.email,
        )

    def add(self, entity: object) -> None:
        if isinstance(entity, Inquiry):
            self.inquiries[entity.id] = entity
        elif isinstance(entity, InquiryInternalNote):
            self.internal_notes.append(entity)
            if entity.inquiry_id in self.inquiries:
                self.inquiries[entity.inquiry_id].internal_notes.append(entity)

    def add_audit(self, event: AuditEvent) -> None:
        self.audits.append(event)

    async def commit(self) -> None:
        self.commits += 1

    async def rollback(self) -> None:
        pass

    async def refresh(self, entity: object) -> None:
        pass


def make_staff(
    *,
    email: str = "sales@example.com",
    role: StaffRole = StaffRole.SALES_STAFF,
    status: StaffStatus = StaffStatus.ACTIVE,
) -> StaffUser:
    return StaffUser(
        id=uuid4(),
        email=email,
        password_hash="argon_hash",
        role=role,
        status=status,
        version=1,
    )


def make_inquiry(
    *,
    reference: str = "UG-INQ-2026-000001",
    status: InquiryStatus = InquiryStatus.NEW,
    contact_name: str = "Nguyen Van A",
    email: str = "a@example.com",
    company_name: str = "Uni-Eco Corp",
    notes: str = "Original customer submitted requirements verbatim",
    assigned_staff: StaffUser | None = None,
) -> Inquiry:
    inq_id = uuid4()
    prod_id = uuid4()
    inquiry = Inquiry(
        id=inq_id,
        reference=reference,
        status=status,
        contact_name=contact_name,
        email=email,
        phone="+84901234567",
        company_name=company_name,
        tax_code="0101234567",
        address="123 Le Loi, Hanoi",
        destination="Hai Phong Port",
        notes=notes,
        oem_requirements="Custom brand embossing requested",
        locale=Locale.VI,
        source="public_website",
        assigned_staff_id=assigned_staff.id if assigned_staff else None,
        idempotency_key="idem-12345",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
        version=1,
    )
    inquiry.assigned_staff = assigned_staff
    line = InquiryLine(
        id=uuid4(),
        inquiry_id=inq_id,
        product_id=prod_id,
        product_sku="UG-001",
        product_name="Bathroom Tissue Premium",
        pack_option="12 rolls",
        product_snapshot={
            "sku": "UG-001",
            "name": "Bathroom Tissue Premium",
            "media": [{"url": "https://cdn.example.com/tissue.jpg"}],
        },
        quantity=Decimal("500.00"),
        unit="carton",
        requirements="Moisture-proof wrapping",
        sort_order=0,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    inquiry.lines = [line]
    inquiry.internal_notes = []
    return inquiry


@pytest.mark.asyncio
async def test_staff_inquiry_service_list_and_filters() -> None:
    staff1 = make_staff(email="rep1@example.com")
    staff2 = make_staff(email="rep2@example.com")
    inq1 = make_inquiry(
        reference="UG-INQ-2026-000001",
        status=InquiryStatus.NEW,
        contact_name="Alice Nguyen",
        company_name="Alpha Corp",
        assigned_staff=staff1,
    )
    inq2 = make_inquiry(
        reference="UG-INQ-2026-000002",
        status=InquiryStatus.QUALIFIED,
        contact_name="Bob Tran",
        company_name="Beta Logistics",
        assigned_staff=staff2,
    )
    inq3 = make_inquiry(
        reference="UG-INQ-2026-000003",
        status=InquiryStatus.QUOTED,
        contact_name="Charlie Le",
        company_name="Gamma Industries",
    )

    repo = FakeStaffInquiryRepository(inquiries=[inq1, inq2, inq3], staff_users=[staff1, staff2])
    service = StaffInquiryService(cast(Any, repo))

    # All items
    page = await service.list_inquiries()
    assert page.pagination.total == 3
    assert len(page.items) == 3

    # Filter by status
    page_qual = await service.list_inquiries(status=InquiryStatus.QUALIFIED)
    assert page_qual.pagination.total == 1
    assert page_qual.items[0].reference == "UG-INQ-2026-000002"

    # Filter by search reference
    page_ref = await service.list_inquiries(search="000003")
    assert page_ref.pagination.total == 1
    assert page_ref.items[0].reference == "UG-INQ-2026-000003"

    # Filter by search company name
    page_comp = await service.list_inquiries(search="Alpha")
    assert page_comp.pagination.total == 1
    assert page_comp.items[0].company_name == "Alpha Corp"

    # Filter by assigned staff
    page_assigned = await service.list_inquiries(assigned_staff_id=staff1.id)
    assert page_assigned.pagination.total == 1
    assert page_assigned.items[0].assigned_staff_id == staff1.id


@pytest.mark.asyncio
async def test_staff_inquiry_service_get_detail_and_snapshots() -> None:
    staff = make_staff()
    inq = make_inquiry(assigned_staff=staff)
    repo = FakeStaffInquiryRepository(inquiries=[inq], staff_users=[staff])
    service = StaffInquiryService(cast(Any, repo))

    detail = await service.get_inquiry(inq.id)
    assert detail.id == inq.id
    assert detail.reference == inq.reference
    assert detail.contact_name == inq.contact_name
    assert detail.notes == "Original customer submitted requirements verbatim"
    assert detail.assigned_staff is not None
    assert detail.assigned_staff.email == staff.email
    assert len(detail.lines) == 1
    assert detail.lines[0].product_sku == "UG-001"
    assert detail.lines[0].product_snapshot["sku"] == "UG-001"

    with pytest.raises(ApiError) as not_found:
        await service.get_inquiry(uuid4())
    assert not_found.value.code == "INQUIRY_NOT_FOUND"


@pytest.mark.asyncio
async def test_staff_inquiry_service_status_transition_and_audit() -> None:
    staff = make_staff()
    inq = make_inquiry(status=InquiryStatus.NEW)
    repo = FakeStaffInquiryRepository(inquiries=[inq], staff_users=[staff])
    service = StaffInquiryService(cast(Any, repo))

    # Transition from new to qualified
    updated = await service.update_status(
        inquiry_id=inq.id,
        status=InquiryStatus.QUALIFIED,
        actor_staff_id=staff.id,
        request_id="req-status-1",
        version=1,
    )
    assert updated.status == InquiryStatus.QUALIFIED
    assert inq.version == 2
    assert len(repo.audits) == 1
    audit = repo.audits[0]
    assert audit.action == "inquiry.status_updated"
    assert audit.actor_staff_id == staff.id
    assert audit.entity_id == inq.id
    assert audit.change_summary == {
        "old_status": "new",
        "new_status": "qualified",
    }

    # Optimistic concurrency conflict when supplying wrong version
    with pytest.raises(ApiError) as conflict:
        await service.update_status(
            inquiry_id=inq.id,
            status=InquiryStatus.QUOTED,
            actor_staff_id=staff.id,
            request_id="req-status-2",
            version=1,  # current version is 2
        )
    assert conflict.value.code == "CONCURRENCY_CONFLICT"
    assert conflict.value.status_code == 409


@pytest.mark.asyncio
async def test_staff_inquiry_service_assignment_validation_and_audit() -> None:
    staff_active = make_staff(email="active@example.com")
    staff_disabled = make_staff(email="disabled@example.com", status=StaffStatus.DISABLED)
    inq = make_inquiry()
    repo = FakeStaffInquiryRepository(inquiries=[inq], staff_users=[staff_active, staff_disabled])
    service = StaffInquiryService(cast(Any, repo))

    # Assign to active staff succeeds
    res = await service.assign_inquiry(
        inquiry_id=inq.id,
        assigned_staff_id=staff_active.id,
        actor_staff_id=staff_active.id,
        request_id="req-assign-1",
        version=1,
    )
    assert res.assigned_staff_id == staff_active.id
    assert inq.assigned_staff_id == staff_active.id
    assert inq.version == 2
    assert len(repo.audits) == 1
    assert repo.audits[0].action == "inquiry.assigned"
    assert repo.audits[0].change_summary["new_assigned_staff_id"] == str(staff_active.id)

    # Assign to nonexistent staff fails with 404
    with pytest.raises(ApiError) as not_found:
        await service.assign_inquiry(
            inquiry_id=inq.id,
            assigned_staff_id=uuid4(),
            actor_staff_id=staff_active.id,
            request_id="req-assign-2",
            version=2,
        )
    assert not_found.value.code == "STAFF_USER_NOT_FOUND"

    # Assign to disabled staff fails with 422
    with pytest.raises(ApiError) as disabled_err:
        await service.assign_inquiry(
            inquiry_id=inq.id,
            assigned_staff_id=staff_disabled.id,
            actor_staff_id=staff_active.id,
            request_id="req-assign-3",
            version=2,
        )
    assert disabled_err.value.code == "STAFF_USER_NOT_ACTIVE"

    # Unassigning inquiry
    res_unassigned = await service.assign_inquiry(
        inquiry_id=inq.id,
        assigned_staff_id=None,
        actor_staff_id=staff_active.id,
        request_id="req-assign-4",
        version=2,
    )
    assert res_unassigned.assigned_staff_id is None
    assert inq.assigned_staff_id is None


@pytest.mark.asyncio
async def test_staff_inquiry_service_internal_notes_isolation_and_immutability() -> None:
    staff = make_staff(email="reviewer@example.com")
    inq = make_inquiry(notes="Verbatim customer notes: DO NOT OVERWRITE")
    repo = FakeStaffInquiryRepository(inquiries=[inq], staff_users=[staff])
    service = StaffInquiryService(cast(Any, repo))

    # Add internal note
    note_res = await service.add_internal_note(
        inquiry_id=inq.id,
        content="Internal staff review note: check warehouse pallet availability.",
        actor_staff_id=staff.id,
        request_id="req-note-1",
    )

    assert note_res.author_email == "reviewer@example.com"
    assert "check warehouse pallet availability" in note_res.content

    # Strict isolation: customer notes must remain 100% unchanged
    assert inq.notes == "Verbatim customer notes: DO NOT OVERWRITE"

    # Note is logged in internal_notes and audit emitted
    assert len(inq.internal_notes) == 1
    assert inq.internal_notes[0].content == note_res.content
    assert inq.internal_notes[0].author_staff_id == staff.id

    assert any(a.action == "inquiry.internal_note_added" for a in repo.audits)

    # Empty note rejected
    with pytest.raises(ApiError) as empty_err:
        await service.add_internal_note(
            inquiry_id=inq.id,
            content="   ",
            actor_staff_id=staff.id,
            request_id="req-note-2",
        )
    assert empty_err.value.code == "INVALID_NOTE_CONTENT"


@pytest.mark.asyncio
async def test_staff_inquiry_update_immutability_of_customer_submission() -> None:
    staff = make_staff()
    inq = make_inquiry(
        contact_name="Original Name",
        email="original@example.com",
        company_name="Original Co",
        notes="Original Notes",
    )
    repo = FakeStaffInquiryRepository(inquiries=[inq], staff_users=[staff])
    service = StaffInquiryService(cast(Any, repo))

    # Perform combined update
    update_payload = StaffInquiryUpdate(
        status=InquiryStatus.WON,
        assigned_staff_id=staff.id,
        version=1,
    )
    res = await service.update_inquiry(
        inquiry_id=inq.id,
        payload=update_payload,
        actor_staff_id=staff.id,
        request_id="req-update-1",
    )

    assert res.status == InquiryStatus.WON
    assert res.assigned_staff_id == staff.id

    # Customer submission data is strictly preserved
    assert res.contact_name == "Original Name"
    assert res.email == "original@example.com"
    assert res.company_name == "Original Co"
    assert res.notes == "Original Notes"
    assert res.lines[0].product_sku == "UG-001"
    assert res.lines[0].quantity == Decimal("500.00")


@pytest.mark.asyncio
async def test_staff_inquiry_endpoints_via_client(client: AsyncClient) -> None:
    sales_staff = make_staff(email="sales.rep@example.com", role=StaffRole.SALES_STAFF)
    content_editor = make_staff(email="editor@example.com", role=StaffRole.CONTENT_EDITOR)
    inq = make_inquiry()

    repo = FakeStaffInquiryRepository(inquiries=[inq], staff_users=[sales_staff, content_editor])
    service = StaffInquiryService(cast(Any, repo))

    app.dependency_overrides[get_staff_inquiry_service] = lambda: service

    # 1. Unauthenticated request fails with 401
    res_unauth = await client.get("/api/v1/staff/inquiries")
    assert res_unauth.status_code == 401
    assert res_unauth.json()["error"]["code"] == "AUTHENTICATION_REQUIRED"

    # Helper context functions
    def set_auth(user: StaffUser) -> AuthContext:
        return AuthContext(
            user=user,
            session=StaffSession(
                staff_user_id=user.id,
                token_hash=hash_token("test-session"),
                csrf_token_hash=hash_token("test-csrf"),
                expires_at=datetime.now(UTC),
            ),
        )

    # 2. Content editor lacks inquiry:read permission -> 403
    app.dependency_overrides[get_auth_context] = lambda: set_auth(content_editor)
    app.dependency_overrides[require_csrf] = lambda: set_auth(content_editor)

    res_forbidden = await client.get("/api/v1/staff/inquiries")
    assert res_forbidden.status_code == 403
    assert res_forbidden.json()["error"]["code"] == "PERMISSION_DENIED"

    # Content editor lacks inquiry:write on mutation -> 403
    res_mutate_forbidden = await client.patch(
        f"/api/v1/staff/inquiries/{inq.id}/status",
        json={"status": "qualified"},
    )
    assert res_mutate_forbidden.status_code == 403
    assert res_mutate_forbidden.json()["error"]["code"] == "PERMISSION_DENIED"

    # 3. Sales staff has inquiry:read and inquiry:write -> succeeds
    app.dependency_overrides[get_auth_context] = lambda: set_auth(sales_staff)
    app.dependency_overrides[require_csrf] = lambda: set_auth(sales_staff)

    # List
    res_list = await client.get("/api/v1/staff/inquiries")
    assert res_list.status_code == 200
    data = res_list.json()
    assert data["pagination"]["total"] == 1
    assert data["items"][0]["reference"] == inq.reference

    # Detail
    res_detail = await client.get(f"/api/v1/staff/inquiries/{inq.id}")
    assert res_detail.status_code == 200
    detail_data = res_detail.json()
    assert detail_data["contact_name"] == inq.contact_name
    assert detail_data["notes"] == inq.notes

    # Assignees list
    res_assignees = await client.get("/api/v1/staff/inquiries/assignees")
    assert res_assignees.status_code == 200
    assert len(res_assignees.json()) >= 1

    # Status update
    res_status = await client.patch(
        f"/api/v1/staff/inquiries/{inq.id}/status",
        json={"status": "qualified", "version": inq.version},
    )
    assert res_status.status_code == 200
    assert res_status.json()["status"] == "qualified"

    # Assign update
    res_assign = await client.patch(
        f"/api/v1/staff/inquiries/{inq.id}/assign",
        json={"assigned_staff_id": str(sales_staff.id), "version": inq.version},
    )
    assert res_assign.status_code == 200
    assert res_assign.json()["assigned_staff_id"] == str(sales_staff.id)

    # Add internal note
    res_note = await client.post(
        f"/api/v1/staff/inquiries/{inq.id}/notes",
        json={"content": "Customer asked for delivery by end of next month."},
    )
    assert res_note.status_code == 201
    assert res_note.json()["content"] == "Customer asked for delivery by end of next month."

    # Cleanup overrides
    app.dependency_overrides.clear()
