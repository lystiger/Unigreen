from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from unigreen.config import Settings
from unigreen.inquiries.schemas import PublicInquiryResponse

logger = logging.getLogger(__name__)


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
        pack = f" — pack: {line.pack_option}" if line.pack_option else ""
        requirement = f" — {line.requirements}" if line.requirements else ""
        lines.append(
            f"- {line.product_sku} / {line.product_name}: "
            f"{line.quantity} {line.unit}{pack}{requirement}"
        )
    if inquiry.notes:
        lines.extend(["", f"Notes: {inquiry.notes}"])

    message = EmailMessage()
    message["Subject"] = f"Uni-Green quotation request {inquiry.reference}"
    message["From"] = settings.smtp_from_email or settings.smtp_username
    message["To"] = settings.quotation_recipient_email
    message["Reply-To"] = inquiry.email
    message.set_content("\n".join(lines))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
        if settings.smtp_use_tls:
            smtp.starttls()
        if settings.smtp_username:
            smtp.login(settings.smtp_username, settings.smtp_password)
        smtp.send_message(message)
