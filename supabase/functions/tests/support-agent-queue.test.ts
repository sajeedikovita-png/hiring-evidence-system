import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleSupportAgentQueue } from "../support-agent-queue/index.ts";

Deno.test("support agent queue rejects requests without its private token", async () => {
  let calls=0;
  const response=await handleSupportAgentQueue(new Request("https://example.test",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"claim"})}),{
    expectedToken:"private-token",client:{rpc:async()=>{calls+=1;return {data:null,error:null};}}
  });
  assertEquals(response.status,401);
  assertEquals(calls,0);
});

Deno.test("support agent queue claims through the service-only RPC", async () => {
  let rpcName="";
  const response=await handleSupportAgentQueue(new Request("https://example.test",{method:"POST",headers:{"content-type":"application/json","x-support-agent-token":"private-token"},body:JSON.stringify({action:"claim"})}),{
    expectedToken:"private-token",client:{rpc:async(name)=>{rpcName=name;return {data:{job:null},error:null};}}
  });
  assertEquals(response.status,200);
  assertEquals(rpcName,"claim_support_agent_job");
  assertEquals(await response.json(),{job:null});
});

Deno.test("support agent queue passes only the structured report to its update RPC", async () => {
  let input:Record<string,unknown>={}; let rpcName="";
  const response=await handleSupportAgentQueue(new Request("https://example.test",{method:"POST",headers:{"content-type":"application/json","x-support-agent-token":"private-token"},body:JSON.stringify({action:"update",report:{jobId:"one",claimToken:"claim",status:"blocked",riskLevel:"high",classification:"security",blockedReason:"Owner review required"}})}),{
    expectedToken:"private-token",client:{rpc:async(name,next)=>{rpcName=name;input=next;return {data:{status:"blocked"},error:null};}}
  });
  assertEquals(response.status,200);
  assertEquals(rpcName,"update_support_agent_job_v2");
  assertEquals(input.p_claim_token,"claim");
  assertEquals(input.p_status,"blocked");
  assertEquals(input.p_classification,"security");
  assertEquals(input.p_blocked_reason,"Owner review required");
});

Deno.test("support agent heartbeat renews only the supplied claim", async () => {
  let input:Record<string,unknown>={};
  const response=await handleSupportAgentQueue(new Request("https://example.test",{method:"POST",headers:{"content-type":"application/json","x-support-agent-token":"private-token"},body:JSON.stringify({action:"heartbeat",jobId:"one",claimToken:"claim"})}),{
    expectedToken:"private-token",client:{rpc:async(_name,next)=>{input=next;return {data:{leaseExpiresAt:"later"},error:null};}}
  });
  assertEquals(response.status,200);
  assertEquals(input.p_job_id,"one");
  assertEquals(input.p_claim_token,"claim");
});
