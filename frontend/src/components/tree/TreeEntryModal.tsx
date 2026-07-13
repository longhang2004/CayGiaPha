"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CGPDialog } from "@/components/cgp";

export type TreeEntryMode = "choose" | "create" | "join";
export type TreeEntryResult = { kind: "ready"; treeId: string } | { kind: "pending" };
export interface CreateTreeInput { name: string; region: "Bac" | "Trung" | "Nam"; }

interface TreeEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (input: CreateTreeInput) => Promise<TreeEntryResult>;
  onJoin: (code: string) => Promise<TreeEntryResult>;
  onTreeReady: (treeId: string) => void;
  initialMode?: TreeEntryMode;
  initialOutcome?: "pending";
  initialError?: string;
}

export function TreeEntryModal({
  isOpen,
  onClose,
  onCreate,
  onJoin,
  onTreeReady,
  initialMode = "choose",
  initialOutcome,
  initialError,
}: TreeEntryModalProps) {
  const [mode, setMode] = useState<TreeEntryMode>(initialMode);
  const [name, setName] = useState("");
  const [region, setRegion] = useState<CreateTreeInput["region"]>("Bac");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [outcome, setOutcome] = useState<"pending" | null>(initialOutcome ?? null);
  const errorId = useId();
  const inviteCodeValid = /^[a-z0-9]{6}$/i.test(code.trim());
  const createInputRef = useRef<HTMLInputElement>(null);
  const joinInputRef = useRef<HTMLInputElement>(null);
  const firstChoiceRef = useRef<HTMLButtonElement>(null);
  const previousModeRef = useRef(mode);

  useEffect(() => {
    if (isOpen) return;
    setMode(initialMode);
    setName("");
    setRegion("Bac");
    setCode("");
    setBusy(null);
    setError(initialError ?? null);
    setOutcome(initialOutcome ?? null);
    previousModeRef.current = initialMode;
  }, [initialError, initialMode, initialOutcome, isOpen]);

  useEffect(() => {
    if (!isOpen || previousModeRef.current === mode) return;
    previousModeRef.current = mode;
    if (mode === "create") createInputRef.current?.focus();
    else if (mode === "join") joinInputRef.current?.focus();
    else firstChoiceRef.current?.focus();
  }, [isOpen, mode]);

  const choose = (nextMode: Exclude<TreeEntryMode, "choose">) => {
    setMode(nextMode);
    setError(null);
    setOutcome(null);
  };

  const goBack = () => {
    setMode("choose");
    setError(null);
    setOutcome(null);
  };

  const resolveResult = (result: TreeEntryResult) => {
    if (result.kind === "ready") {
      onTreeReady(result.treeId);
      return;
    }
    setOutcome("pending");
  };

  const submitCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || busy) return;
    setBusy("create");
    setError(null);
    try {
      resolveResult(await onCreate({ name: name.trim(), region }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể tạo cây gia phả.");
    } finally {
      setBusy(null);
    }
  };

  const submitJoin = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedCode = code.trim();
    if (!inviteCodeValid || busy) return;
    setBusy("join");
    setError(null);
    try {
      resolveResult(await onJoin(normalizedCode));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Mã mời không hợp lệ.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <CGPDialog
      isOpen={isOpen}
      onOpenChange={(nextIsOpen) => {
        if (!nextIsOpen) onClose();
      }}
      title="Thêm cây gia phả"
      size="lg"
      className="tree-entry-modal"
    >
        {outcome === "pending" ? (
          <section className="tree-entry-modal__status" role="status">
            <span className="tree-entry-modal__status-icon" aria-hidden="true">✓</span>
            <h3>Đã gửi yêu cầu tham gia</h3>
            <p>Chủ cây sẽ xem xét yêu cầu của bạn. Cây sẽ xuất hiện trong danh sách sau khi được duyệt.</p>
            <button type="button" className="btn btn-primary btn-terracotta" onClick={onClose}>Đóng</button>
          </section>
        ) : mode === "choose" ? (
          <div className="tree-entry-modal__choices">
            <p className="tree-entry-modal__lead">Bạn muốn bắt đầu theo cách nào?</p>
            <button ref={firstChoiceRef} type="button" className="tree-entry-choice" onClick={() => choose("create")}>
              <span className="tree-entry-choice__icon" aria-hidden="true">＋</span>
              <span><strong>Tạo cây mới</strong><small>Bắt đầu ghi lại gia đình từ người đầu tiên.</small></span>
            </button>
            <button type="button" className="tree-entry-choice" onClick={() => choose("join")}>
              <span className="tree-entry-choice__icon" aria-hidden="true">⌁</span>
              <span><strong>Tham gia bằng mã mời</strong><small>Nhập mã 6 ký tự do người thân gửi.</small></span>
            </button>
          </div>
        ) : mode === "create" ? (
          <form className="tree-entry-modal__form" onSubmit={submitCreate}>
            <button type="button" className="tree-entry-modal__back" aria-label="Quay lại" onClick={goBack}>← Quay lại</button>
            <p className="tree-entry-modal__lead">Tạo một không gian mới để bắt đầu ghi lại gia đình.</p>
            <label htmlFor="tree-entry-name">Tên cây gia phả</label>
            <input ref={createInputRef} id="tree-entry-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Gia phả họ Nguyễn" required />
            <label htmlFor="tree-entry-region">Cách xưng hô theo vùng miền</label>
            <select id="tree-entry-region" value={region} onChange={(event) => setRegion(event.target.value as CreateTreeInput["region"])}>
              <option value="Bac">Miền Bắc — Bố, Mẹ</option>
              <option value="Trung">Miền Trung — Ba, Mạ</option>
              <option value="Nam">Miền Nam — Tía, Má</option>
            </select>
            {error ? <p id={errorId} className="field-error" role="alert">{error}</p> : null}
            <button type="submit" className="btn btn-primary btn-terracotta" disabled={!name.trim() || busy !== null}>
              {busy === "create" ? "Đang tạo…" : "Tạo cây gia phả"}
            </button>
          </form>
        ) : (
          <form className="tree-entry-modal__form" onSubmit={submitJoin}>
            <button type="button" className="tree-entry-modal__back" aria-label="Quay lại" onClick={goBack}>← Quay lại</button>
            <p className="tree-entry-modal__lead">Mã mời gồm 6 ký tự và được gửi bởi chủ cây hoặc người thân.</p>
            <label htmlFor="tree-entry-code">Mã mời 6 ký tự</label>
            <input
              ref={joinInputRef}
              id="tree-entry-code"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/[^a-z0-9]/gi, "").slice(0, 6))}
              placeholder="Ví dụ: AB12C3"
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
            />
            {error ? <p id={errorId} className="field-error" role="alert">{error}</p> : null}
            <button type="submit" className="btn btn-primary btn-terracotta" disabled={!inviteCodeValid || busy !== null}>
              {busy === "join" ? "Đang gửi…" : "Gửi yêu cầu tham gia"}
            </button>
          </form>
        )}
    </CGPDialog>
  );
}
