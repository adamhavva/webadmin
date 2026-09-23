"use client";

import { useParams } from "next/navigation";
import { UserDetailView } from "@/components/users/user-detail-view";

export default function AdminDetailPage() {
  const params = useParams();
  const userId = params.id as string;

  return (
    <UserDetailView
      userId={userId}
      basePath="/admins"
      backLabel="Kembali ke Daftar Admin"
    />
  );
}