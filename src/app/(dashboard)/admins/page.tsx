import { UserListPage } from "@/components/users/user-list-page";

export default function AdminsPage() {
  return (
    <UserListPage
      title="Admin"
      description="Kelola akun administrator sistem"
      basePath="/admins"
      roleGroup="admin"
    />
  );
}