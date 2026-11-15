import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone

from app.main import app
from app.database.connection import MongoManager
from app.utils.security import hash_password

# Import seed script logic to guarantee realistic test records
from scripts.seed_demo_data import seed_data

@pytest_asyncio.fixture(scope="session", autouse=True)
async def init_test_db():
    await MongoManager.connect()
    await MongoManager.create_indexes()
    await seed_data()
    yield
    await MongoManager.close()

@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "MongoDB Atlas"

@pytest.mark.asyncio
async def test_user_registration_and_login():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Register Elderly User
        email = f"senior_{int(datetime.now().timestamp())}@test.com"
        reg_payload = {
            "email": email,
            "password": "SecretPassword123!",
            "role": "elderly",
            "first_name": "Kishore",
            "last_name": "Kumar",
            "preferred_language": "en"
        }
        res = await client.post("/api/auth/register", json=reg_payload)
        assert res.status_code == 201
        data = res.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user"]["email"] == email

        # Login
        login_res = await client.post("/api/auth/login", json={
            "email": email,
            "password": "SecretPassword123!"
        })
        assert login_res.status_code == 200
        assert "access_token" in login_res.json()

@pytest.mark.asyncio
async def test_medication_crud_and_confirmation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Register user
        email = f"elderly_med_{int(datetime.now().timestamp())}@test.com"
        reg_res = await client.post("/api/auth/register", json={
            "email": email,
            "password": "Password123!",
            "role": "elderly",
            "first_name": "Mohan",
            "last_name": "Lal"
        })
        token = reg_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create Medication
        med_payload = {
            "medicine_name": "Lisinopril",
            "dosage": "10 mg",
            "frequency": "Once daily",
            "scheduled_times": ["08:00"],
            "start_date": "2026-01-01",
            "instructions": "Take with breakfast",
            "refill_quantity": 30,
            "remaining_quantity": 30
        }
        create_res = await client.post("/api/medications", json=med_payload, headers=headers)
        assert create_res.status_code == 201
        med_data = create_res.json()
        med_id = med_data["id"]
        assert med_data["medicine_name"] == "Lisinopril"

        # List Medications
        list_res = await client.get("/api/medications", headers=headers)
        assert list_res.status_code == 200
        assert len(list_res.json()) >= 1

        # Confirm Intake
        confirm_res = await client.post(
            f"/api/medications/{med_id}/confirm",
            json={"status": "taken", "notes": "Taken with tea"},
            headers=headers
        )
        assert confirm_res.status_code == 200
        assert confirm_res.json()["status"] == "taken"

@pytest.mark.asyncio
async def test_appointment_management():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        email = f"elderly_apt_{int(datetime.now().timestamp())}@test.com"
        reg_res = await client.post("/api/auth/register", json={
            "email": email,
            "password": "Password123!",
            "role": "elderly",
            "first_name": "Sarla",
            "last_name": "Patel"
        })
        token = reg_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create Appointment
        apt_payload = {
            "doctor_name": "Dr. Joshi",
            "specialty": "Cardiology",
            "hospital_clinic": "City Heart Clinic",
            "appointment_date": "2026-12-01",
            "appointment_time": "11:00",
            "reason": "Blood pressure check"
        }
        res = await client.post("/api/appointments", json=apt_payload, headers=headers)
        assert res.status_code == 201
        apt_id = res.json()["id"]

        # Add note
        note_res = await client.post(
            f"/api/appointments/{apt_id}/notes",
            json={"notes": "Doctor advised low-sodium diet.", "action_items": ["Reduce salt intake"]},
            headers=headers
        )
        assert note_res.status_code == 201

@pytest.mark.asyncio
async def test_family_invitation_and_permissions():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Elderly user
        elderly_email = f"elderly_circle_{int(datetime.now().timestamp())}@test.com"
        e_res = await client.post("/api/auth/register", json={
            "email": elderly_email,
            "password": "Password123!",
            "role": "elderly",
            "first_name": "Gopal",
            "last_name": "Desai"
        })
        e_token = e_res.json()["access_token"]
        e_headers = {"Authorization": f"Bearer {e_token}"}

        # Daughter user
        daughter_email = f"daughter_{int(datetime.now().timestamp())}@test.com"
        d_res = await client.post("/api/auth/register", json={
            "email": daughter_email,
            "password": "Password123!",
            "role": "family",
            "first_name": "Ananya",
            "last_name": "Desai"
        })
        d_token = d_res.json()["access_token"]
        d_headers = {"Authorization": f"Bearer {d_token}"}

        # Invite Daughter
        invite_res = await client.post("/api/care-circle/invite", json={
            "email": daughter_email,
            "role": "family",
            "relationship_label": "Daughter"
        }, headers=e_headers)
        assert invite_res.status_code == 201
        invite_code = invite_res.json()["invitation_code"]

        # Accept Invite
        accept_res = await client.post("/api/care-circle/accept-invite", json={
            "invitation_code": invite_code
        }, headers=d_headers)
        assert accept_res.status_code == 200

@pytest.mark.asyncio
async def test_emergency_sos_broadcast():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        email = f"elderly_sos_{int(datetime.now().timestamp())}@test.com"
        reg_res = await client.post("/api/auth/register", json={
            "email": email,
            "password": "Password123!",
            "role": "elderly",
            "first_name": "Shantanu",
            "last_name": "Roy"
        })
        token = reg_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Add Contact
        contact_res = await client.post("/api/emergency/contacts", json={
            "name": "Arun Roy",
            "relationship": "Son",
            "phone_number": "+91 98200 44444",
            "priority_order": 1,
            "is_notified_on_sos": True
        }, headers=headers)
        assert contact_res.status_code == 201

        # Trigger SOS
        sos_res = await client.post("/api/emergency/sos", json={
            "notes": "Test emergency trigger"
        }, headers=headers)
        assert sos_res.status_code == 201
        assert sos_res.json()["status"] == "active"

        # Get Health Card
        card_res = await client.get("/api/emergency/card", headers=headers)
        assert card_res.status_code == 200
        assert "disclaimer" in card_res.json()

@pytest.mark.asyncio
async def test_scheduler_escalation_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post("/api/scheduler/check-reminders")
        assert res.status_code == 200
        assert res.json()["status"] == "success"

@pytest.mark.asyncio
async def test_analytics_and_timeline():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Login single demo user
        login_res = await client.post("/api/auth/login", json={
            "email": "demo@caresight.com",
            "password": "CareSight123!"
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Adherence
        adh_res = await client.get("/api/analytics/adherence?days=7", headers=headers)
        assert adh_res.status_code == 200
        adh_data = adh_res.json()
        assert "overall_adherence_rate" in adh_data
        assert len(adh_data["daily_trends"]) == 7

        # Timeline
        tl_res = await client.get("/api/analytics/timeline?limit=20", headers=headers)
        assert tl_res.status_code == 200
        assert "items" in tl_res.json()
