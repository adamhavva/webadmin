import { UserListPage } from "@/components/users/user-list-page";

export default function UsersPage() {
  return (
    <UserListPage
      title="Management User"
      description="Kelola akun Barista dan Customer"
      basePath="/users"
      roleGroup="managed"
      showRoleFilter
    />
  );
}