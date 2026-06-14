"use client";

import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/apiClient";
import { invite, verifyClaim } from "@/lib/claim";
import { Button } from "@/components/Button";

/**
 * Node invite + claim-by-code UI (task 10.4, Requirements 11.1, 11.2).
 *
 * Two complementary flows rendered together:
 *   - Invite: the owner enters a phone/email and sends a 15-minute claim code
 *     to an unclaimed node (11.1).
 *   - Claim by code: the recipient enters the identifier the invitation was
 *     sent to plus the code, and the node is linked to their account (11.2).
 *
 * Field-level errors from the error envelope (wrong/expired code, already
 * claimed, attempts exhausted — 11.3–11.7) are surfaced inline and associated
 * via `aria-describedby`.
 */

interface ClaimFlowProps {
  personId: string;
  treeId: string;
  onInvited?: () => void;
  onClaimed?: (personId: string) => void;
}

export function ClaimFlow({ personId, treeId, onInvited, onClaimed }: ClaimFlowProps) {
  // Invite flow state.
  const [destination, setDestination] = useState("");
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteFieldErrors, setInviteFieldErrors] = useState<Record<string, string>>({});
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  // Claim flow state.
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [claimedOk, setClaimedOk] = useState(false);
  const [claimFieldErrors, setClaimFieldErrors] = useState<Record<string, string>>({});
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInviteFieldErrors({});
    setInviteError(null);
    setInviteSent(false);
    setInviting(true);
    try {
      await invite(personId, { treeId, destination });
      setInviteSent(true);
      onInvited?.();
    } catch (error) {
      if (error instanceof ApiError && error.field) {
        setInviteFieldErrors({ [error.field]: error.message });
      } else if (error instanceof ApiError) {
        setInviteError(error.message);
      } else {
        setInviteError("Không thể gửi lời mời. Vui lòng thử lại.");
      }
    } finally {
      setInviting(false);
    }
  }

  async function handleClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setClaimFieldErrors({});
    setClaimError(null);
    setClaimedOk(false);
    setClaiming(true);
    try {
      await verifyClaim(personId, { treeId, identifier, code });
      setClaimedOk(true);
      onClaimed?.(personId);
    } catch (error) {
      if (error instanceof ApiError && error.field) {
        setClaimFieldErrors({ [error.field]: error.message });
      } else if (error instanceof ApiError) {
        setClaimError(error.message);
      } else {
        setClaimError("Không thể xác nhận. Vui lòng thử lại.");
      }
    } finally {
      setClaiming(false);
    }
  }

  return (
    <section aria-label="Mời và xác nhận">
      <form onSubmit={handleInvite} aria-label="Gửi lời mời">
        <h3>Mời người thân xác nhận</h3>
        {inviteError ? (
          <p role="alert" data-testid="invite-error">
            {inviteError}
          </p>
        ) : null}
        {inviteSent ? (
          <p role="status" data-testid="invite-sent">
            Đã gửi mã xác nhận.
          </p>
        ) : null}
        <p>
          <label htmlFor="invite-destination">Số điện thoại hoặc email</label>
          <br />
          <input
            id="invite-destination"
            name="destination"
            type="text"
            value={destination}
            required
            aria-invalid={inviteFieldErrors.destination ? true : undefined}
            aria-describedby={
              inviteFieldErrors.destination ? "invite-destination-error" : undefined
            }
            onChange={(e) => setDestination(e.target.value)}
          />
          {inviteFieldErrors.destination ? (
            <span id="invite-destination-error" role="alert">
              {inviteFieldErrors.destination}
            </span>
          ) : null}
        </p>
        <Button type="submit" disabled={inviting}>
          Gửi lời mời
        </Button>
      </form>

      <form onSubmit={handleClaim} aria-label="Xác nhận bằng mã">
        <h3>Xác nhận node bằng mã</h3>
        {claimError ? (
          <p role="alert" data-testid="claim-error">
            {claimError}
          </p>
        ) : null}
        {claimedOk ? (
          <p role="status" data-testid="claim-success">
            Đã xác nhận node thành công.
          </p>
        ) : null}
        <p>
          <label htmlFor="claim-identifier">Số điện thoại hoặc email</label>
          <br />
          <input
            id="claim-identifier"
            name="identifier"
            type="text"
            value={identifier}
            required
            aria-invalid={claimFieldErrors.identifier ? true : undefined}
            aria-describedby={
              claimFieldErrors.identifier ? "claim-identifier-error" : undefined
            }
            onChange={(e) => setIdentifier(e.target.value)}
          />
          {claimFieldErrors.identifier ? (
            <span id="claim-identifier-error" role="alert">
              {claimFieldErrors.identifier}
            </span>
          ) : null}
        </p>
        <p>
          <label htmlFor="claim-code">Mã xác nhận</label>
          <br />
          <input
            id="claim-code"
            name="code"
            type="text"
            inputMode="numeric"
            value={code}
            required
            aria-invalid={claimFieldErrors.code ? true : undefined}
            aria-describedby={claimFieldErrors.code ? "claim-code-error" : undefined}
            onChange={(e) => setCode(e.target.value)}
          />
          {claimFieldErrors.code ? (
            <span id="claim-code-error" role="alert">
              {claimFieldErrors.code}
            </span>
          ) : null}
        </p>
        <Button type="submit" disabled={claiming}>
          Xác nhận
        </Button>
      </form>
    </section>
  );
}
