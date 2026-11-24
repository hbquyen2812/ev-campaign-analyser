import { redirect } from "next/navigation";

// The Variant lab now lives inside the analyse page as "Compare versions".
export default function VariantLab() {
  redirect("/analyze?mode=compare");
}
