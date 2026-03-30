import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/adminAuth";

export default function AdminIndexPage() {
  redirect(isAdminRequest() ? "/dag-goy/exams" : "/dag-goy/login");
}
