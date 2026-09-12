from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
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
                requirements="Width: 2 m; 2-ply; White virgin pulp",
                sort_order=0,
            )
        ],
    )


def test_mailer_sends_configured_notification_with_pack_option(tmp_path: Path) -> None:
    smtp = MagicMock()
    smtp.__enter__.return_value = smtp
    image_path = tmp_path / "jumbo-roll.webp"
    image_path.write_bytes(b"fake-webp-image")
    settings = Settings(
        smtp_host="smtp.example.com",
        smtp_port=587,
        smtp_username="sender@example.com",
        smtp_password="app-password",
        smtp_from_email="sales@example.com",
        quotation_recipient_email="dohunganh5002@gmail.com",
        smtp_image_path=image_path,
    )

    with patch("unigreen.inquiries.mailer.smtplib.SMTP", return_value=smtp):
        send_inquiry_email(inquiry(), settings)

    smtp.starttls.assert_called_once_with()
    smtp.login.assert_called_once_with("sender@example.com", "app-password")
    message = smtp.send_message.call_args.args[0]
    assert message["To"] == "dohunganh5002@gmail.com"
    assert message["Reply-To"] == "buyer@example.com"
    assert message["Importance"] == "high"
    assert message["Priority"] == "urgent"
    assert message["X-Priority"] == "1 (Highest)"
    assert message["X-MSMail-Priority"] == "High"
    plain_body = message.get_body("plain").get_content()
    html_body = message.get_body("html").get_content()
    assert "- UG-TP-01 / Bathroom tissue" in plain_body
    assert "  Quantity: 50 cartons" in plain_body
    assert "  Pack: 12 rolls" in plain_body
    assert "    - Width: 2 m" in plain_body
    assert "    - 2-ply" in plain_body
    assert "    - White virgin pulp" in plain_body
    assert "cid:unigreen-product-image" in html_body
    assert "<strong>Specifications:</strong>" in html_body
    assert "<li>Width: 2 m</li>" in html_body
    assert any(part.get_content_type() == "image/webp" for part in message.walk())


def test_mailer_is_a_noop_without_smtp_host() -> None:
    with patch("unigreen.inquiries.mailer.smtplib.SMTP") as smtp:
        send_inquiry_email(inquiry(), Settings(smtp_host=""))
    smtp.assert_not_called()
