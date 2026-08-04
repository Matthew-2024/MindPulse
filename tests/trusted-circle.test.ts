import { describe, expect, it } from "vitest";
import {
  createTrustedCircleCheckback,
  createTrustedCircleInvitation,
  invitationStatus,
  revokeTrustedCircleInvitation,
  trustedCircleDraft,
  updateTrustedCircleCheckback
} from "../src/domain/trusted-circle";

const now = "2026-08-04T08:00:00.000Z";
const expiry = "2026-08-06T08:00:00.000Z";

describe("trusted circle consent contract", () => {
  it("requires explicit consent and stores no contact address or imported history", () => {
    expect(() => createTrustedCircleInvitation({ recipientLabel: "室友", scope: "check-in", expiresAt: expiry, consent: false, now })).toThrow("TRUSTED_CIRCLE_CONSENT_REQUIRED");
    const invitation = createTrustedCircleInvitation({ recipientLabel: "室友", scope: "check-in", expiresAt: expiry, consent: true, now });
    expect(invitation.noContactImport).toBe(true);
    expect(Object.keys(invitation)).not.toContain("phone");
    expect(Object.keys(invitation)).not.toContain("history");
    expect(trustedCircleDraft(invitation)).toContain("可以拒绝");
    expect(trustedCircleDraft(invitation)).not.toContain("记录");
  });

  it("keeps scope, expiry, revocation, and check-back states explicit", () => {
    const invitation = createTrustedCircleInvitation({ recipientLabel: "朋友", scope: "company", expiresAt: expiry, consent: true, now });
    const checkback = createTrustedCircleCheckback({ invitation, dueAt: "2026-08-05T08:00:00.000Z", now });
    expect(updateTrustedCircleCheckback([checkback], checkback.id, "completed", "2026-08-05T08:01:00.000Z")[0].status).toBe("completed");
    const revoked = revokeTrustedCircleInvitation([invitation], invitation.id, "2026-08-04T09:00:00.000Z")[0];
    expect(revoked.status).toBe("revoked");
    expect(invitationStatus(invitation, Date.parse("2026-08-07T08:00:00.000Z"))).toBe("expired");
  });

  it("rejects misleading schedules and mutations after expiry", () => {
    const invitation = createTrustedCircleInvitation({ recipientLabel: "同学", scope: "practical", expiresAt: expiry, consent: true, now });
    expect(() => createTrustedCircleCheckback({ invitation, dueAt: "2026-08-07T08:00:00.000Z", now })).toThrow("TRUSTED_CIRCLE_CHECKBACK_OUT_OF_RANGE");
    expect(() => revokeTrustedCircleInvitation([{ ...invitation, status: "expired" }], invitation.id, "2026-08-07T08:00:00.000Z")).toThrow("TRUSTED_CIRCLE_INVITATION_INACTIVE");
  });
});
