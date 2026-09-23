"use client";

import { useParams } from "next/navigation";
import { UserDetailView } from "@/components/users/user-detail-view";

export default function UserDetailPage() {
  const params = useParams();
  const userId = params.id as string;

  return (
    <UserDetailView
      userId={userId}
      basePath="/users"
      backLabel="Kembali ke Daftar Pengguna"
    />
  );
}