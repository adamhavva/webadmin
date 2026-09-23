"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { auth } from "@/lib/firebases/firebase"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type Feedback = {
  type: "error" | "success"
  message: string
}

function getFirebaseErrorMessage(code: string): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Email atau kata sandi salah."
    case "auth/invalid-email":
      return "Format email tidak valid."
    case "auth/user-disabled":
      return "Akun ini telah dinonaktifkan."
    case "auth/too-many-requests":
      return "Terlalu banyak percobaan login. Silakan coba lagi nanti."
    case "auth/network-request-failed":
      return "Koneksi gagal. Periksa jaringan Anda."
    default:
      return "Login gagal. Silakan coba lagi."
  }
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [feedback, setFeedback] = React.useState<Feedback | null>(null)

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (loading) return

    setFeedback(null)
    setLoading(true)

    try {
      // 1. Login Firebase
      const credential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      )

      // 2. Ambil ID token
      const idToken = await credential.user.getIdToken()

      // 3. Tukar ke NextAuth (set session cookie)
      const result = await signIn("credentials", {
        idToken,
        redirect: false,
      })

      // 4. NextAuth menolak → bukan ADMIN / tidak terdaftar / non-aktif
      if (!result || result.error) {
        await signOut(auth).catch(() => { })

        setFeedback({
          type: "error",
          message:
            "Akses ditolak. WebAdmin hanya untuk administrator yang terdaftar.",
        })
        return
      }

      // 5. Sukses
      setFeedback({
        type: "success",
        message: "Login berhasil. Mengalihkan...",
      })

      router.replace("/")
      router.refresh()
    } catch (error: unknown) {
      // Kalau Firebase berhasil tapi langkah berikutnya gagal → bersihkan sesi Firebase
      if (auth.currentUser) {
        await signOut(auth).catch(() => { })
      }

      const code =
        error &&
          typeof error === "object" &&
          "code" in error &&
          typeof (error as { code: unknown }).code === "string"
          ? (error as { code: string }).code
          : ""

      setFeedback({
        type: "error",
        message: getFirebaseErrorMessage(code),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <Card>
        <CardHeader>
          <CardTitle>Masuk ke akun Anda</CardTitle>

          <CardDescription>
            Masukkan email dan kata sandi untuk masuk ke akun Anda
          </CardDescription>
        </CardHeader>

        <CardContent>
          {feedback && (
            <div
              role="alert"
              className={cn(
                "rounded-md px-3 py-2 text-sm",
                feedback.type === "error" &&
                "bg-red-500/10 text-red-600 dark:bg-red-500/15 dark:text-red-400",
                feedback.type === "success" &&
                "bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-400"
              )}
            >
              {feedback.message}
            </div>
          )}
          <br />
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>

                <Input
                  id="email"
                  type="email"
                  placeholder="Masukkan email Anda"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  autoComplete="email"
                  required
                  disabled={loading}
                />
              </Field>

              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">
                    Kata sandi
                  </FieldLabel>

                  <a
                    href="#"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Lupa kata sandi?
                  </a>
                </div>

                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    autoComplete="current-password"
                    placeholder="Masukkan kata sandi"
                    required
                    disabled={loading}
                    className="pr-10"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((current) => !current)
                    }
                    disabled={loading}
                    aria-label={
                      showPassword
                        ? "Sembunyikan kata sandi"
                        : "Tampilkan kata sandi"
                    }
                    className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </Field>



              <Field>
                <Button type="submit" disabled={loading}>
                  {loading ? "Sedang masuk..." : "Masuk"}
                </Button>

                <FieldDescription className="text-center">
                  Belum memiliki akun?{" "}
                  <a
                    href="#"
                    className="underline underline-offset-4"
                  >
                    Hubungi administrator.
                  </a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}