from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

_hasher = PasswordHasher()
_dummy_hash = _hasher.hash("unigreen-dummy-password")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str | None, password: str) -> bool:
    candidate = password_hash or _dummy_hash
    try:
        return _hasher.verify(candidate, password) and password_hash is not None
    except (InvalidHashError, VerificationError, VerifyMismatchError):
        return False
