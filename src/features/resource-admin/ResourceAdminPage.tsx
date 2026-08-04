import { Activity, Check, Database, RefreshCw, ShieldAlert, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import {
  DEMO_CAMPUS_RESOURCE_PACK,
  invalidateSupportResource,
  readCachedResourcePack,
  verifySupportResource,
  writeCachedResourcePack,
  type ResourcePack,
  type SupportResource
} from "../../domain/resource-pack";
import { appendResourceOperation, LOCAL_RESOURCE_OPERATION_TENANT, readResourceOperations } from "../../domain/resource-operation-store";
import { summarizeResourceHealth, type ResourceOperationKind } from "../../domain/resource-operations";

const localAdmin = { role: "resource-admin" as const, actorId: "local-resource-admin" };

function currentPack() {
  if (typeof window === "undefined") return DEMO_CAMPUS_RESOURCE_PACK;
  return readCachedResourcePack(window.localStorage) || DEMO_CAMPUS_RESOURCE_PACK;
}

export function ResourceAdminPage() {
  const [pack, setPack] = useState<ResourcePack>(currentPack);
  const [selectedId, setSelectedId] = useState(pack.resources[0]?.id || "");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [operations, setOperations] = useState(() => typeof window === "undefined" ? [] : readResourceOperations(window.localStorage));
  const selected = useMemo<SupportResource | undefined>(() => pack.resources.find((resource) => resource.id === selectedId), [pack, selectedId]);
  const health = useMemo(() => summarizeResourceHealth(operations, LOCAL_RESOURCE_OPERATION_TENANT), [operations]);

  function persist(next: ResourcePack, message: string) {
    writeCachedResourcePack(window.localStorage, next);
    setPack(next);
    setMessage(message);
  }

  function recordOperation(resourceId: string, kind: ResourceOperationKind) {
    appendResourceOperation(window.localStorage, { tenantId: LOCAL_RESOURCE_OPERATION_TENANT, resourceId, kind });
    setOperations(readResourceOperations(window.localStorage));
  }

  function publishDemo() {
    persist(DEMO_CAMPUS_RESOURCE_PACK, "Demo campus resource pack published locally.");
    recordOperation(DEMO_CAMPUS_RESOURCE_PACK.resources[0].id, "published");
    setSelectedId(DEMO_CAMPUS_RESOURCE_PACK.resources[0].id);
  }

  function verifySelected() {
    try {
      persist(verifySupportResource(pack, selectedId, localAdmin), "Selected resource manually verified locally.");
      recordOperation(selectedId, "verified");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Verification failed.");
    }
  }

  function invalidateSelected() {
    try {
      persist(invalidateSupportResource(pack, selectedId, reason, localAdmin), "Selected resource marked invalid locally.");
      recordOperation(selectedId, "invalidated");
      setReason("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Invalidation failed.");
    }
  }

  return (
    <div className="page-content resource-admin-page">
      <div className="page-intro">
        <div>
          <span className="eyebrow">LOCAL RESOURCE REVIEW</span>
          <h1>Resource pack review</h1>
          <p>This development-only surface reads and writes resource-pack cache metadata. It cannot read student records, notes, or vault data.</p>
        </div>
      </div>

      <section className="settings-section resource-admin-boundary" role="note">
        <ShieldAlert size={18} />
        <div><strong>Development-only local admin boundary</strong><span>Production builds route away from this page. Real publishing requires authenticated server-side roles and tenant isolation.</span></div>
      </section>

      <section className="settings-section">
        <div className="settings-section-head"><div className="settings-icon"><Database size={18} /></div><div><span className="eyebrow">PACK METADATA</span><h2>{pack.packId}</h2></div></div>
        <div className="ledger-list">
          <div className="ledger-row"><span>Version</span><code>{pack.version}</code></div>
          <div className="ledger-row"><span>Scope</span><strong>{pack.regionScope} / {pack.campusScope}</strong></div>
          <div className="ledger-row"><span>Review owner</span><strong>{pack.verificationOwner}</strong></div>
          <div className="ledger-row"><span>Expires</span><strong>{pack.expiresAt.slice(0, 10)}</strong></div>
        </div>
        <div className="setting-actions"><button className="button button-secondary button-with-icon" type="button" onClick={publishDemo}><Upload size={16} />Publish demo pack locally</button></div>
      </section>

      <section className="settings-section resource-admin-operations" data-testid="resource-operation-health">
        <div className="settings-section-head"><div className="settings-icon"><Activity size={18} /></div><div><span className="eyebrow">LOCAL METADATA ONLY</span><h2>Resource health signals</h2></div></div>
        <p className="resource-admin-operations-copy">Only resource IDs, action kinds, and timestamps are retained locally. Counts remain hidden until five copy or link actions exist for the same resource.</p>
        <div className="resource-admin-health-list">
          {health.length ? health.map((item) => (
            <div className="resource-admin-health-row" key={item.resourceId}>
              <strong>{item.resourceId}</strong>
              <span>{item.sampleCount} qualifying action{item.sampleCount === 1 ? "" : "s"}</span>
              <em>{item.counts ? `link opens: ${item.counts["link-opened"]}; copies: ${item.counts["copy-requested"]}` : "Counts hidden below the five-action minimum."}</em>
            </div>
          )) : <p className="resource-admin-message">No local resource-operation metadata yet.</p>}
        </div>
      </section>

      <section className="settings-section resource-admin-review">
        <div className="settings-section-head"><div className="settings-icon"><RefreshCw size={18} /></div><div><span className="eyebrow">RESOURCE REVIEW</span><h2>Verify or invalidate a cached resource</h2></div></div>
        <label className="input-field"><span>Resource</span><div><select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{pack.resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.label} ({resource.verificationStatus})</option>)}</select></div></label>
        {selected ? <div className="resource-admin-selected"><strong>{selected.description}</strong><span>{selected.kind} | owner: {selected.verificationOwner} | expires: {selected.expiresAt?.slice(0, 10) || "not applicable"}</span></div> : null}
        <label className="input-field"><span>Invalidation reason</span><div><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required before invalidating" /></div></label>
        <div className="setting-actions">
          <button className="button button-secondary button-with-icon" type="button" onClick={verifySelected}><Check size={16} />Mark manually verified</button>
          <button className="button button-danger-outline button-with-icon" type="button" onClick={invalidateSelected}><ShieldAlert size={16} />Mark invalid</button>
        </div>
        {message ? <p className="resource-admin-message" role="status">{message}</p> : null}
      </section>
    </div>
  );
}
