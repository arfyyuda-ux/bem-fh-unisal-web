import pytest

from lib.security import DEFAULT_CORS_ORIGINS, origin_is_allowed, parse_cors_origins, request_origin_is_allowed
from models.content import AdminUserCreate
from routers.auth import LOGIN_ATTEMPTS, PasswordChange, login_attempt_is_limited


@pytest.fixture(autouse=True)
def clear_login_attempts():
    LOGIN_ATTEMPTS.clear()
    yield
    LOGIN_ATTEMPTS.clear()


def test_wildcard_cors_falls_back_to_local_origins():
    assert parse_cors_origins("*") == DEFAULT_CORS_ORIGINS


def test_cors_origins_are_exact_and_validated():
    origins = parse_cors_origins("https://bem.example.id/,http://localhost:3000")
    assert origins == ("https://bem.example.id", "http://localhost:3000")
    assert origin_is_allowed("https://bem.example.id", origins)
    assert not origin_is_allowed("https://bem.example.id.attacker.test", origins)
    with pytest.raises(ValueError):
        parse_cors_origins("https://bem.example.id/path")


def test_same_origin_preview_requests_pass_but_cross_origin_requests_do_not():
    origins = DEFAULT_CORS_ORIGINS
    preview = "https://bem-fh-unisal-website-3000.preview.app.github.dev"
    assert request_origin_is_allowed(preview, "same-origin", origins)
    assert not request_origin_is_allowed(preview, "cross-site", origins)
    assert not request_origin_is_allowed(preview, None, origins)
    assert request_origin_is_allowed("http://localhost:3000", None, origins)


def test_login_rate_limit_is_per_account_even_when_client_ip_changes():
    email = "admin@bemfh.unisal.ac.id"
    assert all(not login_attempt_is_limited(email, f"192.0.2.{i}", i) for i in range(5))
    assert login_attempt_is_limited(email, "198.51.100.20", 5)
    assert not login_attempt_is_limited(email, "198.51.100.20", 65)


def test_admin_passwords_enforce_strength_and_size_bounds():
    with pytest.raises(ValueError):
        PasswordChange(current_password="old", new_password="too-short")
    with pytest.raises(ValueError):
        AdminUserCreate(email="admin@example.id", password="x" * 129)
