import { redirect } from "next/navigation";

export default function ProfilePage() {
  // Redirect to the unified settings page
  redirect("/settings");
}
