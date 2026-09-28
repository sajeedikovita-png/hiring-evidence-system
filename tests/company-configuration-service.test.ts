import assert from "node:assert/strict";
import {
  createCompanyTemplate,
  companyReportBranding,
  defaultCompanySettings,
  loadCompanyConfiguration,
  resetCompanyConfiguration,
  saveCompanyConfiguration,
  setCompanyFeature,
  submitCustomWorkRequest,
  validateSettings,
  type CompanyConfigurationRpcClient
} from "../src/services/companyConfigurationService";

const companyId="10000000-0000-4000-8000-000000000001";
const templateId="20000000-0000-4000-8000-000000000001";
const requestId="30000000-0000-4000-8000-000000000001";
const eventId="40000000-0000-4000-8000-000000000001";
const now="2026-09-19T12:00:00Z";
const settings={display_name:"Northstar Search",logo_url:null,accent_color:"#28543f",stage_labels:[{key:"new",label:"New"},{key:"evidence_review",label:"Evidence review"},{key:"interview",label:"Interview"},{key:"client_review",label:"Client review"},{key:"closed",label:"Closed"}],custom_fields:[],review_defaults:{heading:"Evidence review",instructions:"Review job-related evidence."},report_branding:{heading:"Candidate evidence summary",footer:"AI assists. Human decides. Evidence explains."},active_review_template_id:null,active_report_template_id:null,version:1,updated_by_name:"Owner",updated_at:now};
const template={id:templateId,template_kind:"review",template_name:"Engineering review",version:1,content:{instructions:"Review evidence."},created_by_name:"Owner",created_at:now};
const feature={feature_key:"custom_review_templates",enabled:true,reason:"Written scope accepted by the owner.",starts_at:null,ends_at:null,configured_by_name:"Platform owner",version:1,updated_at:now};
const request={id:requestId,requested_by_name:"Owner",title:"Client reference field",problem:"We need to identify the approved client reference on each role.",desired_outcome:"Add a controlled job-related client reference field for our reviewers.",data_impact:"Stores one short client reference.",stage:"request",version:1,created_at:now,updated_at:now,events:[{id:eventId,actor_kind:"company",actor_name:"Owner",note:"Request submitted for platform review.",previous_stage:null,stage:"request",created_at:now}]};

const calls:Array<{name:string;args?:Record<string,unknown>}>=[];
const client:CompanyConfigurationRpcClient={rpc:async(name:string,args?:Record<string,unknown>)=>{calls.push({name,args});if(name==="get_company_configuration")return {data:{company_id:companyId,company_name:"Northstar",role:"admin",can_edit:true,settings,history:[{id:eventId,actor_name:"Owner",state:settings,created_at:now}],templates:[template],features:[feature],custom_work_requests:[request]},error:null} as never;if(name==="update_company_configuration")return {data:{...settings,version:2},error:null} as never;if(name==="create_company_template_version")return {data:template,error:null} as never;if(name==="submit_custom_work_request")return {data:{...request,events:undefined},error:null} as never;if(name==="set_company_feature_entitlement")return {data:feature,error:null} as never;throw new Error(name);}} as CompanyConfigurationRpcClient;

async function main(){
const workspace=await loadCompanyConfiguration(client);
assert.equal(workspace.companyName,"Northstar");
assert.equal(workspace.settings.displayName,"Northstar Search");
assert.equal(workspace.templates[0].templateName,"Engineering review");
assert.equal(workspace.features[0].enabled,true);
assert.equal(workspace.customWorkRequests[0].events[0].actorName,"Owner");
assert.equal(companyReportBranding({...workspace,settings:{...workspace.settings,activeReportTemplateId:templateId},templates:[{...workspace.templates[0],templateKind:"report",content:{footer:"Approved report footer"}}]}).footer,"Approved report footer");

const draft={...workspace.settings,displayName:"Northstar Hiring"};
assert.equal((await saveCompanyConfiguration(draft,client)).version,2);
assert.equal(calls.at(-1)?.args?.p_expected_version,1);
assert.equal((calls.at(-1)?.args?.p_payload as Record<string,unknown>).display_name,"Northstar Hiring");
assert.equal((await resetCompanyConfiguration({...draft,version:1},"Northstar",client)).displayName,"Northstar Search");
await createCompanyTemplate({kind:"review",name:"Engineering review",instructions:"Review evidence.",activate:true,expectedSettingsVersion:1},client);
assert.equal(calls.at(-1)?.args?.p_activate,true);
await submitCustomWorkRequest({title:request.title,problem:request.problem,desiredOutcome:String(request.desired_outcome),dataImpact:String(request.data_impact),requestId},client);
assert.equal(calls.at(-1)?.args?.p_request_id,requestId);
await setCompanyFeature({companyId,featureKey:"custom_review_templates",enabled:true,reason:"Written scope accepted by the owner."},client);
assert.equal(calls.at(-1)?.args?.p_company_id,companyId);

const defaults=defaultCompanySettings("ABC");
assert.equal(defaults.stageLabels.length,5);
for(const invalid of [{...defaults,displayName:""},{...defaults,accentColor:"#ffffff"},{...defaults,stageLabels:defaults.stageLabels.slice(1)},{...defaults,logoUrl:"http://unsafe.example/logo.png"},{...defaults,customFields:[{key:"Bad key",label:"Field",helpText:"",maxLength:20}]}])assert.throws(()=>validateSettings(invalid),/./);
await assert.rejects(()=>saveCompanyConfiguration({...defaults,displayName:""},client),/display name/);
await assert.rejects(()=>createCompanyTemplate({kind:"report",name:"",instructions:"",activate:false,expectedSettingsVersion:0},client),/template name/);
await assert.rejects(()=>submitCustomWorkRequest({title:"x",problem:"short",desiredOutcome:"short",dataImpact:""},client),/enough detail/);
await assert.rejects(()=>setCompanyFeature({companyId,featureKey:"custom_branding",enabled:true,reason:"short"},client),/12 characters/);
const conflictClient={rpc:async()=>({data:null,error:{message:"COMPANY_CONFIGURATION_VERSION_CONFLICT"}})} as CompanyConfigurationRpcClient;
await assert.rejects(()=>saveCompanyConfiguration(defaults,conflictClient),/Another administrator/);
console.log("Company configuration service tests passed.");
}
void main();
