from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage
from html import escape
from mimetypes import guess_type
from typing import cast

from unigreen.config import Settings
from unigreen.inquiries.schemas import PublicInquiryResponse

logger = logging.getLogger(__name__)


def _specification_items(requirements: str | None) -> list[str]:
    if not requirements:
        return []
    return [item.strip() for item in requirements.split(";") if item.strip()]


def _html_body(inquiry: PublicInquiryResponse, image_cid: str | None = None) -> str:
    lines = [
        "<html><body>",
        f"<p><strong>Reference:</strong> {escape(inquiry.reference)}</p>",
        f"<p><strong>Contact:</strong> {escape(inquiry.contact_name)}<br>",
        f"<strong>Company:</strong> {escape(inquiry.company_name or '-')}<br>",
        f"<strong>Email:</strong> {escape(inquiry.email)}<br>",
        f"<strong>Phone:</strong> {escape(inquiry.phone or '-')}</p>",
        "<p><strong>Requested products:</strong></p><ul>",
    ]
    for line in inquiry.lines:
        lines.extend(
            [
                "<li>",
                f"<strong>{escape(line.product_sku)} / {escape(line.product_name)}</strong><br>",
                f"<strong>Quantity:</strong> {escape(str(line.quantity))} {escape(line.unit)}<br>",
            ]
        )
        if line.pack_option:
            lines.append(f"<strong>Pack:</strong> {escape(line.pack_option)}<br>")
        specifications = _specification_items(line.requirements)
        if specifications:
            lines.append("<strong>Specifications:</strong><ul>")
            lines.extend(f"<li>{escape(specification)}</li>" for specification in specifications)
            lines.append("</ul>")
        lines.append("</li>")
    lines.append("</ul>")
    if inquiry.notes:
        lines.append(f"<p><strong>Notes:</strong> {escape(inquiry.notes)}</p>")
    if image_cid:
        lines.extend(
            [
                "<p><strong>Product reference image:</strong></p>",
                f'<p><img src="cid:{image_cid}" alt="Jumbo roll tissue product" '
                'style="max-width:600px;height:auto"></p>',
            ]
        )
    lines.append("</body></html>")
    return "".join(lines)


def send_inquiry_email(inquiry: PublicInquiryResponse, settings: Settings) -> None:
    """Send a plain-text notification when SMTP is configured.

    Keeping SMTP optional makes local development usable without credentials;
    production/testing only needs the SMTP_* values in .env.
    """
    if not settings.smtp_host:
        logger.warning("Quotation %s saved; SMTP_HOST is not configured", inquiry.reference)
        return

    lines = [
        f"Reference: {inquiry.reference}",
        f"Locale: {inquiry.locale}",
        f"Contact: {inquiry.contact_name}",
        f"Company: {inquiry.company_name or '-'}",
        f"Email: {inquiry.email}",
        f"Phone: {inquiry.phone or '-'}",
        "",
        "Requested products:",
    ]
    for line in inquiry.lines:
        lines.append(f"- {line.product_sku} / {line.product_name}")
        lines.append(f"  Quantity: {line.quantity} {line.unit}")
        if line.pack_option:
            lines.append(f"  Pack: {line.pack_option}")
        specifications = _specification_items(line.requirements)
        if specifications:
            lines.append("  Specifications:")
            lines.extend(f"    - {specification}" for specification in specifications)
    if inquiry.notes:
        lines.extend(["", f"Notes: {inquiry.notes}"])

    message = EmailMessage()
    message["Subject"] = f"Uni-Green quotation request {inquiry.reference}"
    message["From"] = settings.smtp_from_email or settings.smtp_username
    message["To"] = settings.quotation_recipient_email
    message["Reply-To"] = inquiry.email
    message["Importance"] = "high"
    message["Priority"] = "urgent"
    message["X-Priority"] = "1 (Highest)"
    message["X-MSMail-Priority"] = "High"
    message.set_content("\n".join(lines))

    image_path = settings.smtp_image_path
    if image_path.is_file():
        image_bytes = image_path.read_bytes()
        mime_type = guess_type(image_path.name)[0] or "application/octet-stream"
        maintype, subtype = mime_type.split("/", 1)
        image_cid = "unigreen-product-image"
        message.add_alternative(_html_body(inquiry, image_cid), subtype="html")
        html_part = cast(EmailMessage, message.get_body(preferencelist=("html",)))
        html_part.add_related(
            image_bytes,
            maintype=maintype,
            subtype=subtype,
            cid=f"<{image_cid}>",
            filename=image_path.name,
        )

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
        if settings.smtp_use_tls:
            smtp.starttls()
        if settings.smtp_username:
            smtp.login(settings.smtp_username, settings.smtp_password)
        smtp.send_message(message)
