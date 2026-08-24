from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from unittest.mock import MagicMock, patch
from uuid import uuid4

from unigreen.config import Settings
from unigreen.domain.enums import InquiryStatus, Locale
from unigreen.inquiries.mailer import send_inquiry_email
from unigreen.inquiries.schemas import PublicInquiryLineResponse, PublicInquiryResponse


def inquiry() -> PublicInquiryResponse:
    return PublicInquiryResponse(
        id=uuid4(),
        reference="UG-INQ-2026-000001",
        status=InquiryStatus.NEW,
        contact_name="Test Buyer",
        email="buyer@example.com",
        phone=None,
        company_name="Buyer Co",
        tax_code=None,
        address=None,
        destination=None,
        notes="Please quote promptly.",
        oem_requirements=None,
        locale=Locale.EN,
        created_at=datetime.now(UTC),
        lines=[
            PublicInquiryLineResponse(
                id=uuid4(),
                product_id=uuid4(),
                product_sku="UG-TP-01",
                product_name="Bathroom tissue",
                pack_option="12 rolls",
                quantity=Decimal("50"),
                unit="cartons",
                requirements=None,
                sort_order=0,
            )
        ],
    )


def test_mailer_sends_configured_notification_with_pack_option() -> None:
    smtp = MagicMock()
    smtp.__enter__.return_value = smtp
    settings = Settings(
        smtp_host="smtp.example.com",
        smtp_port=587,
        smtp_username="sender@example.com",
        smtp_password="app-password",
        smtp_from_email="sales@example.com",
        quotation_recipient_email="dohunganh5002@gmail.com",
    )

    with patch("unigreen.inquiries.mailer.smtplib.SMTP", return_value=smtp):
        send_inquiry_email(inquiry(), settings)

    smtp.starttls.assert_called_once_with()
    smtp.login.assert_called_once_with("sender@example.com", "app-password")
    message = smtp.send_message.call_args.args[0]
    assert message["To"] == "dohunganh5002@gmail.com"
    assert message["Reply-To"] == "buyer@example.com"
    assert "pack: 12 rolls" in message.get_content()


def test_mailer_is_a_noop_without_smtp_host() -> None:
    with patch("unigreen.inquiries.mailer.smtplib.SMTP") as smtp:
        send_inquiry_email(inquiry(), Settings(smtp_host=""))
    smtp.assert_not_called()
