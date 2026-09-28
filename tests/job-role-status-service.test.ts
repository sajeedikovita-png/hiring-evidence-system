import assert from "node:assert/strict";
import { createJobWithCriteria, updateJobRoleStatus } from "../src/services/jobService";
async function main() {
 const calls: unknown[]=[];
 const client={rpc:async(name:string,args:unknown)=>{calls.push({name,args});return {data:{jobId:"job1",status:"closed"},error:null};}} as unknown as Parameters<typeof updateJobRoleStatus>[0];
 assert.deepEqual(await updateJobRoleStatus(client,{jobId:"job1",status:"closed"}),{jobId:"job1",status:"closed"});
 assert.deepEqual(calls,[{name:"update_job_role_status",args:{p_job_id:"job1",p_status:"closed"}}]);
 for(const [message,pattern] of [["PILOT_JOB_LIMIT",/active-role limit/],["PILOT_EXPIRED",/Renew workspace/],["JOB_MANAGEMENT_ACCESS_REQUIRED",/administrator or recruiter/]] as const) {
  const invalid={rpc:async()=>({data:null,error:{message}})} as unknown as Parameters<typeof updateJobRoleStatus>[0];
  await assert.rejects(()=>updateJobRoleStatus(invalid,{jobId:"job1",status:"open"}),pattern);
 }
 const createInput={title:"Operations Analyst",criteria:[{label:"SQL reporting",priority:"required" as const}]};
 for(const [message,pattern] of [["PILOT_JOB_LIMIT",/Pilot access/],["PILOT_EXPIRED",/Renew workspace/],["JOB_MANAGEMENT_ACCESS_REQUIRED",/administrator or recruiter/]] as const) {
  const invalid={rpc:async()=>({data:null,error:{message}})} as unknown as Parameters<typeof createJobWithCriteria>[0];
  await assert.rejects(()=>createJobWithCriteria(invalid,createInput),pattern);
 }
 console.log("Job role status service tests passed.");
}
void main();
