import time
import uuid
from locust import HttpUser, task, between, events


class PharmacovigilanceUser(HttpUser):
    wait_time = between(0.5, 2.0)

    @task(3)
    def submit_and_poll_critical_case(self):
        """Tests complete lifecycle of Critical Scenario 4.1 from submission to completed routing"""
        idemp_key = f"locust-crit-{uuid.uuid4().hex[:10]}"
        payload = {
            "suspect_drug": "Carbamazepine",
            "product_identifier": "Tegretol 200mg",
            "reaction_description": "The patient's skin started peeling badly a week after starting the drug, and she was admitted to hospital.",
            "patient_age": 34,
            "patient_sex": "female",
            "onset_relative_days": 7,
            "is_hospitalized": True,
            "outcome": "not_recovered",
            "reporter_type": "physician",
            "idempotency_key": idemp_key
        }

        start_time = time.time()

        # Step 1: Submit report
        with self.client.post("/api/v1/reports", json=payload, catch_response=True) as resp:
            if resp.status_code != 202:
                resp.failure(f"Submission failed with status {resp.status_code}: {resp.text}")
                return
            data = resp.json()
            run_id = data.get("run_id")

        # Step 2: Poll status endpoint until completed or escalated
        max_poll_seconds = 20.0
        poll_interval = 0.5
        completed = False

        while time.time() - start_time < max_poll_seconds:
            with self.client.get(f"/api/v1/runs/{run_id}", catch_response=True) as poll_resp:
                if poll_resp.status_code == 200:
                    poll_data = poll_resp.json()
                    status = poll_data.get("status")
                    if status in ["completed", "escalated"]:
                        completed = True
                        break
                    elif status == "failed":
                        poll_resp.failure(f"Run failed: {poll_data.get('error_message')}")
                        return
            time.sleep(poll_interval)

        total_lifecycle_duration = time.time() - start_time

        # Report end-to-end custom event
        if completed:
            events.request.fire(
                request_type="E2E_WORKFLOW",
                name="Complete_Run_Submission_To_Assessment",
                response_time=total_lifecycle_duration * 1000,
                response_length=0,
                exception=None,
                context={}
            )
        else:
            events.request.fire(
                request_type="E2E_WORKFLOW",
                name="Complete_Run_Submission_To_Assessment",
                response_time=total_lifecycle_duration * 1000,
                response_length=0,
                exception=Exception(f"Timed out after {max_poll_seconds}s before reaching completion"),
                context={}
            )

    @task(1)
    def submit_expected_non_serious_case(self):
        """Tests standard expected reaction (dizziness/somnolence)"""
        idemp_key = f"locust-expected-{uuid.uuid4().hex[:10]}"
        payload = {
            "suspect_drug": "Carbamazepine",
            "reaction_description": "Patient experienced afternoon drowsiness and mild dizziness.",
            "patient_age": 45,
            "patient_sex": "male",
            "onset_relative_days": 3,
            "is_hospitalized": False,
            "idempotency_key": idemp_key
        }

        with self.client.post("/api/v1/reports", json=payload, catch_response=True) as resp:
            if resp.status_code != 202:
                resp.failure(f"Failed submission: {resp.status_code}")

    @task(1)
    def query_dashboard_stats(self):
        """Dashboard overview polling"""
        self.client.get("/api/v1/dashboard/stats")

    @task(1)
    def health_check(self):
        """Liveness / Readiness probe"""
        self.client.get("/api/v1/health")
