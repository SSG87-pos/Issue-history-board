import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Any

PASSWORD_ALGORITHM = "pbkdf2_sha256"
PASSWORD_ITERATIONS = 210_000


def hash_password(password: str) -> str:
  salt = secrets.token_urlsafe(16)
  digest = _password_digest(password, salt, PASSWORD_ITERATIONS)
  return f"{PASSWORD_ALGORITHM}${PASSWORD_ITERATIONS}${salt}${digest}"


def verify_password(password: str, password_hash: str) -> bool:
  try:
    algorithm, iterations_text, salt, expected_digest = password_hash.split("$", 3)
    iterations = int(iterations_text)
  except ValueError:
    return False

  if algorithm != PASSWORD_ALGORITHM:
    return False

  actual_digest = _password_digest(password, salt, iterations)
  return hmac.compare_digest(actual_digest, expected_digest)


def create_access_token(
  payload: dict[str, Any],
  *,
  secret_key: str,
  expires_in_seconds: int,
) -> str:
  token_payload = {
    **payload,
    "exp": int(time.time()) + expires_in_seconds,
  }
  encoded_payload = _base64url_encode(json.dumps(token_payload, separators=(",", ":")).encode("utf-8"))
  signature = _sign(encoded_payload, secret_key)
  return f"{encoded_payload}.{signature}"


def verify_access_token(token: str, *, secret_key: str) -> dict[str, Any]:
  try:
    encoded_payload, signature = token.split(".", 1)
  except ValueError as exc:
    raise ValueError("Invalid token") from exc

  expected_signature = _sign(encoded_payload, secret_key)
  if not hmac.compare_digest(signature, expected_signature):
    raise ValueError("Invalid token")

  payload = json.loads(_base64url_decode(encoded_payload))
  if int(payload.get("exp", 0)) <= int(time.time()):
    raise ValueError("Token expired")
  return payload


def _password_digest(password: str, salt: str, iterations: int) -> str:
  digest = hashlib.pbkdf2_hmac(
    "sha256",
    password.encode("utf-8"),
    salt.encode("utf-8"),
    iterations,
  )
  return base64.b64encode(digest).decode("ascii")


def _sign(encoded_payload: str, secret_key: str) -> str:
  digest = hmac.new(secret_key.encode("utf-8"), encoded_payload.encode("ascii"), hashlib.sha256).digest()
  return _base64url_encode(digest)


def _base64url_encode(data: bytes) -> str:
  return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _base64url_decode(data: str) -> bytes:
  padding = "=" * (-len(data) % 4)
  return base64.urlsafe_b64decode(data + padding)
