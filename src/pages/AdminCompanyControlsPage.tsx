import React, { useEffect, useMemo, useState } from "react";
import SlidersHorizontal from "lucide-react/dist/esm/icons/sliders-horizontal.js";
import { RecruiterShell } from "../components/layout/RecruiterShell";
import {
  advanceCustomWorkRequest,
  loadPlatformCompanyControls,
  setCompanyFeature,
  type CompanyFeatureKey,
  type CustomWorkStage,
  type PlatformCompanyControl
} from "../services/companyConfigurationService";
import { createHiringSupabaseClient } from "../services/supabaseClient";

const featureLabels:Record<CompanyFeatureKey,string>={custom_branding:"Custom report branding",custom_stage_labels:"Custom workflow labels",custom_review_templates:"Review and report templates",bespoke_extensions:"Bespoke extensions"};
const stages:CustomWorkStage[]=["request","clarification","feasibility","scope_quote","preview","acceptance","enabled","maintenance","closed"];

export function AdminCompanyControlsPage(){
 const client=useMemo(()=>createHiringSupabaseClient(),[]);
 const [companies,setCompanies]=useState<PlatformCompanyControl[]>([]);
 const [message,setMessage]=useState("Loading company controls.");
 const [working,setWorking]=useState(false);
 const [featureDrafts,setFeatureDrafts]=useState<Record<string,{enabled:boolean;reason:string}>>({});
 const [requestDrafts,setRequestDrafts]=useState<Record<string,{stage:CustomWorkStage;note:string}>>({});
 async function refresh(nextMessage=""){const next=await loadPlatformCompanyControls(client);setCompanies(next);setMessage(nextMessage);}
 useEffect(()=>{refresh().catch((error)=>setMessage(error instanceof Error?error.message:"Unable to load company controls."));},[]);
 async function updateFeature(companyId:string,featureKey:CompanyFeatureKey){const key=`${companyId}:${featureKey}`;const current=companies.find((company)=>company.companyId===companyId)?.features.find((feature)=>feature.featureKey===featureKey);const draft=featureDrafts[key]??{enabled:current?.enabled??false,reason:current?.reason??""};setWorking(true);try{await setCompanyFeature({companyId,featureKey,enabled:draft.enabled,reason:draft.reason},client);await refresh("Feature package updated with an attributable reason. Existing records were retained.");}catch(error){setMessage(error instanceof Error?error.message:"Unable to update the feature package.");}finally{setWorking(false);}}
 async function advance(requestId:string,currentStage:CustomWorkStage){const draft=requestDrafts[requestId]??{stage:currentStage,note:""};setWorking(true);try{await advanceCustomWorkRequest({requestId,stage:draft.stage,note:draft.note},client);setRequestDrafts((current)=>({...current,[requestId]:{stage:draft.stage,note:""}}));await refresh("Custom-work progress recorded. No production change was made by this status update.");}catch(error){setMessage(error instanceof Error?error.message:"Unable to update the custom-work request.");}finally{setWorking(false);}}
 return <RecruiterShell active="company-controls" title="Company controls" subtitle="Record platform-owned feature packages and bespoke-work progress." showAccessRequests reviewerName="Platform administrator">
  <main className="workspace-content admin-company-controls-page">
   {message?<p className="workspace-status" role="status">{message}</p>:null}
   <section className="dashboard-intro"><div><p className="section-kicker">Platform owner review</p><h2>Enable only a written, company-specific scope.</h2><p>These controls record access; they do not execute code, deploy changes, charge a customer, or accept work on the customer’s behalf.</p></div><SlidersHorizontal size={46} aria-hidden="true"/></section>
   {companies.map((company)=><section className="workspace-card platform-company-card" key={company.companyId}><div className="section-heading-row"><div><p className="section-kicker">Company</p><h2>{company.companyName}</h2></div><span className="badge badge-neutral">{company.companyId.slice(0,8)}</span></div>
    <div className="platform-feature-list">{(Object.keys(featureLabels) as CompanyFeatureKey[]).map((featureKey)=>{const saved=company.features.find((feature)=>feature.featureKey===featureKey);const key=`${company.companyId}:${featureKey}`;const draft=featureDrafts[key]??{enabled:saved?.enabled??false,reason:saved?.reason??""};return <article key={featureKey}><div><strong>{featureLabels[featureKey]}</strong><span className={`badge ${saved?.enabled?"badge-success":"badge-neutral"}`}>{saved?.enabled?"Enabled":"Not enabled"}</span></div><label className="checkbox-row"><input type="checkbox" checked={draft.enabled} onChange={(event)=>setFeatureDrafts((current)=>({...current,[key]:{...draft,enabled:event.currentTarget.checked}}))}/><span>Enable for this company</span></label><label>Written scope or reason<textarea rows={3} maxLength={1000} value={draft.reason} onChange={(event)=>setFeatureDrafts((current)=>({...current,[key]:{...draft,reason:event.currentTarget.value}}))} placeholder="Record the agreed scope and why access is enabled or disabled."/></label><button className="button button-secondary" disabled={working||draft.reason.trim().length<12} onClick={()=>void updateFeature(company.companyId,featureKey)}>Save package decision</button></article>;})}</div>
    <div className="platform-request-list"><h3>Bespoke-work requests</h3>{company.customWorkRequests.length?company.customWorkRequests.map((request)=>{const draft=requestDrafts[request.id]??{stage:request.stage,note:""};return <article key={request.id}><div><strong>{request.title}</strong><span className="badge badge-warning">{request.stage.replace("_"," ")}</span></div><p>{request.problem}</p><p><b>Desired outcome:</b> {request.desiredOutcome}</p>{request.dataImpact?<p><b>Data impact:</b> {request.dataImpact}</p>:null}<div className="platform-request-controls"><label>Progress stage<select value={draft.stage} onChange={(event)=>setRequestDrafts((current)=>({...current,[request.id]:{...draft,stage:event.currentTarget.value as CustomWorkStage}}))}>{stages.map((stage)=><option key={stage} value={stage}>{stage.replace("_"," ")}</option>)}</select></label><label>Written progress note<textarea rows={3} maxLength={3000} value={draft.note} onChange={(event)=>setRequestDrafts((current)=>({...current,[request.id]:{...draft,note:event.currentTarget.value}}))}/></label><button className="button button-primary" disabled={working||!draft.note.trim()} onClick={()=>void advance(request.id,request.stage)}>Record progress</button></div></article>}):<p className="muted">No bespoke-work requests for this company.</p>}</div>
   </section>)}
  </main>
 </RecruiterShell>;
}
