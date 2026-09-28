import React, { useEffect, useRef, useState } from "react";
import { clientShareErrorMessage, createClientReportShare, listClientReportShares, revokeClientReportShare } from "../../services/clientReportShareService";

type ShareList = Awaited<ReturnType<typeof listClientReportShares>>;
export function ClientReportShareControls({ reportId, includeDecision, authorityActive = true }: { reportId: string; includeDecision: boolean; authorityActive?: boolean }) {
  const [shares, setShares] = useState<ShareList>([]);
  const [authorised, setAuthorised] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState<7 | 30>(7);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [createdShareId, setCreatedShareId] = useState("");
  const previousAuthorityActive = useRef(authorityActive);
  useEffect(() => { setAuthorised(false); setLink(""); }, [reportId, includeDecision]);
  useEffect(() => {
    let live = true;
    listClientReportShares(reportId).then((items) => { if (live) setShares(items); }).catch(() => { if (live) setMessage("Sharing is currently unavailable. You can still preview or print this summary."); });
    return () => { live = false; };
  }, [reportId]);
  useEffect(() => {
    if (previousAuthorityActive.current && !authorityActive) {
      setAuthorised(false); setLink(""); setCreatedShareId("");
      setMessage("Sharing authority was revoked. Existing client links were revoked and are unavailable.");
      listClientReportShares(reportId).then(setShares).catch(() => undefined);
    }
    previousAuthorityActive.current = authorityActive;
  }, [authorityActive, reportId]);
  async function create() {
    if (!authorised || busy) return;
    setBusy(true); setMessage(""); setLink("");
    try {
      const result = await createClientReportShare({ reportId, expiresInDays, includeDecision });
      setLink(`${window.location.origin}/shared-report#${encodeURIComponent(result.token)}`);
      setCreatedShareId(result.id);
      setMessage("Link created. Copy it now; this link will not be displayed again after you close the preview. Nothing has been sent.");
      try { setShares(await listClientReportShares(reportId)); } catch { setMessage("Link created. Copy it now. Refresh the preview to load the link-management list. Nothing has been sent."); }
      setAuthorised(false);
    } catch (error) { setMessage(clientShareErrorMessage(error)); }
    finally { setBusy(false); }
  }
  async function revoke(id: string) {
    setBusy(true); setMessage("");
    try {
      await revokeClientReportShare(id);
      setShares((items) => items.map((item) => item.id === id ? { ...item, revokedAt: new Date().toISOString() } : item));
      if (id === createdShareId) setLink("");
      setMessage("Link revoked. New visits can no longer open this summary. Previously saved copies cannot be recalled.");
    } catch { setMessage("Could not revoke this link. Please try again; assume the link remains active until confirmed revoked."); }
    finally { setBusy(false); }
  }
  return <section className="client-share-controls" aria-labelledby="client-share-heading">
    <h3 id="client-share-heading">Create an expiring client link</h3>
    {!authorityActive && <p role="status"><strong>Blocked:</strong> record active candidate sharing authority above before creating a link.</p>}
    <p>Anyone with this link can view the approved summary until it expires or you revoke it. There is no recipient sign-in. Send it only to an authorised recipient. A saved copy cannot be recalled.</p>
    <label><input type="checkbox" checked={authorised} disabled={busy || !authorityActive} onChange={(event) => setAuthorised(event.target.checked)} /> I have reviewed this preview and am authorised to disclose this candidate information.</label>
    <label>Link expiry <select value={expiresInDays} disabled={busy} onChange={(event) => setExpiresInDays(Number(event.target.value) as 7 | 30)}><option value={7}>7 days</option><option value={30}>30 days</option></select></label>
    <button className="button button-primary" type="button" disabled={!authorityActive || !authorised || busy} onClick={create}>Create client link</button>
    {message && <p role="status">{message}</p>}
    {link && <div><label>New share link<input aria-label="New share link" readOnly value={link} onFocus={(event) => event.target.select()} /></label><button type="button" className="button button-secondary" onClick={async () => { try { await navigator.clipboard.writeText(link); setMessage("Link copied. Nothing has been sent."); } catch { setMessage("Select and copy the link above manually."); } }}>Copy link</button></div>}
    {shares.length > 0 && <div><h4>Previously created links</h4><ul>{shares.map((share) => { const unavailable = Boolean(share.revokedAt) || new Date(share.expiresAt).getTime() <= Date.now(); return <li key={share.id}>Created {new Date(share.createdAt).toLocaleString()} · {share.revokedAt ? "Revoked" : unavailable ? "Expired" : `Expires ${new Date(share.expiresAt).toLocaleString()}`} · {share.includeDecision ? "Human decision included" : "Decision excluded"} {!unavailable && <button className="button button-secondary" type="button" disabled={busy} onClick={() => revoke(share.id)}>Revoke link</button>}</li>; })}</ul></div>}
  </section>;
}
