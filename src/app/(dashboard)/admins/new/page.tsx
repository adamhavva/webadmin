import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { UserForm } from "@/components/users/user-form";
import { cn } from "@/lib/utils";

export default function NewAdminPage() {
  return (
    <div className="flex w-full flex-1 flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admins"
          aria-label="Kembali"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Tambah Admin
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Buat akun administrator baru.
          </p>
        </div>
      </div>

      <UserForm
        mode="create"
        allowedRoles={["ADMIN"]}
        redirectTo="/admins"
      />
    </div>
  );
}