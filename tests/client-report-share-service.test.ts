import assert from "node:assert/strict";
import { clientShareErrorMessage, createClientReportShare, listClientReportShares, readClientReportShare, revokeClientReportShare } from "../src/services/clientReportShareService";
async function main() {
 const token="a".repeat(64); const calls: Array<{name:string;args?:Record<string,unknown>}> = [];
 const summary={reportReference:"HER-1",companyName:"Agency",candidateName:"Amanda",roleTitle:"Engineer",preparedAt:"2026-09-19",reportGeneratedAt:"2026-09-19",status:"Human review required",criteria:[{requirement:"React",evidence:"Built UI",source:"Resume",sourceReference:"Page1",status:"Evidence found",verification:"Ask about project"}],missingEvidence:[],verificationNeeded:[],questions:[],recruiter_notes:"PRIVATE",email:"private@example.invalid"};
 const client={rpc:async(name:string,args?:Record<string,unknown>)=>{calls.push({name,args}); return {data:name==="create_client_report_share"?{id:"share1",token,expiresAt:"2026-09-26"}:name==="read_client_report_share"?{summary,expiresAt:"2026-09-26"}:name==="list_client_report_shares"?[{id:"share1",createdAt:"2026-09-19",expiresAt:"2026-09-26",revokedAt:null,includeDecision:false}]:null,error:null};}};
 assert.deepEqual(await createClientReportShare({reportId:"report1",expiresInDays:7,includeDecision:false},client),{id:"share1",token,expiresAt:"2026-09-26"});
 assert.deepEqual(calls.at(-1)?.args,{p_report_id:"report1",p_expires_in_days:7,p_include_decision:false});
 const received=await readClientReportShare(token,client);
 assert.equal(received?.summary.candidateName,"Amanda");
 assert.equal("recruiter_notes" in (received?.summary??{}),false);
 assert.equal("email" in (received?.summary??{}),false);
 const count=calls.length;
 assert.equal(await readClientReportShare("bad",client),null);
 assert.equal(calls.length,count);
 assert.equal((await listClientReportShares("report1",client)).length,1);
 await revokeClientReportShare("share1",client);
 assert.deepEqual(calls.at(-1),{name:"revoke_client_report_share",args:{p_share_id:"share1"}});
 await assert.rejects(()=>createClientReportShare({reportId:"report1",expiresInDays:31,includeDecision:false},client),/expiry/);
 assert.equal(await readClientReportShare(token,{rpc:async()=>({data:null,error:null})}),null);
 assert.match(clientShareErrorMessage(new Error("CANDIDATE_CONSENT_REQUIRED")),/consent/);
 assert.match(clientShareErrorMessage(new Error("CANDIDATE_SHARING_AUTHORITY_REQUIRED")),/sharing authority/);
 assert.match(clientShareErrorMessage(new Error("ACTIVE_SHARE_LIMIT")),/five active links/);
 assert.match(clientShareErrorMessage(new Error("unrecognised database detail")),/could not be created/);
 console.log("Client report share service tests passed.");
}
void main();
