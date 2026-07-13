"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/apiClient";
import { CGPCheckbox, CGPDialog } from "@/components/cgp";

interface SubjectNode {
  personId: string;
  treeId: string;
  displayName: string;
  treeName: string;
  claimedAt: string;
}

export interface DataRightsAdapter {
  loadNodes: () => Promise<SubjectNode[]>;
  exportNode: (personId: string) => Promise<unknown>;
  correctionHref: (node: Pick<SubjectNode, "personId" | "treeId">) => string;
  eraseNode: (
    personId: string,
    input: { strategy: "delete" | "anonymize"; deletionStrategy?: "cascade" | "preserve" },
  ) => Promise<void>;
  deleteAccount: (linkedNodeStrategy: "delete" | "anonymize") => Promise<void>;
}

const defaultAdapter: DataRightsAdapter = {
  loadNodes: () => api.get<SubjectNode[]>("/me/nodes"),
  exportNode: (personId) => api.get(`/me/nodes/${personId}/export`),
  correctionHref: (node) => `/tree/${node.treeId}?person=${node.personId}&edit=true`,
  eraseNode: (personId, input) => api.post(`/me/nodes/${personId}/erase`, input),
  deleteAccount: (linkedNodeStrategy) => api.del("/me/account", {
    body: { linkedNodeStrategy },
  }),
};

type NodeAction = "anonymize" | "delete-preserve" | "delete-cascade";

function nodeActionLabel(action: NodeAction): string {
  if (action === "anonymize") return "Ẩn danh dữ liệu, giữ vị trí trong cây";
  if (action === "delete-cascade") return "Xóa node và các node trở thành mồ côi";
  return "Xóa node, giữ kết nối của người thân";
}

export function DataRightsPanel({ adapter = defaultAdapter }: { adapter?: DataRightsAdapter }) {
  const router = useRouter();
  const [nodes, setNodes] = useState<SubjectNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedActions, setSelectedActions] = useState<Record<string, NodeAction>>({});
  const [pendingNode, setPendingNode] = useState<SubjectNode | null>(null);
  const [confirmedNodeAction, setConfirmedNodeAction] = useState(false);
  const [submittingNode, setSubmittingNode] = useState(false);
  const [accountNodeStrategy, setAccountNodeStrategy] = useState<"anonymize" | "delete">("anonymize");
  const [accountConfirmation, setAccountConfirmation] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    let active = true;
    adapter.loadNodes()
      .then((result) => {
        if (active) setNodes(result);
      })
      .catch(() => {
        if (active) setError("Không thể tải các hồ sơ đã liên kết.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [adapter]);

  async function exportNode(node: SubjectNode) {
    setError(null);
    try {
      const data = await adapter.exportNode(node.personId);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `cay-gia-pha-${node.personId}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Không thể xuất dữ liệu lúc này.");
    }
  }

  async function confirmNodeAction() {
    if (!pendingNode || !confirmedNodeAction || submittingNode) return;
    const action = selectedActions[pendingNode.personId] ?? "anonymize";
    setSubmittingNode(true);
    setError(null);
    try {
      await adapter.eraseNode(pendingNode.personId, {
        strategy: action === "anonymize" ? "anonymize" : "delete",
        ...(action === "anonymize"
          ? {}
          : { deletionStrategy: action === "delete-cascade" ? "cascade" : "preserve" }),
      });
      setNodes((current) => current.filter((node) => node.personId !== pendingNode.personId));
      setPendingNode(null);
      setConfirmedNodeAction(false);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Không thể thực hiện yêu cầu.");
    } finally {
      setSubmittingNode(false);
    }
  }

  async function deleteAccount() {
    if (accountConfirmation !== "XÓA TÀI KHOẢN" || deletingAccount) return;
    setDeletingAccount(true);
    setError(null);
    try {
      await adapter.deleteAccount(accountNodeStrategy);
      router.push("/");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Không thể xóa tài khoản lúc này.");
      setDeletingAccount(false);
    }
  }

  const pendingAction = pendingNode
    ? selectedActions[pendingNode.personId] ?? "anonymize"
    : "anonymize";

  return (
    <section className="settings-data-rights" aria-labelledby="data-rights-title">
      <h2 id="data-rights-title">Quyền dữ liệu của bạn</h2>
      <p>
        Tải bản sao, mở hồ sơ để chỉnh sửa, hoặc yêu cầu ẩn danh/xóa những node đã xác nhận là bạn.
      </p>

      {error ? <p role="alert" className="form-error">{error}</p> : null}
      {loading ? <p role="status">Đang tải hồ sơ đã liên kết…</p> : null}
      {!loading && nodes.length === 0 ? (
        <p className="field-hint">Tài khoản này chưa liên kết với node nào trong cây gia phả.</p>
      ) : null}

      <div className="settings-data-rights__nodes">
        {nodes.map((node) => {
          const action = selectedActions[node.personId] ?? "anonymize";
          return (
            <article key={node.personId} className="settings-data-rights__node">
              <div>
                <h3>{node.displayName}</h3>
                <p>{node.treeName}</p>
              </div>
              <div className="settings-data-rights__node-actions">
                <button type="button" className="btn btn-secondary" onClick={() => void exportNode(node)}>
                  Tải dữ liệu JSON
                </button>
                <a className="btn btn-secondary" href={adapter.correctionHref(node)}>
                  Mở hồ sơ để chỉnh sửa
                </a>
                <label>
                  Yêu cầu xóa hoặc ẩn danh
                  <select
                    value={action}
                    onChange={(event) => setSelectedActions((current) => ({
                      ...current,
                      [node.personId]: event.target.value as NodeAction,
                    }))}
                  >
                    <option value="anonymize">Ẩn danh, giữ cấu trúc</option>
                    <option value="delete-preserve">Xóa, giữ kết nối người thân</option>
                    <option value="delete-cascade">Xóa kèm node trở thành mồ côi</option>
                  </select>
                </label>
                <button
                  type="button"
                  className="btn btn-secondary settings-data-rights__danger"
                  onClick={() => {
                    setPendingNode(node);
                    setConfirmedNodeAction(false);
                  }}
                >
                  Xem lại yêu cầu
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="settings-data-rights__account">
        <h3>Xóa tài khoản</h3>
        <p>
          Mọi cây bạn sở hữu và ảnh liên quan sẽ bị xóa. Cây bạn chỉ cộng tác sẽ được giữ lại và
          quyền cộng tác của bạn sẽ bị gỡ.
        </p>
        <label>
          Xử lý node của bạn trong cây do người khác sở hữu
          <select
            value={accountNodeStrategy}
            onChange={(event) => setAccountNodeStrategy(event.target.value as "anonymize" | "delete")}
          >
            <option value="anonymize">Ẩn danh và giữ cấu trúc</option>
            <option value="delete">Xóa và giữ kết nối người thân</option>
          </select>
        </label>
        <label>
          Nhập “XÓA TÀI KHOẢN” để xác nhận
          <input
            type="text"
            value={accountConfirmation}
            onChange={(event) => setAccountConfirmation(event.target.value)}
            autoComplete="off"
          />
        </label>
        <button
          type="button"
          className="btn btn-secondary settings-data-rights__danger"
          disabled={accountConfirmation !== "XÓA TÀI KHOẢN" || deletingAccount}
          onClick={() => void deleteAccount()}
        >
          {deletingAccount ? "Đang xóa…" : "Xóa tài khoản vĩnh viễn"}
        </button>
      </div>

      <CGPDialog
        isOpen={pendingNode !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setPendingNode(null);
            setConfirmedNodeAction(false);
          }
        }}
        title="Xác nhận yêu cầu dữ liệu"
        description={pendingNode ? `${pendingNode.displayName} · ${pendingNode.treeName}` : undefined}
        size="md"
        footer={
          <button
            type="button"
            className="btn btn-primary btn-terracotta"
            disabled={!confirmedNodeAction || submittingNode}
            onClick={() => void confirmNodeAction()}
          >
            {submittingNode ? "Đang thực hiện…" : "Xác nhận yêu cầu"}
          </button>
        }
      >
        <p>{nodeActionLabel(pendingAction)}. Thao tác này không thể hoàn tác.</p>
        <CGPCheckbox isSelected={confirmedNodeAction} onChange={setConfirmedNodeAction}>
          Tôi hiểu hậu quả và muốn tiếp tục.
        </CGPCheckbox>
      </CGPDialog>
    </section>
  );
}
