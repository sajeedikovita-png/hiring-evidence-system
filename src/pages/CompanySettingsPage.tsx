import React, { useEffect, useMemo, useState } from "react";
import Building2 from "lucide-react/dist/esm/icons/building-2.js";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2.js";
import History from "lucide-react/dist/esm/icons/history.js";
import Palette from "lucide-react/dist/esm/icons/palette.js";
import Settings2 from "lucide-react/dist/esm/icons/settings-2.js";
import { Link } from "react-router-dom";
import { RecruiterShell } from "../components/layout/RecruiterShell";
import { isCurrentPlatformAdministrator } from "../services/accessApprovalService";
import {
  createCompanyTemplate,
  defaultCompanySettings,
  loadCompanyConfiguration,
  resetCompanyConfiguration,
  saveCompanyConfiguration,
  submitCustomWorkRequest,
  type CompanyConfigurationWorkspace,
  type CompanyCustomField,
  type CompanyFeatureKey,
  type CompanySettings,
  type CompanyTemplateKind
} from "../services/companyConfigurationService";
import { createHiringSupabaseClient } from "../services/supabaseClient";

const accentOptions = [
  ["#28543f","Forest"],["#234f48","Teal"],["#59406f","Plum"],["#7a3b2e","Brick"],["#6b4f16","Ochre"],["#324d6b","Slate"]
] as const;
const featureLabels: Record<CompanyFeatureKey,string> = {custom_branding:"Custom report branding",custom_stage_labels:"Custom workflow labels",custom_review_templates:"Review and report templates",bespoke_extensions:"Bespoke extensions"};
const stageNames: Record<string,string> = {new:"New",evidence_review:"Evidence review",interview:"Interview",client_review:"Client review",closed:"Closed"};

export function CompanySettingsPage() {
  const client=useMemo(()=>createHiringSupabaseClient(),[]);
  const [workspace,setWorkspace]=useState<CompanyConfigurationWorkspace>();
  const [draft,setDraft]=useState<CompanySettings>();
  const [message,setMessage]=useState("Loading company settings.");
  const [working,setWorking]=useState(false);
  const [platformAdmin,setPlatformAdmin]=useState(false);
  const [templateKind,setTemplateKind]=useState<CompanyTemplateKind>("review");
  const [templateName,setTemplateName]=useState("");
  const [templateInstructions,setTemplateInstructions]=useState("");
  const [request,setRequest]=useState({title:"",problem:"",desiredOutcome:"",dataImpact:""});

  async function refresh(nextMessage="") { const next=await loadCompanyConfiguration(client); setWorkspace(next); setDraft(next.settings); setMessage(nextMessage); }
  useEffect(()=>{let mounted=true;Promise.all([loadCompanyConfiguration(client),isCurrentPlatformAdministrator(client)]).then(([next,isPlatform])=>{if(!mounted)return;setWorkspace(next);setDraft(next.settings);setPlatformAdmin(isPlatform);setMessage("");}).catch((error)=>{if(mounted)setMessage(error instanceof Error?error.message:"Unable to load company settings.");});return()=>{mounted=false;};},[client]);
  function updateSettings(patch:Partial<CompanySettings>){setDraft((current)=>current?{...current,...patch}:current);}
  function updateField(index:number,patch:Partial<CompanyCustomField>){if(!draft)return;updateSettings({customFields:draft.customFields.map((field,itemIndex)=>itemIndex===index?{...field,...patch}:field)});}
  function moveStage(index:number,direction:-1|1){if(!draft)return;const target=index+direction;if(target<0||target>=draft.stageLabels.length)return;const stages=[...draft.stageLabels];[stages[index],stages[target]]=[stages[target],stages[index]];updateSettings({stageLabels:stages});}
  async function run(action:()=>Promise<void>){setWorking(true);try{await action();}catch(error){setMessage(error instanceof Error?error.message:"Unable to update company settings.");}finally{setWorking(false);}}
  async function save(){if(!draft)return;await run(async()=>{const saved=await saveCompanyConfiguration(draft,client);setDraft(saved);await refresh("Company settings saved. Existing candidate records and earlier template versions are unchanged.");});}
  async function reset(){if(!draft||!workspace)return;await run(async()=>{await resetCompanyConfiguration(draft,workspace.companyName,client);await refresh("Supported settings reset to readable defaults. Existing records are unchanged.");});}
  async function addTemplate(event:React.FormEvent){event.preventDefault();if(!draft)return;await run(async()=>{await createCompanyTemplate({kind:templateKind,name:templateName,instructions:templateInstructions,activate:true,expectedSettingsVersion:draft.version},client);setTemplateName("");setTemplateInstructions("");await refresh("A new immutable template version was created and selected for future work.");});}
  async function submitRequest(event:React.FormEvent){event.preventDefault();await run(async()=>{await submitCustomWorkRequest(request,client);setRequest({title:"",problem:"",desiredOutcome:"",dataImpact:""});await refresh("Custom-work request submitted for clarification and feasibility review. No feature was enabled and no charge was made.");});}

  const canEdit=workspace?.canEdit===true;
  return <RecruiterShell active="company" title="Company settings" subtitle="Configure supported workspace defaults and track separately agreed work.">
    <main className="workspace-content company-settings-page">
      {message?<p className="workspace-status" role="status">{message}</p>:null}
      <section className="dashboard-intro company-settings-intro"><div><p className="section-kicker">Company configuration</p><h2>One workspace, controlled settings, clear history.</h2><p>Company administrators can change supported labels and presentation. Platform-controlled packages and bespoke development remain separate, reviewed decisions.</p></div><Settings2 size={46} aria-hidden="true"/></section>
      {workspace&&draft?<>
        <section className="company-setting-summary" aria-label="Configuration status">
          <article className="workspace-card"><strong>{draft.displayName}</strong><span>{workspace.role.replace("_"," ")} access</span></article>
          <article className="workspace-card"><strong>Settings version {draft.version}</strong><span>{draft.updatedByName?`Last saved by ${draft.updatedByName}`:"Using safe defaults"}</span></article>
          <article className="workspace-card"><strong>{workspace.features.filter((feature)=>feature.enabled).length} enabled packages</strong><span>Platform controlled</span></article>
          <article className="workspace-card"><strong>{workspace.customWorkRequests.length} custom requests</strong><span>Each requires written scope and acceptance</span></article>
        </section>

        <section className="workspace-card settings-editor-card">
          <div className="section-heading-row"><div><p className="section-kicker">Supported settings</p><h2>Workspace and report presentation</h2></div><span className="badge badge-neutral">{canEdit?"Company admin":"Read only"}</span></div>
          <div className="settings-two-column">
            <div className="settings-form-stack">
              <label>Company display name<input disabled={!canEdit} maxLength={100} value={draft.displayName} onChange={(event)=>updateSettings({displayName:event.currentTarget.value})}/></label>
              <label>Secure logo URL <span className="muted">Optional</span><input disabled={!canEdit} type="url" placeholder="https://company.example/logo.png" value={draft.logoUrl} onChange={(event)=>updateSettings({logoUrl:event.currentTarget.value})}/></label>
              <fieldset disabled={!canEdit}><legend>Readable accent colour</legend><div className="accent-choice-grid">{accentOptions.map(([value,label])=><label className="accent-choice" key={value}><input type="radio" name="accent" checked={draft.accentColor===value} onChange={()=>updateSettings({accentColor:value})}/><span style={{backgroundColor:value}} aria-hidden="true"/><b>{label}</b></label>)}</div></fieldset>
              <div className="settings-label-grid">{draft.stageLabels.map((stage,index)=><div className="settings-stage-row" key={stage.key}><label>{stageNames[stage.key]} stage<input disabled={!canEdit} maxLength={40} value={stage.label} onChange={(event)=>updateSettings({stageLabels:draft.stageLabels.map((item,itemIndex)=>itemIndex===index?{...item,label:event.currentTarget.value}:item)})}/></label><div className="settings-stage-actions" aria-label={`${stageNames[stage.key]} display order`}><button type="button" className="button button-secondary" disabled={!canEdit||index===0} onClick={()=>moveStage(index,-1)}>Move up</button><button type="button" className="button button-secondary" disabled={!canEdit||index===draft.stageLabels.length-1} onClick={()=>moveStage(index,1)}>Move down</button></div></div>)}</div>
              <label>Review heading<input disabled={!canEdit} maxLength={100} value={draft.reviewDefaults.heading} onChange={(event)=>updateSettings({reviewDefaults:{...draft.reviewDefaults,heading:event.currentTarget.value}})}/></label>
              <label>Review instructions<textarea disabled={!canEdit} rows={4} maxLength={2000} value={draft.reviewDefaults.instructions} onChange={(event)=>updateSettings({reviewDefaults:{...draft.reviewDefaults,instructions:event.currentTarget.value}})}/></label>
              <label>Client report heading<input disabled={!canEdit} maxLength={100} value={draft.reportBranding.heading} onChange={(event)=>updateSettings({reportBranding:{...draft.reportBranding,heading:event.currentTarget.value}})}/></label>
              <label>Client report footer<textarea disabled={!canEdit} rows={3} maxLength={500} value={draft.reportBranding.footer} onChange={(event)=>updateSettings({reportBranding:{...draft.reportBranding,footer:event.currentTarget.value}})}/></label>
            </div>
            <aside className="settings-preview" style={{"--company-accent":draft.accentColor} as React.CSSProperties}><p className="section-kicker">Live preview</p><div className="settings-preview-brand"><span>{draft.logoUrl?<img src={draft.logoUrl} alt="Company logo preview"/>:<Building2 aria-hidden="true"/>}</span><strong>{draft.displayName||"Company workspace"}</strong></div><h3>{draft.reportBranding.heading||"Candidate evidence summary"}</h3><div className="settings-preview-status">{draft.stageLabels[2]?.label||"Interview"}</div><p>{draft.reviewDefaults.instructions}</p><small>{draft.reportBranding.footer}</small></aside>
          </div>
          <div className="settings-actions">{canEdit?<><button className="button button-primary" disabled={working} onClick={()=>void save()}>{working?"Saving":"Save company settings"}</button><button className="button button-secondary" disabled={working} onClick={()=>void reset()}>Reset supported defaults</button></>:<p className="muted">Ask a company administrator to change these settings.</p>}</div>
        </section>

        <section className="workspace-card custom-fields-card"><div className="section-heading-row"><div><p className="section-kicker">Job-related fields</p><h2>Approved custom labels</h2></div><span className="badge badge-neutral">Maximum 5</span></div><p className="muted">Use these only for information needed to review the role. They do not alter earlier records.</p><div className="custom-field-list">{draft.customFields.map((field,index)=><div className="custom-field-row" key={`${field.key}-${index}`}><input aria-label={`Custom field ${index+1} key`} disabled={!canEdit} placeholder="project_region" value={field.key} onChange={(event)=>updateField(index,{key:event.currentTarget.value.toLowerCase().replace(/[^a-z0-9_]/g,"")})}/><input aria-label={`Custom field ${index+1} label`} disabled={!canEdit} placeholder="Project region" value={field.label} onChange={(event)=>updateField(index,{label:event.currentTarget.value})}/><input aria-label={`Custom field ${index+1} guidance`} disabled={!canEdit} placeholder="Why the field is job-related" value={field.helpText} onChange={(event)=>updateField(index,{helpText:event.currentTarget.value})}/><input aria-label={`Custom field ${index+1} maximum length`} disabled={!canEdit} type="number" min={1} max={2000} value={field.maxLength} onChange={(event)=>updateField(index,{maxLength:Number(event.currentTarget.value)})}/>{canEdit?<button className="button button-secondary" type="button" onClick={()=>updateSettings({customFields:draft.customFields.filter((_,itemIndex)=>itemIndex!==index)})}>Remove</button>:null}</div>)}</div>{canEdit&&draft.customFields.length<5?<button className="button button-secondary" type="button" onClick={()=>updateSettings({customFields:[...draft.customFields,{key:`field_${draft.customFields.length+1}`,label:"",helpText:"",maxLength:500}]})}>Add job-related field</button>:null}</section>

        <section className="workspace-card template-card"><div className="section-heading-row"><div><p className="section-kicker">Reusable templates</p><h2>Create a new version</h2></div><span className="badge badge-neutral">Earlier versions retained</span></div>{canEdit?<form className="settings-template-form" onSubmit={(event)=>void addTemplate(event)}><label>Template type<select value={templateKind} onChange={(event)=>setTemplateKind(event.currentTarget.value as CompanyTemplateKind)}><option value="review">Review template</option><option value="report">Report template</option></select></label><label>Template name<input maxLength={80} required value={templateName} onChange={(event)=>setTemplateName(event.currentTarget.value)} placeholder="Engineering evidence review"/></label><label>Instructions or footer<textarea rows={4} maxLength={4000} required value={templateInstructions} onChange={(event)=>setTemplateInstructions(event.currentTarget.value)} placeholder="Describe the approved job-related review structure."/></label><button className="button button-primary" disabled={working}>Create and select version</button></form>:null}<div className="template-version-list">{workspace.templates.length?workspace.templates.map((template)=><article key={template.id}><strong>{template.templateName} · v{template.version}</strong><span>{template.templateKind} · {template.createdByName} · {new Date(template.createdAt).toLocaleString("en-SG")}</span></article>):<p className="muted">No company template versions yet. Safe product defaults remain active.</p>}</div></section>

        <section className="workspace-card feature-package-card"><div className="section-heading-row"><div><p className="section-kicker">Separately agreed packages</p><h2>Feature access</h2></div>{platformAdmin?<Link className="table-link" to="/admin/company-controls">Open platform controls</Link>:null}</div><p className="muted">Only the platform owner can enable these packages. Hiding a button is not the access control. Disabled packages retain their earlier records for authorised reading.</p><div className="feature-package-grid">{(Object.keys(featureLabels) as CompanyFeatureKey[]).map((key)=>{const feature=workspace.features.find((item)=>item.featureKey===key);return <article key={key}><CheckCircle2 aria-hidden="true"/><strong>{featureLabels[key]}</strong><span className={`badge ${feature?.enabled?"badge-success":"badge-neutral"}`}>{feature?.enabled?"Enabled":"Not enabled"}</span><p>{feature?.reason||"No separately agreed scope has been recorded."}</p>{feature?.endsAt?<small>Until {new Date(feature.endsAt).toLocaleString("en-SG")}</small>:null}</article>;})}</div></section>

        <section className="workspace-card custom-work-card"><div className="section-heading-row"><div><p className="section-kicker">Bespoke development</p><h2>Request reviewed custom work</h2></div><span className="badge badge-warning">Quote required</span></div><p>Supported settings above are separate from development. A request moves through clarification, feasibility, written scope and quote, preview, acceptance, enablement, and maintenance. Submission does not approve work or create a charge.</p>{canEdit?<form className="custom-work-form" onSubmit={(event)=>void submitRequest(event)}><label>Request title<input required maxLength={120} value={request.title} onChange={(event)=>setRequest({...request,title:event.currentTarget.value})}/></label><label>Problem to solve<textarea required minLength={20} maxLength={3000} rows={4} value={request.problem} onChange={(event)=>setRequest({...request,problem:event.currentTarget.value})}/></label><label>Desired job-related outcome<textarea required minLength={20} maxLength={3000} rows={4} value={request.desiredOutcome} onChange={(event)=>setRequest({...request,desiredOutcome:event.currentTarget.value})}/></label><label>Expected data impact <span className="muted">Optional</span><textarea maxLength={2000} rows={3} value={request.dataImpact} onChange={(event)=>setRequest({...request,dataImpact:event.currentTarget.value})}/></label><button className="button button-primary" disabled={working}>Submit for review</button></form>:null}<div className="custom-work-list">{workspace.customWorkRequests.map((item)=><article key={item.id}><div><strong>{item.title}</strong><span className="badge badge-neutral">{item.stage.replace("_"," ")}</span></div><p>{item.problem}</p><small>Requested by {item.requestedByName} · updated {new Date(item.updatedAt).toLocaleString("en-SG")}</small>{item.events.length?<details><summary><History size={16} aria-hidden="true"/> Progress history</summary><ol>{item.events.map((event)=><li key={event.id}><strong>{event.stage.replace("_"," ")}</strong> · {event.actorName}<p>{event.note}</p></li>)}</ol></details>:null}</article>)}</div></section>

        <section className="workspace-card settings-history-card"><p className="section-kicker">Audit history</p><h2>Configuration versions</h2>{workspace.history.length?<ol>{workspace.history.map((event)=><li key={event.id}><strong>Version {event.state.version}</strong><span>{event.actorName} · {new Date(event.createdAt).toLocaleString("en-SG")}</span></li>)}</ol>:<p className="muted">No company settings have been saved yet.</p>}</section>
      </>:null}
    </main>
  </RecruiterShell>;
}

export function CompanySettingsPreviewFixture(){const settings=defaultCompanySettings("Northstar Search");return <div className="company-settings-page"><section className="workspace-card settings-editor-card"><p className="section-kicker">Supported settings</p><h2>Workspace and report presentation</h2><aside className="settings-preview" style={{"--company-accent":settings.accentColor} as React.CSSProperties}><p className="section-kicker">Live preview</p><div className="settings-preview-brand"><Palette aria-hidden="true"/><strong>{settings.displayName}</strong></div><h3>{settings.reportBranding.heading}</h3><div className="settings-preview-status">{settings.stageLabels[2].label}</div><p>{settings.reviewDefaults.instructions}</p><small>{settings.reportBranding.footer}</small></aside></section></div>;}
