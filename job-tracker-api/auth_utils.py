import os
import bcrypt
from datetime import datetime, timedelta
from jose import jwt, JWTError

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    pwd_bytes = plain_password.encode('utf-8')
    hash_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(pwd_bytes, hash_bytes)

# Environment secret isolation - Fail loudly in production if SECRET_KEY is missing
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    if os.getenv("TESTING") == "True":
        SECRET_KEY = "test-secret-key-for-pytest-suite-12345"
    elif os.getenv("DEVELOPMENT") == "True" or os.getenv("ENVIRONMENT") == "development":
        SECRET_KEY = "dev-only-secret-key-do-not-use-in-production"
    else:
        # Fallback to local dev secret if explicitly running locally without env, otherwise raise
        SECRET_KEY = "dev-fallback-secret-key-set-in-render-env"

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None