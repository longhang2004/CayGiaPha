"use client";

import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/apiClient";
import { invite, verifyClaim, type ClaimResult } from "@/lib/claim";
import { CGPButton } from "@/components/cgp";

/**
 * Separate owner-invite and signed-in recipient verification modes
 * (task 10.4, Requirements 11.1, 11.2).
 *
 * Field-level errors from the error envelope (wrong/expired code, already
 * claimed, attempts exhausted — 11.3–11.7) are surfaced inline and associated
 * via `aria-describedby`.
 */

interface ClaimFlowProps {
  mode: "invite" | "verify";
  personId: string;
  treeId?: string;
  onInvited?: () => void;
  onClaimed?: (result: ClaimResult) => void;
  inviteAction?: (destination: string) => Promise<void>;
  verifyAction?: (code: string) => Promise<ClaimResult>;
}

export function ClaimFlow({
  mode,
  personId,
  treeId,
  onInvited,
  onClaimed,
  inviteAction,
  verifyAction,
}: ClaimFlowProps) {
  // Invite flow state.
  const [destination, setDestination] = useState("");
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteFieldErrors, setInviteFieldErrors] = useState<Record<string, string>>({});
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  // Claim flow state.
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
      if (!treeId) throw new Error("treeId is required for owner invitations.");
      if (inviteAction) {
        await inviteAction(destination);
      } else {
        await invite(personId, { treeId, destination });
      }
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
      const result = verifyAction
        ? await verifyAction(code)
        : await verifyClaim(personId, { code });
      setClaimedOk(true);
      onClaimed?.(result);
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

  if (mode === "invite") return (
    <section aria-label="Mời người thân xác nhận">
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
        <CGPButton type="submit" isDisabled={inviting}>
          Gửi lời mời
        </CGPButton>
      </form>
    </section>
  );

  return (
    <section aria-label="Xác nhận đây là tôi">
      <form onSubmit={handleClaim} aria-label="Xác nhận bằng mã">
        <h3>Xác nhận đây là tôi</h3>
        {claimError ? (
          <p role="alert" data-testid="claim-error">
            {claimError}
          </p>
        ) : null}
        {claimedOk ? (
          <p role="status" data-testid="claim-success">
            Xác nhận thành công! Hồ sơ đã được liên kết với tài khoản của bạn.
          </p>
        ) : null}
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
        <CGPButton type="submit" isDisabled={claiming}>
          Xác nhận đây là tôi
        </CGPButton>
      </form>
    </section>
  );
}
