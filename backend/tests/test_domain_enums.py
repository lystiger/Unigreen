from unigreen.domain.enums import (
    InquiryStatus,
    Locale,
    PublicationStatus,
    PurchaseOrderReviewStatus,
    QuotationStatus,
    SalesOrderStatus,
    StaffRole,
    StaffStatus,
)


def test_domain_enums_publish_stable_api_values() -> None:
    assert list(Locale) == [Locale.VI, Locale.EN]
    assert {status.value for status in PublicationStatus} == {
        "draft",
        "published",
        "unpublished",
    }
    assert InquiryStatus.DUPLICATE.value == "duplicate"
    assert QuotationStatus.CHANGE_REQUESTED.value == "change_requested"
    assert PurchaseOrderReviewStatus.DISCREPANCY.value == "discrepancy"
    assert SalesOrderStatus.DISPATCHED.value == "dispatched"
    assert StaffRole.CONTENT_EDITOR.value == "content_editor"
    assert list(StaffStatus) == [StaffStatus.ACTIVE, StaffStatus.DISABLED]
