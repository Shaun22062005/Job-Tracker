import pytest

def test_application_crud_lifecycle(auth_client_user1):
    """
    Test 6: Full CRUD Lifecycle for an authenticated user:
    Create -> Read -> Update -> Delete.
    """
    # 1. Create Application
    create_payload = {
        "company_name": "Google",
        "role": "Senior Frontend Engineer",
        "status": "Applied",
        "applied_date": "2026-08-01",
        "interview_date": "2026-08-15",
        "job_url": "https://careers.google.com/jobs/123",
        "notes": "Referred by Shaun"
    }

    create_res = auth_client_user1.post("/applications", json=create_payload)
    assert create_res.status_code == 200
    created_data = create_res.json()
    assert "id" in created_data
    app_id = created_data["id"]
    assert created_data["company_name"] == "Google"
    assert created_data["role"] == "Senior Frontend Engineer"
    assert created_data["status"] == "Applied"
    assert created_data["is_starred"] is False

    # 2. Read Applications (List)
    list_res = auth_client_user1.get("/applications")
    assert list_res.status_code == 200
    apps_list = list_res.json()
    assert len(apps_list) == 1
    assert apps_list[0]["id"] == app_id

    # 3. Update Application
    update_payload = {
        "company_name": "Google",
        "role": "Staff Frontend Engineer",
        "status": "Interviewing",
        "applied_date": "2026-08-01",
        "interview_date": "2026-08-20",
        "job_url": "https://careers.google.com/jobs/123",
        "notes": "Interview scheduled"
    }

    update_res = auth_client_user1.put(f"/applications/{app_id}", json=update_payload)
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["role"] == "Staff Frontend Engineer"
    assert updated_data["status"] == "Interviewing"

    # 4. Delete Application
    delete_res = auth_client_user1.delete(f"/applications/{app_id}")
    assert delete_res.status_code == 200
    assert delete_res.json()["message"] == "Application deleted successfully"

    # 5. Confirm Deletion in List
    final_list_res = auth_client_user1.get("/applications")
    assert final_list_res.status_code == 200
    assert len(final_list_res.json()) == 0

def test_ownership_put_enforcement(auth_client_user1, auth_client_user2):
    """
    Test 7: User 2 attempting PUT on User 1's application returns 403 Forbidden.
    User 1 attempting PUT succeeds with 200 OK.
    """
    # User 1 creates an application
    create_res = auth_client_user1.post("/applications", json={
        "company_name": "Acme Corp",
        "role": "Backend Engineer",
        "status": "Applied",
        "applied_date": "2026-08-01"
    })
    app_id = create_res.json()["id"]

    update_payload = {
        "company_name": "Acme Corp Hacked",
        "role": "Backend Engineer",
        "status": "Rejected",
        "applied_date": "2026-08-01"
    }

    # User 2 attempts to update User 1's application -> 403 Forbidden
    unauthorized_res = auth_client_user2.put(f"/applications/{app_id}", json=update_payload)
    assert unauthorized_res.status_code == 403
    assert unauthorized_res.json()["detail"] == "Not authorized to update this application"

    # User 1 updates their own application -> 200 OK
    authorized_res = auth_client_user1.put(f"/applications/{app_id}", json=update_payload)
    assert authorized_res.status_code == 200
    assert authorized_res.json()["company_name"] == "Acme Corp Hacked"

def test_ownership_patch_star_enforcement(auth_client_user1, auth_client_user2):
    """
    Test 8: User 2 attempting PATCH /star on User 1's application returns 403 Forbidden.
    User 1 attempting PATCH succeeds with 200 OK and toggles is_starred.
    """
    create_res = auth_client_user1.post("/applications", json={
        "company_name": "Stripe",
        "role": "Software Engineer",
        "status": "Applied",
        "applied_date": "2026-08-01"
    })
    app_id = create_res.json()["id"]
    assert create_res.json()["is_starred"] is False

    # User 2 attempts to toggle star -> 403 Forbidden
    unauthorized_res = auth_client_user2.patch(f"/applications/{app_id}/star")
    assert unauthorized_res.status_code == 403
    assert unauthorized_res.json()["detail"] == "Not authorized to update this application"

    # User 1 toggles star -> 200 OK (is_starred becomes True)
    authorized_res = auth_client_user1.patch(f"/applications/{app_id}/star")
    assert authorized_res.status_code == 200
    assert authorized_res.json()["is_starred"] is True

def test_ownership_delete_enforcement(auth_client_user1, auth_client_user2):
    """
    Test 9: User 2 attempting DELETE on User 1's application returns 403 Forbidden.
    User 1 attempting DELETE succeeds with 200 OK.
    """
    create_res = auth_client_user1.post("/applications", json={
        "company_name": "Netflix",
        "role": "Systems Engineer",
        "status": "Offered",
        "applied_date": "2026-08-01"
    })
    app_id = create_res.json()["id"]

    # User 2 attempts to delete User 1's application -> 403 Forbidden
    unauthorized_res = auth_client_user2.delete(f"/applications/{app_id}")
    assert unauthorized_res.status_code == 403
    assert unauthorized_res.json()["detail"] == "Not authorized to delete this application"

    # User 1 deletes their own application -> 200 OK
    authorized_res = auth_client_user1.delete(f"/applications/{app_id}")
    assert authorized_res.status_code == 200
    assert authorized_res.json()["message"] == "Application deleted successfully"

def test_non_existent_application_404(auth_client_user1):
    """
    Test 10: Operating on non-existent application ID returns 404 Not Found.
    """
    non_existent_id = 999999
    update_payload = {
        "company_name": "Ghost Inc",
        "role": "Ghost Engineer",
        "status": "Applied",
        "applied_date": "2026-08-01"
    }

    # PUT 404
    put_res = auth_client_user1.put(f"/applications/{non_existent_id}", json=update_payload)
    assert put_res.status_code == 404
    assert put_res.json()["detail"] == "Application not found"

    # PATCH /star 404
    patch_res = auth_client_user1.patch(f"/applications/{non_existent_id}/star")
    assert patch_res.status_code == 404
    assert patch_res.json()["detail"] == "Application not found"

    # DELETE 404
    delete_res = auth_client_user1.delete(f"/applications/{non_existent_id}")
    assert delete_res.status_code == 404
    assert delete_res.json()["detail"] == "Application not found"
