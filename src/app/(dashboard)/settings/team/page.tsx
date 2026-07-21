import { redirect } from "next/navigation";

/** Old URL — Team is a top-level route now. */
export default function TeamSettingsRedirect() {
  redirect("/team");
}
