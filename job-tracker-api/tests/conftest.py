import os
import sys
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure job-tracker-api directory is in python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set test environment variables before importing app modules
os.environ["SECRET_KEY"] = "test-secret-key-for-pytest-suite-12345"
os.environ["ALGORITHM"] = "HS256"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "60"

from database import Base, get_db
from main import app, limiter

# In-memory SQLite engine with StaticPool for test thread safety
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(autouse=True)
def setup_test_database():
    """Create fresh database tables before each test and drop them after."""
    Base.metadata.create_all(bind=test_engine)
    # Reset slowapi rate limiter memory state between test runs
    limiter.reset()
    yield
    Base.metadata.drop_all(bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

# Override FastAPI get_db dependency
app.dependency_overrides[get_db] = override_get_db

@pytest.fixture
def db_session():
    """Fixture providing a direct database session for test verification."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def client():
    """Fixture providing an unauthenticated FastAPI TestClient."""
    with TestClient(app) as test_client:
        yield test_client

@pytest.fixture
def auth_client_user1(client):
    """
    Fixture creating and logging in User 1.
    Returns a TestClient with Bearer Authorization header attached.
    """
    email = "user1@example.com"
    password = "password123"

    # Register User 1
    reg_resp = client.post("/auth/register/", json={"email": email, "plain_password": password})
    assert reg_resp.status_code == 200

    # Login User 1
    login_resp = client.post("/auth/login", json={"email": email, "plain_password": password})
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    # Create client with Auth headers
    authenticated_client = TestClient(app, headers={"Authorization": f"Bearer {token}"})
    return authenticated_client

@pytest.fixture
def auth_client_user2(client):
    """
    Fixture creating and logging in User 2 (distinct from User 1).
    Returns a TestClient with Bearer Authorization header attached.
    """
    email = "user2@example.com"
    password = "password123"

    # Register User 2
    reg_resp = client.post("/auth/register/", json={"email": email, "plain_password": password})
    assert reg_resp.status_code == 200

    # Login User 2
    login_resp = client.post("/auth/login", json={"email": email, "plain_password": password})
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    # Create client with Auth headers
    authenticated_client = TestClient(app, headers={"Authorization": f"Bearer {token}"})
    return authenticated_client
