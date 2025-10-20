// src/components/login-form.tsx
import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import useAuth from "@/hooks/useAuth"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const { loginPhone, status } = useAuth()
  const [phone, setPhone] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  const loading = status === "loading"

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await loginPhone(phone.trim(), password)
      // navigation happens in AuthContext after success
    } catch (err: any) {
      setError(err?.message || "Échec de la connexion")
    }
  }

  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={onSubmit} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Connexion à votre compte</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Entrez votre numéro de téléphone ci-dessous pour vous connecter à votre compte
          </p>
        </div>

        <Field>
          <FieldLabel htmlFor="phone">Numéro de téléphone</FieldLabel>
          <Input
            id="phone"
            type="tel"
            placeholder="+242060000000"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            inputMode="tel"
          />
        </Field>

        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
            <a href="#" className="ml-auto text-sm underline-offset-4 hover:underline">
              Mot de passe oublié ?
            </a>
          </div>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </Field>

        {error ? (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <Field>
          <Button type="submit" disabled={loading}>
            {loading ? "Connexion…" : "Se connecter"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
