import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  return (
    <form className={cn("flex flex-col gap-6", className)} {...props}>
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
          />
        </Field>

        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
            <a
              href="#"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Mot de passe oublié ?
            </a>
          </div>
          <Input id="password" type="password" required />
        </Field>

        <Field>
          <Button type="submit">Se connecter</Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
