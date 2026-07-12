"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/app/providers";
import { PersonForm } from "@/components/person/PersonForm";
import {
  AddRelativeForm,
  type PersonOption,
} from "@/components/person/AddRelativeForm";

/**
 * Person management screen: create a person and add relatives (derived or
 * asserted) within the signed-in owner's tree. The tree id comes from the
 * authenticated session (the backend also scopes mutations to the owner's
 * tree). Created persons accumulate locally so they can be selected as
 * relationship endpoints in the add-relative form.
 */
export default function PersonPage() {
  const router = useRouter();
  const { user, loading } = useSession();
  const [created, setCreated] = useState<PersonOption[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin?redirect=/person");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <section>
        <h1>Quản lý người</h1>
        <p>Đang tải…</p>
      </section>
    );
  }

  if (!user || !user.treeId) {
    return (
      <section>
        <h1>Quản lý người</h1>
        <p>Bạn cần tham gia một cây gia phả để quản lý người.</p>
      </section>
    );
  }

  const treeId = user.treeId;

  return (
    <section>
      <h1>Quản lý người</h1>

      <h2>Tạo người mới</h2>
      <PersonForm
        mode="create"
        treeId={treeId}
        persons={created}
        onSuccess={(id) =>
          setCreated((prev) => [...prev, { id, displayName: `Người ${prev.length + 1}`, gender: "male" }])
        }
      />

      {created.length > 0 ? (
        <>
          <h2>Thêm người thân</h2>
          <AddRelativeForm treeId={treeId} persons={created} />
        </>
      ) : null}
    </section>
  );
}
