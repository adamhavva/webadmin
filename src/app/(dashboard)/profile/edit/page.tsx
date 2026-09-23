import { ProfileEditForm } from "@/components/profile-edit-form";

export default function ProfileEditPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Profil Saya</h1>
        <p className="text-sm text-muted-foreground">
          Kelola informasi akun Anda.
        </p>
      </div>

      <ProfileEditForm />
    </div>
  );
}