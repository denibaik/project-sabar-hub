import os
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite:///./data/sqlite/test_sabar_hub.db"

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_register_heartbeat_and_list_bots():
    username = "TestBot_API_001"
    registration = client.post(
        "/api/v1/bots",
        headers={"X-Registration-Key": "dev-registration-key"},
        json={"name": "Test Bot", "username": username, "game": "Grow a Garden"},
    )
    assert registration.status_code in (201, 409)
    if registration.status_code == 409:
        return
    token = registration.json()["token"]
    heartbeat = client.post(
        "/api/v1/bots/heartbeat",
        headers={"Authorization": f"Bearer {token}"},
        json={"server": "SG-TEST", "ping_ms": 35},
    )
    assert heartbeat.status_code == 200
    assert heartbeat.json()["status"] == "online"
    listing = client.get("/api/v1/bots", headers={"X-Admin-Key": "dev-admin-key"})
    assert listing.status_code == 200
    assert listing.json()["total"] >= 1
