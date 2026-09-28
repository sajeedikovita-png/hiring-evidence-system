import type { SupabaseClient } from "@supabase/supabase-js";
import { createHiringSupabaseClient } from "./supabaseClient";

export const companyStageKeys = ["new", "evidence_review", "interview", "client_review", "closed"] as const;
export type CompanyStageKey = typeof companyStageKeys[number];
export type CompanyFeatureKey = "custom_branding" | "custom_stage_labels" | "custom_review_templates" | "bespoke_extensions";
export type CompanyTemplateKind = "review" | "report";
export type CustomWorkStage = "request" | "clarification" | "feasibility" | "scope_quote" | "preview" | "acceptance" | "enabled" | "maintenance" | "closed";

export type CompanyStageLabel = { key: CompanyStageKey; label: string };
export type CompanyCustomField = { key: string; label: string; helpText: string; maxLength: number };
export type CompanySettings = {
  displayName: string;
  logoUrl: string;
  accentColor: string;
  stageLabels: CompanyStageLabel[];
  customFields: CompanyCustomField[];
  reviewDefaults: { heading: string; instructions: string };
  reportBranding: { heading: string; footer: string };
  activeReviewTemplateId?: string;
  activeReportTemplateId?: string;
  version: number;
  updatedByName?: string;
  updatedAt?: string;
};
export type CompanySettingsEvent = { id: string; actorName: string; state: CompanySettings; createdAt: string };
export type CompanyTemplateVersion = { id: string; templateKind: CompanyTemplateKind; templateName: string; version: number; content: Record<string, unknown>; createdByName: string; createdAt: string };
export type CompanyFeatureEntitlement = { featureKey: CompanyFeatureKey; enabled: boolean; reason: string; startsAt?: string; endsAt?: string; configuredByName: string; version: number; updatedAt: string };
export type CustomWorkEvent = { id: string; actorKind: "company" | "platform"; actorName: string; note: string; previousStage?: CustomWorkStage; stage: CustomWorkStage; createdAt: string };
export type CustomWorkRequest = { id: string; requestedByName: string; title: string; problem: string; desiredOutcome: string; dataImpact: string; stage: CustomWorkStage; version: number; createdAt: string; updatedAt: string; events: CustomWorkEvent[] };
export type CompanyConfigurationWorkspace = { companyId: string; companyName: string; role: "admin" | "recruiter" | "hiring_manager"; canEdit: boolean; settings: CompanySettings; history: CompanySettingsEvent[]; templates: CompanyTemplateVersion[]; features: CompanyFeatureEntitlement[]; customWorkRequests: CustomWorkRequest[] };
export type PlatformCompanyControl = { companyId: string; companyName: string; features: CompanyFeatureEntitlement[]; customWorkRequests: Omit<CustomWorkRequest, "events">[] };

export function companyReportBranding(workspace: CompanyConfigurationWorkspace) {
  const settings=workspace.settings;
  const active=workspace.templates.find((template)=>template.id===settings.activeReportTemplateId&&template.templateKind==="report");
  const templateFooter=typeof active?.content.footer==="string"?active.content.footer.trim():"";
  return {displayName:settings.displayName,logoUrl:settings.logoUrl,accentColor:settings.accentColor,heading:settings.reportBranding.heading,footer:templateFooter||settings.reportBranding.footer};
}

export type CompanyConfigurationRpcClient = Pick<SupabaseClient, "rpc">;
type Row = Record<string, unknown>;
const accents = new Set(["#28543f", "#234f48", "#59406f", "#7a3b2e", "#6b4f16", "#324d6b"]);

function object(value: unknown, message = "Company configuration response is invalid."): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(message);
  return value as Row;
}
function list(value: unknown): unknown[] { if (!Array.isArray(value)) throw new Error("Company configuration response is invalid."); return value; }
function text(value: unknown): string { return typeof value === "string" ? value : ""; }
function number(value: unknown): number { return typeof value === "number" && Number.isInteger(value) ? value : Number.NaN; }
function optionalText(value: unknown): string | undefined { const result=text(value); return result || undefined; }
function iso(value: unknown): string { const result=text(value); if (!result || Number.isNaN(Date.parse(result))) throw new Error("Company configuration response is invalid."); return result; }
function optionalIso(value: unknown): string | undefined { if (value == null || value === "") return undefined; return iso(value); }
function bool(value: unknown): boolean { if (typeof value !== "boolean") throw new Error("Company configuration response is invalid."); return value; }
function camel(row: Row, key: string) { const snake=key.replace(/[A-Z]/g,(letter)=>`_${letter.toLowerCase()}`); return row[key] ?? row[snake]; }
function uuid(value: unknown): string { const result=text(value); if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result)) throw new Error("Company configuration response is invalid."); return result; }

export function defaultCompanySettings(companyName = "Company workspace"): CompanySettings {
  return { displayName: companyName, logoUrl: "", accentColor: "#28543f", stageLabels: [
    {key:"new",label:"New"},{key:"evidence_review",label:"Evidence review"},{key:"interview",label:"Interview"},{key:"client_review",label:"Client review"},{key:"closed",label:"Closed"}
  ], customFields: [], reviewDefaults: {heading:"Evidence review",instructions:"Review job-related evidence and record what still needs verification."}, reportBranding: {heading:"Candidate evidence summary",footer:"AI assists. Human decides. Evidence explains."}, version:0 };
}

function mapSettings(value: unknown): CompanySettings {
  const row=object(value); const stages=list(camel(row,"stageLabels")); const fields=list(camel(row,"customFields")); const review=object(camel(row,"reviewDefaults")); const report=object(camel(row,"reportBranding"));
  const mappedStages=stages.map((item)=>{const entry=object(item);return {key:text(entry.key) as CompanyStageKey,label:text(entry.label)};});
  if (mappedStages.length!==5 || new Set(mappedStages.map((stage)=>stage.key)).size!==5 || mappedStages.some((stage)=>!companyStageKeys.includes(stage.key)||!stage.label||stage.label.length>40)) throw new Error("Company configuration response is invalid.");
  const customFields=fields.map((item)=>{const entry=object(item);return {key:text(entry.key),label:text(entry.label),helpText:text(camel(entry,"helpText")),maxLength:number(camel(entry,"maxLength"))};});
  const version=number(row.version); const accentColor=text(camel(row,"accentColor"));
  if (!text(camel(row,"displayName")) || !accents.has(accentColor) || !Number.isInteger(version) || version<0 || customFields.some((field)=>!field.key||!field.label||!Number.isInteger(field.maxLength))) throw new Error("Company configuration response is invalid.");
  return {displayName:text(camel(row,"displayName")),logoUrl:text(camel(row,"logoUrl")),accentColor,stageLabels:mappedStages,customFields,reviewDefaults:{heading:text(review.heading),instructions:text(review.instructions)},reportBranding:{heading:text(report.heading),footer:text(report.footer)},activeReviewTemplateId:optionalText(camel(row,"activeReviewTemplateId")),activeReportTemplateId:optionalText(camel(row,"activeReportTemplateId")),version,updatedByName:optionalText(camel(row,"updatedByName")),updatedAt:optionalIso(camel(row,"updatedAt"))};
}

function mapTemplate(value: unknown): CompanyTemplateVersion { const row=object(value); const kind=text(camel(row,"templateKind")); if(kind!=="review"&&kind!=="report")throw new Error("Company template response is invalid."); return {id:uuid(row.id),templateKind:kind,templateName:text(camel(row,"templateName")),version:number(row.version),content:object(row.content),createdByName:text(camel(row,"createdByName")),createdAt:iso(camel(row,"createdAt"))}; }
function mapFeature(value: unknown): CompanyFeatureEntitlement { const row=object(value); const key=text(camel(row,"featureKey")) as CompanyFeatureKey; if(!["custom_branding","custom_stage_labels","custom_review_templates","bespoke_extensions"].includes(key))throw new Error("Company feature response is invalid."); return {featureKey:key,enabled:bool(row.enabled),reason:text(row.reason),startsAt:optionalIso(camel(row,"startsAt")),endsAt:optionalIso(camel(row,"endsAt")),configuredByName:text(camel(row,"configuredByName")),version:number(row.version),updatedAt:iso(camel(row,"updatedAt"))}; }
function mapEvent(value: unknown): CustomWorkEvent { const row=object(value); return {id:uuid(row.id),actorKind:text(camel(row,"actorKind")) as CustomWorkEvent["actorKind"],actorName:text(camel(row,"actorName")),note:text(row.note),previousStage:optionalText(camel(row,"previousStage")) as CustomWorkStage|undefined,stage:text(row.stage) as CustomWorkStage,createdAt:iso(camel(row,"createdAt"))}; }
function mapRequest(value: unknown, requireEvents=true): CustomWorkRequest { const row=object(value); const stage=text(row.stage) as CustomWorkStage; if(!["request","clarification","feasibility","scope_quote","preview","acceptance","enabled","maintenance","closed"].includes(stage))throw new Error("Custom work response is invalid."); return {id:uuid(row.id),requestedByName:text(camel(row,"requestedByName")),title:text(row.title),problem:text(row.problem),desiredOutcome:text(camel(row,"desiredOutcome")),dataImpact:text(camel(row,"dataImpact")),stage,version:number(row.version),createdAt:iso(camel(row,"createdAt")),updatedAt:iso(camel(row,"updatedAt")),events:requireEvents?list(row.events).map(mapEvent):[]}; }

function configurationPayload(settings: CompanySettings) {
  validateSettings(settings);
  return {display_name:settings.displayName.trim(),logo_url:settings.logoUrl.trim()||null,accent_color:settings.accentColor,stage_labels:settings.stageLabels.map(({key,label})=>({key,label:label.trim()})),custom_fields:settings.customFields.map((field)=>({key:field.key.trim(),label:field.label.trim(),help_text:field.helpText.trim(),max_length:field.maxLength})),review_defaults:{heading:settings.reviewDefaults.heading.trim(),instructions:settings.reviewDefaults.instructions.trim()},report_branding:{heading:settings.reportBranding.heading.trim(),footer:settings.reportBranding.footer.trim()},active_review_template_id:settings.activeReviewTemplateId??null,active_report_template_id:settings.activeReportTemplateId??null};
}

export function validateSettings(settings: CompanySettings) {
  if(settings.displayName.trim().length<2||settings.displayName.trim().length>100)throw new Error("Enter a company display name between 2 and 100 characters.");
  if(settings.logoUrl && (!settings.logoUrl.startsWith("https://")||settings.logoUrl.length>500))throw new Error("Use a secure HTTPS logo URL of 500 characters or fewer.");
  if(!accents.has(settings.accentColor))throw new Error("Choose one of the readable accent colours.");
  if(settings.stageLabels.length!==5||new Set(settings.stageLabels.map((stage)=>stage.key)).size!==5||settings.stageLabels.some((stage)=>!companyStageKeys.includes(stage.key)||!stage.label.trim()||stage.label.trim().length>40))throw new Error("Enter one readable label for every workflow stage.");
  if(settings.customFields.length>5||new Set(settings.customFields.map((field)=>field.key)).size!==settings.customFields.length||settings.customFields.some((field)=>!/^[a-z][a-z0-9_]{1,29}$/.test(field.key)||!field.label.trim()||field.label.length>60||field.helpText.length>240||!Number.isInteger(field.maxLength)||field.maxLength<1||field.maxLength>2000))throw new Error("Custom fields need unique keys, short job-related labels, and limits from 1 to 2,000 characters.");
  if(!settings.reviewDefaults.heading.trim()||settings.reviewDefaults.heading.length>100||settings.reviewDefaults.instructions.length>2000)throw new Error("Review defaults are invalid.");
  if(!settings.reportBranding.heading.trim()||settings.reportBranding.heading.length>100||settings.reportBranding.footer.length>500)throw new Error("Report branding is invalid.");
}

function mapRpcError(error: {message?:string}|null, fallback: string): never|void { if(!error)return; const message=error.message??fallback; if(/VERSION_CONFLICT/.test(message))throw new Error("Another administrator saved first. Reload the latest settings before trying again."); if(/ADMIN_REQUIRED/.test(message))throw new Error("Company administrator access is required."); if(/WRITE_ACCESS_REQUIRED/.test(message))throw new Error("This workspace does not currently allow configuration changes."); throw new Error(fallback); }

export async function loadCompanyConfiguration(client:CompanyConfigurationRpcClient=createHiringSupabaseClient()):Promise<CompanyConfigurationWorkspace>{const {data,error}=await client.rpc("get_company_configuration");mapRpcError(error,"Unable to load company settings.");const row=object(data);const role=text(row.role) as CompanyConfigurationWorkspace["role"];return {companyId:uuid(camel(row,"companyId")),companyName:text(camel(row,"companyName")),role,canEdit:bool(camel(row,"canEdit")),settings:mapSettings(row.settings),history:list(row.history).map((item)=>{const event=object(item);return {id:uuid(event.id),actorName:text(camel(event,"actorName")),state:mapSettings(event.state),createdAt:iso(camel(event,"createdAt"))};}),templates:list(row.templates).map(mapTemplate),features:list(row.features).map(mapFeature),customWorkRequests:list(camel(row,"customWorkRequests")).map((item)=>mapRequest(item))};}
export async function saveCompanyConfiguration(settings:CompanySettings,client:CompanyConfigurationRpcClient=createHiringSupabaseClient()):Promise<CompanySettings>{const {data,error}=await client.rpc("update_company_configuration",{p_payload:configurationPayload(settings),p_expected_version:settings.version});mapRpcError(error,"Unable to save company settings.");return mapSettings(data);}
export async function resetCompanyConfiguration(settings:CompanySettings,companyName:string,client:CompanyConfigurationRpcClient=createHiringSupabaseClient()){const defaults=defaultCompanySettings(companyName);return saveCompanyConfiguration({...defaults,version:settings.version},client);}
export async function createCompanyTemplate(input:{kind:CompanyTemplateKind;name:string;instructions:string;activate:boolean;expectedSettingsVersion:number},client:CompanyConfigurationRpcClient=createHiringSupabaseClient()){if(!input.name.trim()||input.name.trim().length>80||!input.instructions.trim()||input.instructions.length>4000)throw new Error("Enter a template name and instructions.");const {data,error}=await client.rpc("create_company_template_version",{p_kind:input.kind,p_name:input.name.trim(),p_content:input.kind==="review"?{instructions:input.instructions.trim()}:{footer:input.instructions.trim()},p_activate:input.activate,p_expected_settings_version:input.expectedSettingsVersion});mapRpcError(error,"Unable to create the template version.");return mapTemplate(data);}
export async function submitCustomWorkRequest(input:{title:string;problem:string;desiredOutcome:string;dataImpact:string;requestId?:string},client:CompanyConfigurationRpcClient=createHiringSupabaseClient()){if(input.title.trim().length<3||input.problem.trim().length<20||input.desiredOutcome.trim().length<20)throw new Error("Describe the problem and desired outcome in enough detail for review.");const requestId=input.requestId??crypto.randomUUID();const {data,error}=await client.rpc("submit_custom_work_request",{p_title:input.title.trim(),p_problem:input.problem.trim(),p_desired_outcome:input.desiredOutcome.trim(),p_data_impact:input.dataImpact.trim(),p_request_id:requestId});mapRpcError(error,"Unable to submit the custom-work request.");return mapRequest({...object(data),events:[]});}
export async function loadPlatformCompanyControls(client:CompanyConfigurationRpcClient=createHiringSupabaseClient()):Promise<PlatformCompanyControl[]>{const {data,error}=await client.rpc("platform_company_configuration_controls");mapRpcError(error,"Unable to load company controls.");return list(data).map((value)=>{const row=object(value);return {companyId:uuid(camel(row,"companyId")),companyName:text(camel(row,"companyName")),features:list(row.features).map(mapFeature),customWorkRequests:list(camel(row,"customWorkRequests")).map((item)=>mapRequest(item,false))};});}
export async function setCompanyFeature(input:{companyId:string;featureKey:CompanyFeatureKey;enabled:boolean;reason:string;startsAt?:string;endsAt?:string},client:CompanyConfigurationRpcClient=createHiringSupabaseClient()){if(input.reason.trim().length<12)throw new Error("Enter a written reason of at least 12 characters.");const {data,error}=await client.rpc("set_company_feature_entitlement",{p_company_id:input.companyId,p_feature_key:input.featureKey,p_enabled:input.enabled,p_reason:input.reason.trim(),p_starts_at:input.startsAt||null,p_ends_at:input.endsAt||null});mapRpcError(error,"Unable to update the feature package.");return mapFeature(data);}
export async function advanceCustomWorkRequest(input:{requestId:string;stage:CustomWorkStage;note:string},client:CompanyConfigurationRpcClient=createHiringSupabaseClient()){if(!input.note.trim())throw new Error("Enter a written progress note.");const {data,error}=await client.rpc("advance_custom_work_request",{p_request_id:input.requestId,p_stage:input.stage,p_note:input.note.trim()});mapRpcError(error,"Unable to update the custom-work request.");return mapRequest({...object(data),events:[]});}
