import pytest

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
    Guards against a regression where invalid credentials return 200 OK with an error payload.
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
