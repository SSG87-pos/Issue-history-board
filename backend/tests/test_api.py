import os
import tempfile
import unittest

os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.mkdtemp(prefix='issueboard-api-test-')}/test.db"
os.environ["SECRET_KEY"] = "test-secret"
os.environ["ADMIN_USERNAME"] = "admin"
os.environ["ADMIN_PASSWORD"] = "admin-password"
os.environ["ADMIN_DISPLAY_NAME"] = "관리자"

from fastapi.testclient import TestClient

from backend.app.main import app


class ApiTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)

    def login(self, username="admin", password="admin-password"):
        response = self.client.post("/api/auth/login", json={"username": username, "password": password})
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["accessToken"]

    def auth_headers(self, token):
        return {"Authorization": f"Bearer {token}"}

    def test_admin_can_login_manage_users_and_update_board(self):
        admin_token = self.login()

        created = self.client.post(
            "/api/admin/users",
            headers=self.auth_headers(admin_token),
            json={
                "username": "editor",
                "password": "editor-password",
                "displayName": "편집자",
                "role": "editor",
                "isActive": True,
            },
        )
        self.assertEqual(created.status_code, 201, created.text)
        self.assertEqual(created.json()["role"], "editor")

        editor_token = self.login("editor", "editor-password")
        board_data = {
            "categories": [{"id": "cat-1", "label": "강종/제품", "description": "테스트", "order": 1}],
            "subtopics": [{"id": "sub-1", "categoryId": "cat-1", "label": "STS", "order": 1}],
            "issueGroups": [],
            "detailIssues": [],
            "historyEntries": [],
        }
        put_response = self.client.put("/api/board", headers=self.auth_headers(editor_token), json=board_data)
        self.assertEqual(put_response.status_code, 204, put_response.text)

        get_response = self.client.get("/api/board", headers=self.auth_headers(editor_token))
        self.assertEqual(get_response.status_code, 200, get_response.text)
        self.assertEqual(get_response.json()["categories"][0]["label"], "강종/제품")

        updated = self.client.patch(
            f"/api/admin/users/{created.json()['id']}",
            headers=self.auth_headers(admin_token),
            json={"role": "viewer", "isActive": False, "password": "viewer-password"},
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertEqual(updated.json()["role"], "viewer")
        self.assertFalse(updated.json()["isActive"])

        inactive_login = self.client.post("/api/auth/login", json={"username": "editor", "password": "viewer-password"})
        self.assertEqual(inactive_login.status_code, 401)

    def test_viewer_cannot_write_board_or_manage_users(self):
        admin_token = self.login()
        created = self.client.post(
            "/api/admin/users",
            headers=self.auth_headers(admin_token),
            json={
                "username": "viewer",
                "password": "viewer-password",
                "displayName": "조회자",
                "role": "viewer",
                "isActive": True,
            },
        )
        self.assertEqual(created.status_code, 201, created.text)

        viewer_token = self.login("viewer", "viewer-password")
        board_write = self.client.put(
            "/api/board",
            headers=self.auth_headers(viewer_token),
            json={
                "categories": [],
                "subtopics": [],
                "issueGroups": [],
                "detailIssues": [],
                "historyEntries": [],
            },
        )
        self.assertEqual(board_write.status_code, 403)

        users_response = self.client.get("/api/admin/users", headers=self.auth_headers(viewer_token))
        self.assertEqual(users_response.status_code, 403)

    def test_access_request_can_be_submitted_and_reviewed_by_admin(self):
        request_response = self.client.post(
            "/api/access-requests",
            json={
                "requestedUsername": "researcher",
                "displayName": "신청자",
                "department": "연구기획팀",
                "email": "researcher@example.com",
                "password": "researcher-password",
                "reason": "이슈 이력 조회와 보고서 작성",
            },
        )
        self.assertEqual(request_response.status_code, 201, request_response.text)
        self.assertEqual(request_response.json()["status"], "pending")

        admin_token = self.login()
        list_response = self.client.get("/api/admin/access-requests", headers=self.auth_headers(admin_token))
        self.assertEqual(list_response.status_code, 200, list_response.text)
        self.assertEqual(list_response.json()[0]["requestedUsername"], "researcher")

        update_response = self.client.patch(
            f"/api/admin/access-requests/{request_response.json()['id']}",
            headers=self.auth_headers(admin_token),
            json={"status": "approved"},
        )
        self.assertEqual(update_response.status_code, 200, update_response.text)
        self.assertEqual(update_response.json()["status"], "approved")
        approved_login = self.client.post(
            "/api/auth/login",
            json={"username": "researcher", "password": "researcher-password"},
        )
        self.assertEqual(approved_login.status_code, 200, approved_login.text)
        self.assertEqual(approved_login.json()["user"]["role"], "viewer")

    def test_last_active_admin_cannot_be_deactivated_or_demoted(self):
        admin_token = self.login()
        users_response = self.client.get("/api/admin/users", headers=self.auth_headers(admin_token))
        self.assertEqual(users_response.status_code, 200, users_response.text)
        admin_user = next(user for user in users_response.json() if user["username"] == "admin")

        deactivate_response = self.client.patch(
            f"/api/admin/users/{admin_user['id']}",
            headers=self.auth_headers(admin_token),
            json={"isActive": False},
        )
        self.assertEqual(deactivate_response.status_code, 400)

        demote_response = self.client.patch(
            f"/api/admin/users/{admin_user['id']}",
            headers=self.auth_headers(admin_token),
            json={"role": "viewer"},
        )
        self.assertEqual(demote_response.status_code, 400)

        admin_login = self.client.post("/api/auth/login", json={"username": "admin", "password": "admin-password"})
        self.assertEqual(admin_login.status_code, 200)


if __name__ == "__main__":
    unittest.main()
