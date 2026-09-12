from __future__ import annotations

from datetime import UTC, datetime
from math import ceil
from uuid import UUID, uuid4

from unigreen.api.errors import ApiError
from unigreen.audit.models import AuditEvent
from unigreen.domain.enums import InquiryStatus, StaffStatus
from unigreen.inquiries.models import Inquiry, InquiryInternalNote
from unigreen.inquiries.repository import InquiryRepository
from unigreen.inquiries.staff_schemas import (
    InquiryInternalNoteResponse,
    PaginationMetadata,
    StaffInquiryDetailResponse,
    StaffInquiryLineResponse,
    StaffInquiryPage,
    StaffInquirySummaryResponse,
    StaffInquiryUpdate,
    StaffSummaryResponse,
)
from unigreen.staff.models import StaffUser


class StaffInquiryService:
    def __init__(self, repository: InquiryRepository) -> None:
        self.repository = repository

    @staticmethod
    def _staff_summary(staff_user: StaffUser | None) -> StaffSummaryResponse | None:
        if staff_user is None:
            return None
        return StaffSummaryResponse(
            id=staff_user.id,
            email=staff_user.email,
            role=staff_user.role,
            status=staff_user.status,
        )

    def _summary_response(self, inquiry: Inquiry) -> StaffInquirySummaryResponse:
        return StaffInquirySummaryResponse(
            id=inquiry.id,
            reference=inquiry.reference,
            status=inquiry.status,
            contact_name=inquiry.contact_name,
            email=inquiry.email,
            phone=inquiry.phone,
            company_name=inquiry.company_name,
            destination=inquiry.destination,
            locale=inquiry.locale,
            assigned_staff_id=inquiry.assigned_staff_id,
            assigned_staff=self._staff_summary(inquiry.assigned_staff),
            lines_count=len(inquiry.lines),
            created_at=inquiry.created_at,
            updated_at=inquiry.updated_at,
            version=inquiry.version,
        )

    def _detail_response(self, inquiry: Inquiry) -> StaffInquiryDetailResponse:
        return StaffInquiryDetailResponse(
            id=inquiry.id,
            reference=inquiry.reference,
            status=inquiry.status,
            contact_name=inquiry.contact_name,
            email=inquiry.email,
            phone=inquiry.phone,
            company_name=inquiry.company_name,
            tax_code=inquiry.tax_code,
            address=inquiry.address,
            destination=inquiry.destination,
            notes=inquiry.notes,
            oem_requirements=inquiry.oem_requirements,
            locale=inquiry.locale,
            source=inquiry.source,
            assigned_staff_id=inquiry.assigned_staff_id,
            assigned_staff=self._staff_summary(inquiry.assigned_staff),
            created_at=inquiry.created_at,
            updated_at=inquiry.updated_at,
            version=inquiry.version,
            lines=[
                StaffInquiryLineResponse(
                    id=line.id,
                    product_id=line.product_id,
                    product_sku=line.product_sku,
                    product_name=line.product_name,
                    pack_option=line.pack_option,
                    product_snapshot=line.product_snapshot,
                    quantity=line.quantity,
                    unit=line.unit,
                    requirements=line.requirements,
                    sort_order=line.sort_order,
                    created_at=line.created_at,
                )
                for line in inquiry.lines
            ],
            internal_notes=[
                InquiryInternalNoteResponse(
                    id=note.id or uuid4(),
                    inquiry_id=note.inquiry_id,
                    author_staff_id=note.author_staff_id,
                    author_email=note.author.email if note.author else "",
                    content=note.content,
                    created_at=note.created_at or datetime.now(UTC),
                    updated_at=note.updated_at or datetime.now(UTC),
                )
                for note in inquiry.internal_notes
            ],
        )

    @staticmethod
    def _check_version(current: int, supplied: int | None) -> None:
        if supplied is not None and current != supplied:
            raise ApiError(
                status_code=409,
                code="CONCURRENCY_CONFLICT",
                message="The inquiry was modified by another staff member. Please reload.",
            )

    async def list_inquiries(
        self,
        *,
        status: InquiryStatus | None = None,
        search: str | None = None,
        assigned_staff_id: UUID | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> StaffInquiryPage:
        items, total = await self.repository.list_staff_inquiries(
            status=status,
            search=search,
            assigned_staff_id=assigned_staff_id,
            page=page,
            page_size=page_size,
        )
        total_pages = ceil(total / page_size) if total else 0
        return StaffInquiryPage(
            items=[self._summary_response(item) for item in items],
            pagination=PaginationMetadata(
                page=page,
                page_size=page_size,
                total=total,
                total_pages=total_pages,
            ),
        )

    async def get_inquiry(self, inquiry_id: UUID) -> StaffInquiryDetailResponse:
        inquiry = await self.repository.get_staff_inquiry_by_id(inquiry_id)
        if not inquiry:
            raise ApiError(
                status_code=404,
                code="INQUIRY_NOT_FOUND",
                message=f"Inquiry '{inquiry_id}' was not found.",
            )
        return self._detail_response(inquiry)

    async def update_status(
        self,
        inquiry_id: UUID,
        status: InquiryStatus,
        actor_staff_id: UUID,
        request_id: str,
        version: int | None = None,
    ) -> StaffInquiryDetailResponse:
        inquiry = await self.repository.get_staff_inquiry_by_id(inquiry_id)
        if not inquiry:
            raise ApiError(
                status_code=404,
                code="INQUIRY_NOT_FOUND",
                message=f"Inquiry '{inquiry_id}' was not found.",
            )
        self._check_version(inquiry.version, version)
        old_status = inquiry.status
        if old_status != status:
            inquiry.status = status
            inquiry.version += 1
            self.repository.add_audit(
                AuditEvent(
                    actor_staff_id=actor_staff_id,
                    action="inquiry.status_updated",
                    entity_type="inquiry",
                    entity_id=inquiry.id,
                    request_id=request_id,
                    change_summary={
                        "old_status": str(old_status),
                        "new_status": str(status),
                    },
                )
            )
            await self.repository.commit()
            await self.repository.refresh(inquiry)
        return self._detail_response(inquiry)

    async def assign_inquiry(
        self,
        inquiry_id: UUID,
        assigned_staff_id: UUID | None,
        actor_staff_id: UUID,
        request_id: str,
        version: int | None = None,
    ) -> StaffInquiryDetailResponse:
        inquiry = await self.repository.get_staff_inquiry_by_id(inquiry_id)
        if not inquiry:
            raise ApiError(
                status_code=404,
                code="INQUIRY_NOT_FOUND",
                message=f"Inquiry '{inquiry_id}' was not found.",
            )
        self._check_version(inquiry.version, version)
        if assigned_staff_id is not None:
            staff_user = await self.repository.get_staff_user_by_id(assigned_staff_id)
            if not staff_user:
                raise ApiError(
                    status_code=404,
                    code="STAFF_USER_NOT_FOUND",
                    message=f"Staff user '{assigned_staff_id}' was not found.",
                )
            if staff_user.status != StaffStatus.ACTIVE:
                raise ApiError(
                    status_code=422,
                    code="STAFF_USER_NOT_ACTIVE",
                    message="Disabled staff member cannot be assigned to an inquiry.",
                )

        old_staff_id = inquiry.assigned_staff_id
        if old_staff_id != assigned_staff_id:
            inquiry.assigned_staff_id = assigned_staff_id
            inquiry.version += 1
            self.repository.add_audit(
                AuditEvent(
                    actor_staff_id=actor_staff_id,
                    action="inquiry.assigned",
                    entity_type="inquiry",
                    entity_id=inquiry.id,
                    request_id=request_id,
                    change_summary={
                        "old_assigned_staff_id": str(old_staff_id) if old_staff_id else None,
                        "new_assigned_staff_id": str(assigned_staff_id)
                        if assigned_staff_id
                        else None,
                    },
                )
            )
            await self.repository.commit()
            await self.repository.refresh(inquiry)
        return self._detail_response(inquiry)

    async def update_inquiry(
        self,
        inquiry_id: UUID,
        payload: StaffInquiryUpdate,
        actor_staff_id: UUID,
        request_id: str,
    ) -> StaffInquiryDetailResponse:
        inquiry = await self.repository.get_staff_inquiry_by_id(inquiry_id)
        if not inquiry:
            raise ApiError(
                status_code=404,
                code="INQUIRY_NOT_FOUND",
                message=f"Inquiry '{inquiry_id}' was not found.",
            )
        self._check_version(inquiry.version, payload.version)

        mutated = False
        if payload.status is not None and payload.status != inquiry.status:
            old_status = inquiry.status
            inquiry.status = payload.status
            self.repository.add_audit(
                AuditEvent(
                    actor_staff_id=actor_staff_id,
                    action="inquiry.status_updated",
                    entity_type="inquiry",
                    entity_id=inquiry.id,
                    request_id=request_id,
                    change_summary={
                        "old_status": str(old_status),
                        "new_status": str(payload.status),
                    },
                )
            )
            mutated = True

        target_assigned_id = None if payload.clear_assigned_staff else payload.assigned_staff_id
        should_update_assign = payload.clear_assigned_staff or payload.assigned_staff_id is not None

        if should_update_assign and target_assigned_id != inquiry.assigned_staff_id:
            if target_assigned_id is not None:
                staff_user = await self.repository.get_staff_user_by_id(target_assigned_id)
                if not staff_user:
                    raise ApiError(
                        status_code=404,
                        code="STAFF_USER_NOT_FOUND",
                        message=f"Staff user '{target_assigned_id}' was not found.",
                    )
                if staff_user.status != StaffStatus.ACTIVE:
                    raise ApiError(
                        status_code=422,
                        code="STAFF_USER_NOT_ACTIVE",
                        message="Disabled staff member cannot be assigned to an inquiry.",
                    )
            old_assigned = inquiry.assigned_staff_id
            inquiry.assigned_staff_id = target_assigned_id
            self.repository.add_audit(
                AuditEvent(
                    actor_staff_id=actor_staff_id,
                    action="inquiry.assigned",
                    entity_type="inquiry",
                    entity_id=inquiry.id,
                    request_id=request_id,
                    change_summary={
                        "old_assigned_staff_id": str(old_assigned) if old_assigned else None,
                        "new_assigned_staff_id": str(target_assigned_id)
                        if target_assigned_id
                        else None,
                    },
                )
            )
            mutated = True

        if mutated:
            inquiry.version += 1
            await self.repository.commit()
            await self.repository.refresh(inquiry)

        return self._detail_response(inquiry)

    async def add_internal_note(
        self,
        inquiry_id: UUID,
        content: str,
        actor_staff_id: UUID,
        request_id: str,
    ) -> InquiryInternalNoteResponse:
        inquiry = await self.repository.get_staff_inquiry_by_id(inquiry_id)
        if not inquiry:
            raise ApiError(
                status_code=404,
                code="INQUIRY_NOT_FOUND",
                message=f"Inquiry '{inquiry_id}' was not found.",
            )

        trimmed = content.strip()
        if not trimmed:
            raise ApiError(
                status_code=422,
                code="INVALID_NOTE_CONTENT",
                message="Internal note content cannot be blank.",
            )

        now = datetime.now(UTC)
        note = InquiryInternalNote(
            id=uuid4(),
            inquiry_id=inquiry.id,
            author_staff_id=actor_staff_id,
            content=trimmed,
            created_at=now,
            updated_at=now,
        )
        self.repository.add(note)
        self.repository.add_audit(
            AuditEvent(
                actor_staff_id=actor_staff_id,
                action="inquiry.internal_note_added",
                entity_type="inquiry",
                entity_id=inquiry.id,
                request_id=request_id,
                change_summary={"note_id": str(note.id)},
            )
        )
        await self.repository.commit()
        await self.repository.refresh(note)

        author = await self.repository.get_staff_user_by_id(actor_staff_id)
        return InquiryInternalNoteResponse(
            id=note.id or uuid4(),
            inquiry_id=note.inquiry_id,
            author_staff_id=note.author_staff_id,
            author_email=author.email if author else "",
            content=note.content,
            created_at=note.created_at or now,
            updated_at=note.updated_at or now,
        )

    async def list_assignable_staff(self) -> list[StaffSummaryResponse]:
        users = await self.repository.list_active_staff_users()
        return [
            StaffSummaryResponse(
                id=u.id,
                email=u.email,
                role=u.role,
                status=u.status,
            )
            for u in users
        ]
