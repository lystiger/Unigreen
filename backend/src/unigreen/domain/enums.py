from enum import StrEnum


class Locale(StrEnum):
    VI = "vi"
    EN = "en"


class PublicationStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"
    UNPUBLISHED = "unpublished"


class InquiryStatus(StrEnum):
    NEW = "new"
    QUALIFIED = "qualified"
    QUOTED = "quoted"
    WON = "won"
    LOST = "lost"
    SPAM = "spam"
    DUPLICATE = "duplicate"


class QuotationStatus(StrEnum):
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    SENT = "sent"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    CHANGE_REQUESTED = "change_requested"
    SUPERSEDED = "superseded"
    EXPIRED = "expired"


class PurchaseOrderReviewStatus(StrEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DISCREPANCY = "discrepancy"
    REJECTED = "rejected"


class SalesOrderStatus(StrEnum):
    DRAFT = "draft"
    CONFIRMED = "confirmed"
    PROCESSING = "processing"
    READY = "ready"
    DISPATCHED = "dispatched"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class StaffRole(StrEnum):
    SALES_STAFF = "sales_staff"
    SALES_MANAGER = "sales_manager"
    CONTENT_EDITOR = "content_editor"
    ADMINISTRATOR = "administrator"


class StaffStatus(StrEnum):
    ACTIVE = "active"
    DISABLED = "disabled"
