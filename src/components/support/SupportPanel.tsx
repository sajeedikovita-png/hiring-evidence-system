import React, { useMemo, useState } from "react";
import { Send, X } from "lucide-react";
import { Link } from "react-router-dom";
import { createHiringSupabaseClient } from "../../services/supabaseClient";
import { hasSupabaseConfig } from "../../services/supabaseConfig";
import { createSupportRepository, getPageHelp, type SafeDiagnosticsPreview, type SupportGuidePresentation } from "../../services/supportService";

type SupportMessage = { id: string; role: "customer" | "assistant"; body: string; presentation?: SupportGuidePresentation };

type SupportPanelProps = {
  active: string;
  pageTitle: string;
  diagnostics: SafeDiagnosticsPreview;
  onClose: () => void;
  onStartRequest: (type: "problem" | "feature") => void;
};

export function SupportPanel({ active, pageTitle, diagnostics, onClose, onStartRequest }: SupportPanelProps) {
  const help = useMemo(() => getPageHelp(active), [active]);
  const [messages, setMessages] = useState<SupportMessage[]>([{ id: "welcome", role: "assistant", body: `Hello. I’m the Hiring Evidence Guide. I understand how this workspace works and can help with ${help.title.toLowerCase()}. Ask me what to enter, what something means, or what to do next.` }]);
  const [draft, setDraft] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [isSending, setIsSending] = useState(false);
  const supportRepository = useMemo(() => hasSupabaseConfig() ? createSupportRepository(createHiringSupabaseClient()) : undefined, []);

  async function sendMessage() {
    const body = draft.trim();
    if (!body || isSending) return;
    const sentAt = Date.now();
    setMessages((current) => [...current, { id: `${sentAt}`, role: "customer", body }]);
    setDraft("");
    setIsSending(true);
    try {
      if (!supportRepository) throw new Error("Support is not configured in this environment.");
      const result = await supportRepository.askQuestion({ message: body, pageTitle, pagePath: diagnostics.page, conversationId: conversationId || undefined });
      setConversationId(result.conversationId);
      setMessages((current) => [...current, { id: `${sentAt}-reply`, role: "assistant", body: result.answer, presentation: result.presentation }]);
    } catch {
      setMessages((current) => [...current, { id: `${sentAt}-error`, role: "assistant", body: "I could not confirm an answer. Please use Report a problem so it can be reviewed." }]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <aside className="support-panel" aria-label="Help and support">
      <div className="support-panel-header">
        <div><img className="support-guide-portrait" src="/illustrations/hiring-evidence-guide.png" alt="" aria-hidden="true" /><div><strong>Hiring Evidence Guide</strong><small>Product help for this page: {pageTitle}</small></div></div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Close help"><X size={18} /></button>
      </div>
      <div className="support-panel-body">
        <section className="support-ai-note"><strong>Practical help for this page</strong><p>The Hiring Evidence Guide uses AI and verified product information to provide guidance. Human support is available when an answer cannot be confirmed. Do not paste candidate names, documents, passwords, tokens, or confidential records.</p></section>
        <div className="support-tips">{help.tips.map((tip) => <p key={tip}>{tip}</p>)}</div>
        <div className="support-conversation" aria-live="polite">
          {messages.map((message) => <div className={`support-message ${message.role}${message.presentation ? " has-guide-card" : ""}`} key={message.id}>
            <p>{message.body}</p>
            {message.presentation?.steps?.length ? <ol className="guide-steps">{message.presentation.steps.map((step, index) => <li key={`${step.title}-${index}`}><span>{index + 1}</span><div><strong>{step.title}</strong><small>{step.detail}</small></div></li>)}</ol> : null}
            {message.presentation?.example ? <div className="guide-example"><span>Example</span><p>{message.presentation.example}</p></div> : null}
            {message.presentation?.action ? <Link className="guide-action" to={message.presentation.action.href}>{message.presentation.action.label}<span aria-hidden="true">→</span></Link> : null}
          </div>)}
          {isSending ? <div className="support-message assistant support-typing" role="status" aria-label="Hiring Evidence Guide is typing"><span /><span /><span /><em>Guide is typing</em></div> : null}
        </div>
        <div className="support-composer"><label htmlFor="support-message">Ask a product question</label><textarea id="support-message" maxLength={2000} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="For example: What should I enter as a job requirement?" rows={2} /><button className="button button-primary" type="button" disabled={isSending || !draft.trim()} onClick={() => void sendMessage()}><Send size={15} /> {isSending ? "Checking guidance" : "Send"}</button></div>
        <div className="support-actions"><button className="button button-secondary" type="button" onClick={() => onStartRequest("problem")}>Report a problem</button><button className="button button-secondary" type="button" onClick={() => onStartRequest("feature")}>Request a feature</button></div>
        <details className="support-diagnostics"><summary>Safe diagnostics preview</summary><dl><div><dt>Page</dt><dd>{diagnostics.page}</dd></div><div><dt>Area</dt><dd>{diagnostics.pageTitle}</dd></div><div><dt>Source</dt><dd>{diagnostics.repositorySource}</dd></div>{diagnostics.workspaceRole ? <div><dt>Role</dt><dd>{diagnostics.workspaceRole}</dd></div> : null}</dl><small>This preview excludes candidate data, documents, tokens, signed links, and logs.</small></details>
      </div>
    </aside>
  );
}
