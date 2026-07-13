import { redirect } from "next/navigation";

/** Legacy single-tree entrypoint. Person management now lives in an explicit tree workspace. */
export default function PersonPage() {
  redirect("/tree");
}
