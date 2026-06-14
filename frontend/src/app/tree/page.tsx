"use client";

/**
 * Tree view route. Wires the graph renderer (task 10.2) to the current
 * session's tree. The viewpoint addresses are fetched live from the backend
 * (Requirements 10.1, 10.2).
 *
 * Persons and relationships are held in client state here: there is not yet a
 * list-relationships endpoint, so the renderer is fed from props/state. Person
 * CRUD and loading are owned by task 10.3; this page focuses on the renderer
 * and viewpoint switching and will consume that state once it lands.
 */

import { useState } from "react";
import { useSession } from "@/app/providers";
import { TreeGraph } from "@/components/graph/TreeGraph";
import type { Person, Relationship } from "@/lib/graph";
import "@/components/graph/graph.css";

export default function TreePage() {
  const { user, loading } = useSession();
  // Placeholder client state until task 10.3 wires person/relationship loading.
  const [persons] = useState<Person[]>([]);
  const [relationships] = useState<Relationship[]>([]);

  if (loading) {
    return <p>Đang tải…</p>;
  }

  if (!user?.treeId) {
    return (
      <section>
        <h1>Cây gia phả</h1>
        <p>Bạn cần đăng nhập và có cây gia phả để xem sơ đồ.</p>
      </section>
    );
  }

  if (persons.length === 0) {
    return (
      <section>
        <h1>Cây gia phả</h1>
        <p>Chưa có thành viên nào để hiển thị. Hãy thêm người để bắt đầu.</p>
      </section>
    );
  }

  return (
    <section>
      <h1>Cây gia phả</h1>
      <TreeGraph
        treeId={user.treeId}
        persons={persons}
        relationships={relationships}
      />
    </section>
  );
}
