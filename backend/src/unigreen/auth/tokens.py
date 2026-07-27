from __future__ import annotations

import hashlib
import hmac
import secrets


def create_opaque_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def tokens_match(token: str, expected_hash: str) -> bool:
    return hmac.compare_digest(hash_token(token), expected_hash)


def hash_client_ip(ip_address: str | None) -> str | None:
    return hash_token(ip_address) if ip_address else None
