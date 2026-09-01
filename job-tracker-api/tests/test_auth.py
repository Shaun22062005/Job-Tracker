import os
import pytest
from datetime import date
from auth_utils import get_secret_key, hash_password, verify_password
from main import run_auth_provider_backfill
import models

def test_auth_required_unauthorized(client):
    """
    Test 1: Unauthenticated request to /applications must return 401 Unauthorized.
    """
    response = client.get("/applications")
    assert response.status_code == 401
    assert response.json()["detail"] in ["Not authenticated", "Invalid or expired token"]

def test_login_success(client):
    """
    Test 2: Valid registration & login credentials return 200 OK and JWT access token.
    """
    email = "validuser@example.com"
    password = "securePassword123!"

    # 1. Register User
    reg_response = client.post("/auth/register/", json={"email": email, "plain_password": password})
    assert reg_response.status_code == 200
    assert reg_response.json()["email"] == email

    # 2. Login User
    login_response = client.post("/auth/login", json={"email": email, "plain_password": password})
    assert login_response.status_code == 200
    data = login_response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert len(data["access_token"]) > 10

def test_login_invalid_credentials(client):
    """
    Test 3: Login with invalid password or non-existent email must return 401 Unauthorized.
    """
    email = "registered@example.com"
    password = "correctPassword123"

    # Register real user
    client.post("/auth/register/", json={"email": email, "plain_password": password})

    # Case A: Wrong Password
    wrong_pass_response = client.post("/auth/login", json={"email": email, "plain_password": "wrongPassword!"})
    assert wrong_pass_response.status_code == 401
    assert wrong_pass_response.json()["detail"] == "Invalid Credentials"

    # Case B: Non-existent Email
    unknown_email_response = client.post("/auth/login", json={"email": "nobody@example.com", "plain_password": password})
    assert unknown_email_response.status_code == 401
    assert unknown_email_response.json()["detail"] == "Invalid Credentials"

def test_duplicate_registration_fails(client):
    """
    Test 4: Attempting to register an email that already exists must return 400 Bad Request.
    """
    email = "existinguser@example.com"
    password = "password123"

    # Initial registration
    first_reg = client.post("/auth/register/", json={"email": email, "plain_password": password})
    assert first_reg.status_code == 200

    # Duplicate registration attempt
    duplicate_reg = client.post("/auth/register/", json={"email": email, "plain_password": password})
    assert duplicate_reg.status_code == 400
    assert duplicate_reg.json()["detail"] == "Email already registered"

def test_login_rate_limiting(client):
    """
    Test 5: Rapid login attempts (6th request within 1 minute) trigger slowapi rate limiting (429).
    """
    email = "ratelimit@example.com"
    password = "password123"

    client.post("/auth/register/", json={"email": email, "plain_password": password})

    # First 5 login attempts should be processed (200 OK)
    for i in range(5):
        res = client.post("/auth/login", json={"email": email, "plain_password": password})
        assert res.status_code == 200

    # 6th login attempt must be rate-limited (429 Too Many Requests)
    rate_limited_res = client.post("/auth/login", json={"email": email, "plain_password": password})
    assert rate_limited_res.status_code == 429

def test_get_secret_key_raises_in_production_when_unset(monkeypatch):
    """
    Test 6: Assert that get_secret_key() raises RuntimeError when running without SECRET_KEY in production.
    """
    monkeypatch.delenv("SECRET_KEY", raising=False)
    monkeypatch.delenv("TESTING", raising=False)
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    monkeypatch.delenv("DEVELOPMENT", raising=False)

    with pytest.raises(RuntimeError) as exc_info:
        get_secret_key()
    assert "CRITICAL: SECRET_KEY environment variable must be set in production" in str(exc_info.value)

def test_google_oauth_account_password_login_rejected(client, db_session):
    """
    Test 7: Attempting password login on an account created via Google OAuth must be rejected with 400.
    """
    oauth_user = models.User(
        email="googler@example.com",
        hashed_password=hash_password("unguessable-random-secret-12345"),
        auth_provider="google",
        created_at=date.today()
    )
    db_session.add(oauth_user)
    db_session.commit()

    res = client.post("/auth/login", json={"email": "googler@example.com", "plain_password": "unguessable-random-secret-12345"})
    assert res.status_code == 400
    assert res.json()["detail"] == "This account was registered using Google. Please sign in with Google."

def test_run_auth_provider_backfill_migrates_legacy_google_accounts(db_session):
    """
    Test 8: run_auth_provider_backfill correctly identifies and neutralizes legacy accounts using old formula.
    """
    legacy_google_email = "legacy_google@example.com"
    old_formula = f"google_oauth2_{legacy_google_email}_secret"
    legacy_user = models.User(
        email=legacy_google_email,
        hashed_password=hash_password(old_formula),
        auth_provider=None,
        created_at=date.today()
    )

    legacy_local_email = "legacy_local@example.com"
    local_user = models.User(
        email=legacy_local_email,
        hashed_password=hash_password("userLocalPassword!"),
        auth_provider=None,
        created_at=date.today()
    )

    db_session.add_all([legacy_user, local_user])
    db_session.commit()

    # Invoke standalone backfill function directly
    run_auth_provider_backfill(db_session)

    db_session.refresh(legacy_user)
    db_session.refresh(local_user)

    # Legacy Google account must be migrated to 'google' and password rotated
    assert legacy_user.auth_provider == "google"
    assert not verify_password(old_formula, legacy_user.hashed_password)

    # Legacy local account must be set to 'local' and keep its password intact
    assert local_user.auth_provider == "local"
    assert verify_password("userLocalPassword!", local_user.hashed_password)
