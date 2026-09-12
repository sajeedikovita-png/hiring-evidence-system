import assert from "node:assert/strict";
import {
  createCandidatePrivacyRequestRepository,
  listWorkspacePrivacyCandidates,
  type CandidatePrivacyRequestRpcClient
} from "../src/services/candidatePrivacyRequestService";

async function main() {
  const calls: Array<{ name: string; args?: Record<string, unknown> }> = [];
  const client: CandidatePrivacyRequestRpcClient = {
    async rpc(name, args) {
      calls.push({ name, args });
      if (name === "list_candidate_privacy_requests") {
        return {
          data: [{
            id: "request-1", candidate_id: "candidate-1", candidate_name: "Candidate",
            request_type: "access", requester_email: "candidate@example.test",
            request_details: "Please provide my application data.",
            status: "in_review", created_at: "2026-09-11T00:00:00.000Z",
            identity_verified_at: "2026-09-11T01:00:00.000Z"
          }],
          error: null
        };
      }
      return {
        data: {
          id: "request-1", candidate_id: "candidate-1", request_type: "withdrawal",
          status: name === "review_candidate_privacy_request" ? "resolved" : "identity_verification_required",
          created_at: "2026-09-11T00:00:00.000Z"
        },
        error: null
      };
    }
  };
  const repository = createCandidatePrivacyRequestRepository(client);

  const candidateClient = {
    ...client,
    from(table: string) {
      assert.equal(table, "candidates");
      return {
        select(columns: string) {
          assert.equal(columns, "id, name");
          return {
            async order(column: string) {
              assert.equal(column, "name");
              return { data: [{ id: "candidate-1", name: "Candidate" }, { id: "", name: "" }], error: null };
            }
          };
        }
      };
    }
  };
  assert.deepEqual(await listWorkspacePrivacyCandidates(candidateClient), [{ id: "candidate-1", name: "Candidate" }]);

  const created = await repository.create({
    candidateId: "candidate-1",
    requestType: "withdrawal",
    requesterEmail: " Candidate@Example.Test ",
    requestDetails: " Stop future processing. "
  });
  assert.equal(created.status, "identity_verification_required");
  assert.deepEqual(calls.at(-1), {
    name: "create_candidate_privacy_request",
    args: {
      p_candidate_id: "candidate-1",
      p_request_type: "withdrawal",
      p_requester_email: "candidate@example.test",
      p_request_details: "Stop future processing."
    }
  });

  const listed = await repository.list();
  assert.deepEqual(listed[0], {
    id: "request-1", candidateId: "candidate-1", candidateName: "Candidate",
    requestType: "access", requesterEmail: "candidate@example.test",
    requestDetails: "Please provide my application data.", status: "in_review",
    createdAt: "2026-09-11T00:00:00.000Z", identityVerifiedAt: "2026-09-11T01:00:00.000Z",
    resolvedAt: undefined, resolutionNote: undefined
  });

  const reviewed = await repository.review({
    requestId: "request-1", decision: "resolve", reviewNote: "Human review completed."
  });
  assert.equal(reviewed.status, "resolved");
  assert.deepEqual(calls.at(-1), {
    name: "review_candidate_privacy_request",
    args: {
      p_request_id: "request-1",
      p_decision: "resolve",
      p_review_note: "Human review completed.",
      p_identity_verified: false
    }
  });

  await assert.rejects(
    () => repository.create({ candidateId: "candidate-1", requestType: "access", requesterEmail: "invalid" }),
    /valid requester email/
  );
  await assert.rejects(
    () => repository.review({ requestId: "request-1", decision: "verify_identity", reviewNote: "Verified." }),
    /Confirm identity verification/
  );

  console.log("Candidate privacy request service tests passed.");
}

void main().catch((error) => {
  throw error;
});
