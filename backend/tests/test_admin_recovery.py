import asyncio
from types import SimpleNamespace

import pytest

import scripts.reset_admin_credentials as recovery
from routers.auth import password_matches


class FakeCollection:
    def __init__(self, documents=None):
        self.documents = documents or []
        self.deleted = []

    async def find_one(self, query):
        return next((doc for doc in self.documents if all(doc.get(key) == value for key, value in query.items())), None)

    async def delete_many(self, query):
        self.deleted.append(query)

    async def update_one(self, query, update):
        document = next((doc for doc in self.documents if all(doc.get(key) == value for key, value in query.items())), None)
        if not document:
            return SimpleNamespace(modified_count=0)
        document.update(update["$set"])
        return SimpleNamespace(modified_count=1)

    async def insert_one(self, document):
        self.documents.append(document)


def test_reset_superadmin_updates_email_password_and_revokes_sessions(monkeypatch):
    admin = {"_id": "admin-1", "email": "old@example.org", "role": "superadmin", "password_hash": "old"}
    admins = FakeCollection([admin])
    sessions = FakeCollection()
    audit = FakeCollection()
    monkeypatch.setattr(recovery, "db", SimpleNamespace(admin_users=admins, admin_sessions=sessions, audit_logs=audit))

    asyncio.run(recovery.reset_superadmin_credentials("old@example.org", "new@example.org", "safe-test-password-123"))

    assert admin["email"] == "new@example.org"
    assert password_matches("safe-test-password-123", admin["password_hash"])
    assert sessions.deleted == [{"email": "old@example.org"}]
    assert audit.documents[0]["action"] == "reset_superadmin_credentials"
    assert "password_hash" not in audit.documents[0]


def test_reset_superadmin_rejects_missing_account_without_mutation(monkeypatch):
    admins = FakeCollection()
    sessions = FakeCollection()
    audit = FakeCollection()
    monkeypatch.setattr(recovery, "db", SimpleNamespace(admin_users=admins, admin_sessions=sessions, audit_logs=audit))

    with pytest.raises(ValueError, match="tidak ditemukan"):
        asyncio.run(recovery.reset_superadmin_credentials("missing@example.org", "new@example.org", "safe-test-password-123"))

    assert sessions.deleted == []
    assert audit.documents == []
