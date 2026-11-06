import pytest
import uuid
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.session import SessionLocal
from backend.app.database.models import AuthorizedDoctorModel, AuditEventModel

client = TestClient(app)


def test_doctor_login_success():
    payload = {
        "email": "dr.sharma@pharmaguard.med",
        "password": "PhysicianSecret2026!"
    }
    res = client.post("/api/v1/auth/login", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["doctor"]["email"] == "dr.sharma@pharmaguard.med"
    assert data["doctor"]["role"] == "qppv"
    assert data["doctor"]["medical_license_number"] == "MCI-48291"


def test_doctor_login_invalid_password_rejected():
    payload = {
        "email": "dr.sharma@pharmaguard.med",
        "password": "WrongPassword999!"
    }
    res = client.post("/api/v1/auth/login", json=payload)
    assert res.status_code == 401
    assert "Invalid credentials" in res.json()["detail"]


def test_doctor_profile_me_with_token():
    # Login to get token
    login_res = client.post("/api/v1/auth/login", json={
        "email": "dr.patel@pharmaguard.med",
        "password": "PhysicianSecret2026!"
    })
    token = login_res.json()["access_token"]

    # Request /api/v1/auth/me
    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    profile = me_res.json()
    assert profile["full_name"] == "Dr. R. Patel, MBBS, MD"
    assert profile["role"] == "physician"


def test_unauthenticated_request_rejected_with_invalid_token():
    headers = {"Authorization": "Bearer invalid.fake.token"}
    res = client.get("/api/v1/auth/me", headers=headers)
    assert res.status_code == 401


def test_patient_public_registration_does_not_exist():
    # Verify that public patient registration or public signup endpoints do not exist
    res = client.post("/api/v1/patient/register", json={"name": "Public Patient"})
    assert res.status_code in (404, 405)

    res_user = client.post("/api/v1/auth/register", json={"email": "patient@gmail.com"})
    assert res_user.status_code in (404, 405)


def test_admin_can_provision_new_doctor():
    # Login as admin
    admin_login = client.post("/api/v1/auth/login", json={
        "email": "admin@pharmaguard.med",
        "password": "AdminClinical2026!"
    })
    admin_token = admin_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    unique_email = f"dr.test.{uuid.uuid4().hex[:6]}@pharmaguard.med"
    unique_reg = f"MCI-{uuid.uuid4().hex[:5].upper()}"

    provision_payload = {
        "email": unique_email,
        "password": "SecureDoctorPass2026!",
        "full_name": "Dr. Vikas Kumar, MD",
        "medical_license_number": unique_reg,
        "specialty": "Cardiology & Intensive Care",
        "institution": "Fortis Escorts Heart Institute",
        "role": "physician"
    }

    res = client.post("/api/v1/auth/provision-doctor", json=provision_payload, headers=headers)
    assert res.status_code == 200
    doc = res.json()
    assert doc["email"] == unique_email
    assert doc["medical_license_number"] == unique_reg

    # Check newly provisioned doctor can log in
    new_login = client.post("/api/v1/auth/login", json={
        "email": unique_email,
        "password": "SecureDoctorPass2026!"
    })
    assert new_login.status_code == 200
    assert new_login.json()["doctor"]["full_name"] == "Dr. Vikas Kumar, MD"


def test_regular_physician_cannot_provision_doctor_rbac():
    # Login as regular physician
    doc_login = client.post("/api/v1/auth/login", json={
        "email": "dr.patel@pharmaguard.med",
        "password": "PhysicianSecret2026!"
    })
    doc_token = doc_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {doc_token}"}

    res = client.post("/api/v1/auth/provision-doctor", json={
        "email": "unauthorized@test.com",
        "password": "password123",
        "full_name": "Dr. Test",
        "medical_license_number": "MCI-TEST-99",
        "specialty": "General",
        "institution": "Clinic"
    }, headers=headers)
    assert res.status_code == 403  # Forbidden by RBAC


def test_audit_logs_record_events():
    # Login as admin to read audit logs
    admin_login = client.post("/api/v1/auth/login", json={
        "email": "admin@pharmaguard.med",
        "password": "AdminClinical2026!"
    })
    admin_token = admin_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    res = client.get("/api/v1/audit-logs", headers=headers)
    assert res.status_code == 200
    logs = res.json()
    assert isinstance(logs, list)
    assert len(logs) > 0
    event_types = [l["event_type"] for l in logs]
    assert any("LOGIN" in e or "DOCTOR" in e or "CLINICAL" in e for e in event_types)
