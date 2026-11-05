from tests.conftest import login, make_receiver, make_donor

REQUEST = {"blood_type_needed": "O+", "units_needed": 2, "patient_name": "Ali Khan",
           "urgency_type": "emergency", "latitude": 24.86, "longitude": 67.0}


def test_app_is_alive(client):
    assert client.get("/").status_code in (200, 404)


def test_login_rejects_wrong_password(client, db):
    make_receiver(db, 1)
    r = client.post("/auth/login/receiver", json={"email": "patient1@test.com", "password": "wrong"})
    assert r.status_code in (400, 401)


def test_receiver_request_then_cancel(client, db):
    make_receiver(db, 2)
    h = login(client, "receiver", "patient2@test.com", "Pass@1234")
    r = client.post("/requests/receiver", json=REQUEST, headers=h)
    assert r.status_code == 201, r.text
    rid = r.json()["id"]
    c = client.post(f"/requests/{rid}/cancel", headers=h)
    assert c.status_code == 200, c.text
    got = client.get(f"/requests/{rid}", headers=h).json()
    assert got["status"] == "cancelled" and got["display_status"] == "Cancelled"
    # cancelling twice is refused
    assert client.post(f"/requests/{rid}/cancel", headers=h).status_code == 400


def test_other_person_cannot_cancel(client, db):
    make_receiver(db, 3); make_receiver(db, 4)
    h3 = login(client, "receiver", "patient3@test.com", "Pass@1234")
    h4 = login(client, "receiver", "patient4@test.com", "Pass@1234")
    rid = client.post("/requests/receiver", json=REQUEST, headers=h3).json()["id"]
    assert client.post(f"/requests/{rid}/cancel", headers=h4).status_code == 404


def test_admin_removes_user_and_login_stops(client, db, admin_headers):
    r = make_receiver(db, 5)
    resp = client.delete(f"/admin/users/receiver/{r.id}", headers=admin_headers)
    assert resp.status_code == 200, resp.text
    bad = client.post("/auth/login/receiver", json={"email": "patient5@test.com", "password": "Pass@1234"})
    assert bad.status_code in (400, 401)


def test_donor_cannot_remove_users(client, db):
    d = make_donor(db, 6)
    h = login(client, "donor", "donor6@test.com", "Pass@1234")
    assert client.delete("/admin/users/donor/1", headers=h).status_code in (401, 403)


def test_shortage_analytics(client, db, admin_headers):
    make_receiver(db, 7)
    h = login(client, "receiver", "patient7@test.com", "Pass@1234")
    client.post("/requests/receiver", json=REQUEST, headers=h)
    data = client.get("/admin/analytics/shortages", headers=admin_headers).json()
    assert data["total_bags_short"] >= 2
    assert any(c["city"] == "Karachi" for c in data["cities"])


def test_live_location_roundtrip(client, db):
    from app.models.donation import Donation
    make_receiver(db, 8); donor = make_donor(db, 8)
    hr = login(client, "receiver", "patient8@test.com", "Pass@1234")
    hd = login(client, "donor", "donor8@test.com", "Pass@1234")
    rid = client.post("/requests/receiver", json=REQUEST, headers=hr).json()["id"]
    db.add(Donation(donor_id=donor.id, request_id=rid, units_donated=1, status="accepted")); db.commit()
    assert client.post(f"/tracking/{rid}/live-location", json={"latitude": 24.9, "longitude": 67.05}, headers=hd).status_code == 200
    seen = client.get(f"/tracking/{rid}/live-location", headers=hr).json()
    assert seen["donors"] and seen["donors"][0]["latitude"] == 24.9
