"""
Test setup: every test run uses a throw-away SQLite file, never your real database.
Run from the backend folder:   pip install pytest httpx   then   pytest -q
"""
import os
import tempfile

_tmp = tempfile.mkdtemp()
os.environ["LIFEFLOW_DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["LIFEFLOW_ADMIN_EMAIL"] = "admin@test.com"
os.environ["LIFEFLOW_ADMIN_PASSWORD"] = "Admin@12345"

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.utils.security import hash_password


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def login(client, role, email, password):
    r = client.post(f"/auth/login/{role}", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture()
def admin_headers(client):
    return login(client, "admin", "admin@test.com", "Admin@12345")


def make_receiver(db, n):
    from app.models.receiver import Receiver
    r = Receiver(full_name=f"Test Patient {n}", email=f"patient{n}@test.com", hashed_password=hash_password("Pass@1234"),
                 phone_number=f"0300000{n:04d}", cnic_number=f"3520000000{n:03d}", address="Street 1",
                 latitude=24.86, longitude=67.0, city="Karachi")
    db.add(r); db.commit(); db.refresh(r)
    return r


def make_donor(db, n, blood="O+"):
    from app.models.donor import Donor
    d = Donor(full_name=f"Test Donor {n}", email=f"donor{n}@test.com", hashed_password=hash_password("Pass@1234"),
              blood_type=blood, phone_number=f"0311000{n:04d}", cnic_number=f"3540000000{n:03d}",
              latitude=24.87, longitude=67.01, city="Karachi", is_eligible=True)
    db.add(d); db.commit(); db.refresh(d)
    return d
