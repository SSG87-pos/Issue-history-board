import time
import unittest

from backend.app.security import (
    create_access_token,
    hash_password,
    verify_access_token,
    verify_password,
)


class SecurityTest(unittest.TestCase):
    def test_password_hash_round_trip(self):
        password_hash = hash_password("secret-password")

        self.assertNotIn("secret-password", password_hash)
        self.assertTrue(verify_password("secret-password", password_hash))
        self.assertFalse(verify_password("wrong-password", password_hash))

    def test_access_token_round_trip_and_expiry(self):
        token = create_access_token(
            {"sub": "admin", "role": "admin"},
            secret_key="test-secret",
            expires_in_seconds=1,
        )

        payload = verify_access_token(token, secret_key="test-secret")

        self.assertEqual(payload["sub"], "admin")
        self.assertEqual(payload["role"], "admin")

        time.sleep(1.1)
        with self.assertRaises(ValueError):
            verify_access_token(token, secret_key="test-secret")


if __name__ == "__main__":
    unittest.main()
