"use client";

import { HelpNav } from "./HelpNav";
import { HelpSection } from "./HelpSection";
import { useEffect, useState } from "react";
import { searchHelpTopics, CATEGORY_LABELS, type HelpTopicCategory } from "@/content/help/helpTopics";
import { Card } from "@/components/ui/Card";
import { SearchIcon } from "@/components/ui/Icons";
import { trackUxEvent, getUxViewportClass } from "@/lib/analytics/uxEvents";

export function HelpGuide() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<HelpTopicCategory | "all">("all");
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  useEffect(() => {
    trackUxEvent("ux_help_open", {
      flow: "open_help",
      surface: "help",
      viewportClass: getUxViewportClass(),
      accessRole: "unknown",
      outcome: "completed",
    });
  }, []);

  const topics = searchHelpTopics(query, category);

  useEffect(() => {
    const handleHashChange = () => {
      const requested = decodeURIComponent(window.location.hash.slice(1));
      if (!requested) {
        setSelectedTopicId(null);
        return;
      }
      const found = searchHelpTopics("", "all").find(
        (t) => t.id === requested || t.aliases?.includes(requested)
      );
      if (found) {
        setSelectedTopicId(found.id);
        if (requested !== found.id) {
          window.history.replaceState(null, "", `#${found.id}`);
        }
      }
    };

    handleHashChange();

    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("popstate", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handleHashChange);
    };
  }, []);

  useEffect(() => {
    if (selectedTopicId) {
      const timer = setTimeout(() => {
        const heading = document.getElementById(`${selectedTopicId}-heading`);
        if (heading) {
          heading.focus();
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [selectedTopicId]);

  const handleSelectTopic = (id: string) => {
    setSelectedTopicId(id);
    window.history.pushState(null, "", `#${id}`);
  };

  const returnToTask = () => {
    if (window.history.length > 1 && document.referrer.startsWith(window.location.origin)) window.history.back();
    else window.location.assign("/tree");
  };

  const selectedTopic = selectedTopicId ? searchHelpTopics("", "all").find(t => t.id === selectedTopicId) : null;

  return (
    <main className="help-guide" aria-labelledby="help-guide-heading">
      <div className="help-guide__header">
        <h1 id="help-guide-heading" className="help-guide__title">
          Hướng dẫn sử dụng
        </h1>
        <p className="help-guide__desc">
          Hướng dẫn này giải thích các khái niệm và thao tác cốt lõi của ứng dụng
          Cây Gia Phả. Chọn một mục bên dưới để chuyển tới phần tương ứng.
        </p>
        <button type="button" className="btn btn-secondary help-guide__return" onClick={returnToTask}>Quay lại việc đang làm</button>
      </div>

      <Card className="help-guide__nav-card">
        <h2 className="help-guide__nav-title" style={{ marginBottom: "1rem" }}>
          Tra cứu hướng dẫn
        </h2>

        <div className="help-guide__search-bar" style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <div style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }}>
              <SearchIcon size={18} />
            </div>
            <input
              type="text"
              className="input"
              style={{ width: "100%", paddingLeft: "2.5rem" }}
              placeholder="Tìm kiếm hướng dẫn..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Tìm kiếm hướng dẫn"
            />
          </div>
          {(query || category !== "all") && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setQuery(""); setCategory("all"); setSelectedTopicId(null); }}
            >
              Xóa tìm kiếm
            </button>
          )}
        </div>

        <div className="help-guide__categories" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          <button
            type="button"
            className={`btn ${category === "all" ? "btn-primary btn-terracotta" : "btn-secondary"}`}
            onClick={() => setCategory("all")}
          >
            Tất cả
          </button>
          {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
            <button
              key={cat}
              type="button"
              className={`btn ${category === cat ? "btn-primary btn-terracotta" : "btn-secondary"}`}
              onClick={() => setCategory(cat as HelpTopicCategory)}
            >
              {label}
            </button>
          ))}
        </div>

        <HelpNav topics={topics} selectedTopicId={selectedTopicId} onSelectTopic={handleSelectTopic} />
      </Card>

      <div className="help-guide__content">
        {selectedTopic ? (
          <HelpSection topic={selectedTopic} />
        ) : (
          <div className="help-guide__empty-state" style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--color-muted)", background: "var(--color-surface-sunken)", borderRadius: "var(--radius-lg)" }}>
            <p>Chọn một mục lục để xem chi tiết hướng dẫn.</p>
          </div>
        )}
      </div>
    </main>
  );
}
