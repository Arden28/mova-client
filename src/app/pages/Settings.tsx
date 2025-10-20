"use client"

import * as React from "react"
import { useForm, type FieldValues, type Resolver, type UseFormRegisterReturn } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import { Globe, Mail, CreditCard, Settings2, MapPinned, ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"

/* ------------------------------- Schémas ------------------------------- */
const companySchema = z.object({
  companyName: z.string().min(2, "Champ requis"),
  legalName: z.string().optional(),
  supportEmail: z.string().email("Email invalide"),
  supportPhone: z.string().min(5, "Numéro invalide"),
  country: z.string().min(1, "Champ requis"),
  timezone: z.string().min(1, "Champ requis"),
  currency: z.string().min(1, "Champ requis"),
  address: z.string().optional(),
  logo: z.any().optional(),
})

const notificationsSchema = z.object({
  emailEnabled: z.boolean(),
  emailProvider: z.string().optional(),
  emailFrom: z.string().email("Email invalide").optional(),
  emailApiKey: z.string().optional(),
  smsEnabled: z.boolean(),
  smsProvider: z.string().optional(),
  smsSenderId: z.string().optional(),
  smsApiKey: z.string().optional(),
  notifyOnBooking: z.boolean(),
  notifyOnPayment: z.boolean(),
  notifyOnCancellation: z.boolean(),
})

const paymentsSchema = z.object({
  gateway: z.string().min(1, "Champ requis"),
  mode: z.enum(["test", "live"]),
  currency: z.string().min(1, "Champ requis"),
  taxRate: z.coerce.number().min(0).max(100),
  allowPartial: z.boolean(),
  depositPercent: z.coerce.number().min(0).max(100),
  refundWindowDays: z.coerce.number().min(0).max(365),
  publicKey: z.string().optional(),
  secretKey: z.string().optional(),
})

const bookingSchema = z.object({
  seatHoldMins: z.coerce.number().min(1).max(180),
  autoCancelUnpaidMins: z.coerce.number().min(0).max(1440),
  allowWaitlist: z.boolean(),
  dynamicPricing: z.boolean(),
  baseFarePerKm: z.coerce.number().min(0),
  minFare: z.coerce.number().min(0),
  peakMultiplier: z.coerce.number().min(1),
  weekendMultiplier: z.coerce.number().min(1),
  cancellationFeePercent: z.coerce.number().min(0).max(100),
})

const integrationsSchema = z.object({
  mapboxToken: z.string().optional(),
  sentryDsn: z.string().optional(),
  analyticsId: z.string().optional(),
  webhookUrl: z.string().url("URL invalide").optional(),
  webhookSecret: z.string().optional(),
})

/* ------------------------------- Défauts ------------------------------- */
const defaultCompany = {
  companyName: "Móva Mobility",
  legalName: "Móva Mobility SARL",
  supportEmail: "support@mova-mobility.com",
  supportPhone: "+242060000000",
  country: "CG", // Congo-Brazzaville
  timezone: "Africa/Brazzaville",
  currency: "XAF",
  address: "Brazzaville, République du Congo",
  logo: undefined as File | undefined,
}

const defaultNotifications = {
  emailEnabled: true,
  emailProvider: "resend",
  emailFrom: "no-reply@acmecoaches.com",
  emailApiKey: "",
  smsEnabled: true,
  smsProvider: "africastalking",
  smsSenderId: "ACME",
  smsApiKey: "",
  notifyOnBooking: true,
  notifyOnPayment: true,
  notifyOnCancellation: true,
}

const defaultPayments = {
  gateway: "cash" as const, // par défaut: Espèces
  mode: "test" as const,
  currency: "XAF",
  taxRate: 0,
  allowPartial: true,
  depositPercent: 20,
  refundWindowDays: 7,
  publicKey: "",
  secretKey: "",
}

const defaultBooking = {
  seatHoldMins: 15,
  autoCancelUnpaidMins: 30,
  allowWaitlist: true,
  dynamicPricing: true,
  baseFarePerKm: 12,
  minFare: 150,
  peakMultiplier: 1.3,
  weekendMultiplier: 1.15,
  cancellationFeePercent: 10,
}

const defaultIntegrations = {
  mapboxToken: "",
  sentryDsn: "",
  analyticsId: "",
  webhookUrl: "",
  webhookSecret: "",
}

/* --------------------------------- UI ---------------------------------- */
export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Paramètres</h1>
        <p className="text-sm text-muted-foreground">
          Profil entreprise, notifications, règles de réservation, paiements et intégrations.
        </p>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="flex w-full justify-start overflow-x-auto">
          <TabsTrigger value="company" className="gap-2"><Globe className="h-4 w-4" /> Entreprise</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2"><Mail className="h-4 w-4" /> Notifications</TabsTrigger>
          <TabsTrigger value="payments" className="gap-2"><CreditCard className="h-4 w-4" /> Paiements</TabsTrigger>
          <TabsTrigger value="booking" className="gap-2"><Settings2 className="h-4 w-4" /> Règles</TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2"><MapPinned className="h-4 w-4" /> Intégrations</TabsTrigger>
          <TabsTrigger value="advanced" className="gap-2"><ShieldAlert className="h-4 w-4" /> Avancé</TabsTrigger>
        </TabsList>

        {/* ------------------------------ Entreprise ------------------------------ */}
        <TabsContent value="company">
          <CompanyCard onSaved={() => toast.success("Profil entreprise enregistré")} />
        </TabsContent>

        {/* ---------------------------- Notifications ---------------------------- */}
        <TabsContent value="notifications">
          <NotificationsCard onSaved={() => toast.success("Notifications enregistrées")} />
        </TabsContent>

        {/* -------------------------------- Paiements ---------------------------- */}
        <TabsContent value="payments">
          <PaymentsCard onSaved={() => toast.success("Paramètres de paiement enregistrés")} />
        </TabsContent>

        {/* --------------------------- Règles de réservation ---------------------- */}
        <TabsContent value="booking">
          <BookingCard onSaved={() => toast.success("Règles de réservation enregistrées")} />
        </TabsContent>

        {/* ------------------------------- Intégrations --------------------------- */}
        <TabsContent value="integrations">
          <IntegrationsCard onSaved={() => toast.success("Intégrations enregistrées")} />
        </TabsContent>

        {/* --------------------------------- Avancé -------------------------------- */}
        <TabsContent value="advanced">
          <AdvancedCard />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/* ============================== Sous-composants ============================== */

function CompanyCard({ onSaved }: { onSaved: () => void }) {
  const form = useForm<z.infer<typeof companySchema>>({
    resolver: zodResolver(companySchema),
    defaultValues: defaultCompany,
  })

  function onSubmit(_: z.infer<typeof companySchema>) {
    onSaved()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profil entreprise</CardTitle>
        <CardDescription>Informations de base utilisées sur les réservations, factures et notifications.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="companyName">Nom de l’entreprise</Label>
          <Input id="companyName" {...form.register("companyName")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="legalName">Raison sociale</Label>
          <Input id="legalName" placeholder="Optionnel" {...form.register("legalName")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="supportEmail">Email support</Label>
          <Input id="supportEmail" type="email" {...form.register("supportEmail")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="supportPhone">Téléphone support</Label>
          <Input id="supportPhone" placeholder="+242..." {...form.register("supportPhone")} />
        </div>
        <div className="space-y-2">
          <Label>Pays</Label>
          <Select
            defaultValue={form.getValues("country")}
            onValueChange={(v) => form.setValue("country", v, { shouldDirty: true })}
          >
            <SelectTrigger><SelectValue placeholder="Sélectionner un pays" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="CG">Congo-Brazzaville</SelectItem>
              <SelectItem value="CD">Congo-Kinshasa (RDC)</SelectItem>
              <SelectItem value="CM">Cameroun</SelectItem>
              <SelectItem value="GA">Gabon</SelectItem>
              <SelectItem value="KE">Kenya</SelectItem>
              <SelectItem value="TZ">Tanzanie</SelectItem>
              <SelectItem value="UG">Ouganda</SelectItem>
              <SelectItem value="RW">Rwanda</SelectItem>
              <SelectItem value="BI">Burundi</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Fuseau horaire</Label>
          <Select
            defaultValue={form.getValues("timezone")}
            onValueChange={(v) => form.setValue("timezone", v, { shouldDirty: true })}
          >
            <SelectTrigger><SelectValue placeholder="Sélectionner un fuseau" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Africa/Brazzaville">Africa/Brazzaville</SelectItem>
              <SelectItem value="Africa/Kinshasa">Africa/Kinshasa</SelectItem>
              <SelectItem value="Africa/Douala">Africa/Douala</SelectItem>
              <SelectItem value="Africa/Libreville">Africa/Libreville</SelectItem>
              <SelectItem value="Africa/Nairobi">Africa/Nairobi</SelectItem>
              <SelectItem value="Africa/Kigali">Africa/Kigali</SelectItem>
              <SelectItem value="Africa/Dar_es_Salaam">Africa/Dar es Salaam</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Devise</Label>
          <Select
            defaultValue={form.getValues("currency")}
            onValueChange={(v) => form.setValue("currency", v, { shouldDirty: true })}
          >
            <SelectTrigger><SelectValue placeholder="Sélectionner une devise" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="XAF">XAF - Franc CFA (BEAC)</SelectItem>
              <SelectItem value="XOF">XOF - Franc CFA (UEMOA)</SelectItem>
              <SelectItem value="CDF">CDF - Franc congolais</SelectItem>
              <SelectItem value="KES">KES - Shilling kényan</SelectItem>
              <SelectItem value="TZS">TZS - Shilling tanzanien</SelectItem>
              <SelectItem value="UGX">UGX - Shilling ougandais</SelectItem>
              <SelectItem value="USD">USD - Dollar US</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="address">Adresse</Label>
          <Textarea id="address" rows={3} {...form.register("address")} />
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="logo">Logo</Label>
          <Input id="logo" type="file" accept="image/*" onChange={(e) => form.setValue("logo", e.target.files?.[0])} />
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <div className="text-xs text-muted-foreground">
          Astuce : ces informations s’affichent sur les tickets, emails et reçus.
        </div>
        <Button onClick={form.handleSubmit(() => onSubmit)}>Enregistrer</Button>
      </CardFooter>
    </Card>
  )
}

function NotificationsCard({ onSaved }: { onSaved: () => void }) {
  const form = useForm<z.infer<typeof notificationsSchema>>({
    resolver: zodResolver(notificationsSchema),
    defaultValues: defaultNotifications,
  })

  function onSubmit(_: z.infer<typeof notificationsSchema>) {
    onSaved()
  }

  const emailOn = form.watch("emailEnabled")
  const smsOn = form.watch("smsEnabled")

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>Fournisseurs Email & SMS et événements (Réservation, Paiement, Annulation).</CardDescription>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Email */}
        <section className="grid gap-4 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">Email</h4>
              <p className="text-xs text-muted-foreground">Envoyer confirmations, reçus et alertes.</p>
            </div>
            <Switch checked={emailOn} onCheckedChange={(v) => form.setValue("emailEnabled", v)} />
          </div>

          <div className={cn("grid gap-4 md:grid-cols-3", !emailOn && "opacity-50 pointer-events-none")}>
            <div className="space-y-2">
              <Label>Fournisseur</Label>
              <Select
                defaultValue={form.getValues("emailProvider") || undefined}
                onValueChange={(v) => form.setValue("emailProvider", v, { shouldDirty: true })}
              >
                <SelectTrigger><SelectValue placeholder="Sélectionner un fournisseur" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="resend">Resend</SelectItem>
                  <SelectItem value="sendgrid">SendGrid</SelectItem>
                  <SelectItem value="smtp">SMTP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Adresse d’expédition</Label>
              <Input placeholder="no-reply@domaine.com" {...form.register("emailFrom")} />
            </div>
            <div className="space-y-2">
              <Label>Clé API / Mot de passe</Label>
              <Input type="password" placeholder="••••••••" {...form.register("emailApiKey")} />
            </div>
          </div>
        </section>

        {/* SMS */}
        <section className="grid gap-4 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">SMS</h4>
              <p className="text-xs text-muted-foreground">SMS transactionnels : codes de ticket & OTP.</p>
            </div>
            <Switch checked={smsOn} onCheckedChange={(v) => form.setValue("smsEnabled", v)} />
          </div>

          <div className={cn("grid gap-4 md:grid-cols-3", !smsOn && "opacity-50 pointer-events-none")}>
            <div className="space-y-2">
              <Label>Fournisseur</Label>
              <Select
                defaultValue={form.getValues("smsProvider") || undefined}
                onValueChange={(v) => form.setValue("smsProvider", v, { shouldDirty: true })}
              >
                <SelectTrigger><SelectValue placeholder="Sélectionner un fournisseur" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="africastalking">Africa&apos;s Talking</SelectItem>
                  <SelectItem value="infobip">Infobip</SelectItem>
                  <SelectItem value="twilio">Twilio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ID expéditeur</Label>
              <Input placeholder="Móva" {...form.register("smsSenderId")} />
            </div>
            <div className="space-y-2">
              <Label>Clé API / Jeton</Label>
              <Input type="password" placeholder="••••••••" {...form.register("smsApiKey")} />
            </div>
          </div>
        </section>

        {/* Événements */}
        <section className="grid gap-4 rounded-lg border p-4">
          <h4 className="text-sm font-medium">Événements</h4>
          <div className="grid gap-3 md:grid-cols-3">
            <ToggleRow
              label="À la création d’une réservation"
              checked={form.watch("notifyOnBooking")}
              onCheckedChange={(v) => form.setValue("notifyOnBooking", v)}
            />
            <ToggleRow
              label="À la réception d’un paiement"
              checked={form.watch("notifyOnPayment")}
              onCheckedChange={(v) => form.setValue("notifyOnPayment", v)}
            />
            <ToggleRow
              label="À l’annulation d’une réservation"
              checked={form.watch("notifyOnCancellation")}
              onCheckedChange={(v) => form.setValue("notifyOnCancellation", v)}
            />
          </div>
        </section>
      </CardContent>

      <CardFooter className="justify-end">
        <Button onClick={form.handleSubmit(() => onSubmit)}>Enregistrer</Button>
      </CardFooter>
    </Card>
  )
}

function PaymentsCard({ onSaved }: { onSaved: () => void }) {
  const form = useForm<z.infer<typeof paymentsSchema>>({
    resolver: zodResolver(paymentsSchema) as Resolver<z.infer<typeof paymentsSchema>>,
    defaultValues: defaultPayments,
  })

  function onSubmit(_: z.infer<typeof paymentsSchema>) {
    onSaved()
  }

  const gateway = form.watch("gateway")

  const isCash = gateway === "cash"

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paiements</CardTitle>
        <CardDescription>Passerelles, devise, TVA, délais de remboursement et acomptes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <section className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Passerelle</Label>
            <Select
              defaultValue={form.getValues("gateway")}
              onValueChange={(v) => form.setValue("gateway", v, { shouldDirty: true })}
            >
              <SelectTrigger><SelectValue placeholder="Sélectionner une passerelle" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Espèces (Cash)</SelectItem>
                <SelectItem value="mtn_momo">MTN Mobile Money (MoMo)</SelectItem>
                <SelectItem value="mpesa">M-Pesa (STK Push)</SelectItem>
                <SelectItem value="paystack">Paystack</SelectItem>
                <SelectItem value="flutterwave">Flutterwave</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Mode</Label>
            <Select
              defaultValue={form.getValues("mode")}
              onValueChange={(v) => form.setValue("mode", v as "test" | "live", { shouldDirty: true })}
            >
              <SelectTrigger><SelectValue placeholder="Sélectionner un mode" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="test">Test</SelectItem>
                <SelectItem value="live">Production</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Devise</Label>
            <Select
              defaultValue={form.getValues("currency")}
              onValueChange={(v) => form.setValue("currency", v, { shouldDirty: true })}
            >
              <SelectTrigger><SelectValue placeholder="Sélectionner une devise" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="XAF">XAF</SelectItem>
                <SelectItem value="XOF">XOF</SelectItem>
                <SelectItem value="CDF">CDF</SelectItem>
                <SelectItem value="KES">KES</SelectItem>
                <SelectItem value="TZS">TZS</SelectItem>
                <SelectItem value="UGX">UGX</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clés API (inutiles pour cash) */}
          <div className={cn("space-y-2", isCash && "opacity-50 pointer-events-none")}>
            <Label>Clé publique</Label>
            <Input placeholder={isCash ? "Non requis pour Espèces" : "pk_live_..."} {...form.register("publicKey")} />
          </div>
          <div className={cn("space-y-2", isCash && "opacity-50 pointer-events-none")}>
            <Label>Clé secrète</Label>
            <Input type="password" placeholder={isCash ? "Non requis pour Espèces" : "sk_live_..."} {...form.register("secretKey")} />
          </div>

          <div className="space-y-2">
            <Label>TVA (%)</Label>
            <Input type="number" step="0.01" {...form.register("taxRate", { valueAsNumber: true })} />
          </div>

          <Separator className="md:col-span-3" />

          <div className="flex items-center justify-between md:col-span-3 rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">Autoriser les paiements partiels</p>
              <p className="text-xs text-muted-foreground">Activer les acomptes au paiement.</p>
            </div>
            <Switch checked={form.watch("allowPartial")} onCheckedChange={(v) => form.setValue("allowPartial", v)} />
          </div>

          <div className={cn("grid gap-4 md:grid-cols-3 md:col-span-3", !form.watch("allowPartial") && "opacity-50 pointer-events-none")}>
            <div className="space-y-2">
              <Label>Acompte (%)</Label>
              <Input type="number" step="1" {...form.register("depositPercent", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Délai de remboursement (jours)</Label>
              <Input type="number" step="1" {...form.register("refundWindowDays", { valueAsNumber: true })} />
            </div>
          </div>

          <Alert className="md:col-span-3">
            <AlertTitle>À savoir</AlertTitle>
            <AlertDescription>
              Pour <span className="font-medium">MTN MoMo</span> ou <span className="font-medium">M-Pesa</span>,
              assurez-vous que votre URL de callback est accessible en <b>HTTPS</b> et que vos identifiants sont bien configurés côté serveur.
              Pour la passerelle <b>Espèces</b>, aucun identifiant n’est requis, mais les remboursements en ligne sont désactivés.
            </AlertDescription>
          </Alert>
        </section>
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={form.handleSubmit(() => onSubmit)}>Enregistrer</Button>
      </CardFooter>
    </Card>
  )
}

function BookingCard({ onSaved }: { onSaved: () => void }) {
  const form = useForm<z.infer<typeof bookingSchema>>({
    resolver: zodResolver(bookingSchema) as Resolver<z.infer<typeof bookingSchema>>,
    defaultValues: defaultBooking,
  })

  function onSubmit(_: z.infer<typeof bookingSchema>) {
    onSaved()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Règles de réservation</CardTitle>
        <CardDescription>Blocage des sièges, annulation auto, multiplicateurs et politiques.</CardDescription>
      </CardHeader>

      <CardContent className="grid gap-6 md:grid-cols-2">
        <NumberField label="Blocage de siège (minutes)" reg={form.register("seatHoldMins", { valueAsNumber: true })} />
        <NumberField label="Annuler si impayé après (minutes)" reg={form.register("autoCancelUnpaidMins", { valueAsNumber: true })} />

        <ToggleRow
          label="Activer la liste d’attente"
          checked={form.watch("allowWaitlist")}
          onCheckedChange={(v) => form.setValue("allowWaitlist", v)}
        />
        <ToggleRow
          label="Tarification dynamique"
          checked={form.watch("dynamicPricing")}
          onCheckedChange={(v) => form.setValue("dynamicPricing", v)}
        />

        <Separator className="md:col-span-2" />

        <NumberField label="Tarif de base par km" reg={form.register("baseFarePerKm", { valueAsNumber: true })} />
        <NumberField label="Tarif minimum" reg={form.register("minFare", { valueAsNumber: true })} />
        <NumberField label="Multiplicateur de pointe" reg={form.register("peakMultiplier", { valueAsNumber: true })} />
        <NumberField label="Multiplicateur week-end" reg={form.register("weekendMultiplier", { valueAsNumber: true })} />
        <NumberField label="Frais d’annulation (%)" reg={form.register("cancellationFeePercent", { valueAsNumber: true })} />
      </CardContent>

      <CardFooter className="justify-end">
        <Button onClick={form.handleSubmit(() => onSubmit)}>Enregistrer</Button>
      </CardFooter>
    </Card>
  )
}

function IntegrationsCard({ onSaved }: { onSaved: () => void }) {
  const form = useForm<z.infer<typeof integrationsSchema>>({
    resolver: zodResolver(integrationsSchema),
    defaultValues: defaultIntegrations,
  })

  function onSubmit(_: z.infer<typeof integrationsSchema>) {
    onSaved()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Intégrations</CardTitle>
        <CardDescription>Mapbox, Sentry, analytics et webhooks.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Jeton d’accès Mapbox</Label>
          <Input placeholder="pk.eyJ1Ijo..." {...form.register("mapboxToken")} />
        </div>
        <div className="space-y-2">
          <Label>DSN Sentry</Label>
          <Input placeholder="https://..." {...form.register("sentryDsn")} />
        </div>
        <div className="space-y-2">
          <Label>ID Analytics</Label>
          <Input placeholder="G-XXXXXXX ou autre" {...form.register("analyticsId")} />
        </div>
        <div className="space-y-2">
          <Label>URL de webhook</Label>
          <Input placeholder="https://api.exemple.com/webhooks/paiements" {...form.register("webhookUrl")} />
        </div>
        <div className="space-y-2">
          <Label>Secret de webhook</Label>
          <div className="flex gap-2">
            <Input placeholder="whsec_..." {...form.register("webhookSecret")} />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const s = "whsec_" + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
                      form.setValue("webhookSecret", s, { shouldDirty: true })
                    }}
                  >
                    Générer
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Générer un secret aléatoire</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={form.handleSubmit(() => onSubmit)}>Enregistrer</Button>
      </CardFooter>
    </Card>
  )
}

function AdvancedCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Avancé</CardTitle>
        <CardDescription>Zone sensible & informations d’environnement.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTitle>Environnement</AlertTitle>
          <AlertDescription className="flex items-center gap-2">
            <Badge variant="secondary">Test</Badge>
            Passez en mode <span className="font-medium">production</span> dans Paiements lorsque vous êtes prêt.
          </AlertDescription>
        </Alert>

        <Separator />

        <DangerRow
          title="Réinitialiser les données de démo"
          description="Supprime toutes les réservations, passagers et trajets de démonstration."
          actionLabel="Réinitialiser"
          onConfirm={() => {
            // TODO: API reset
          }}
        />
        <DangerRow
          title="Supprimer l’entreprise"
          description="Action irréversible. Toutes les données seront supprimées définitivement."
          actionLabel="Supprimer"
          destructive
          onConfirm={() => {
            // TODO: API delete
          }}
        />
      </CardContent>
    </Card>
  )
}

/* ------------------------------- Petites briques ------------------------------ */

function ToggleRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

function NumberField<T extends FieldValues>({
  label,
  reg,
}: {
  label: string
  reg: UseFormRegisterReturn<T[keyof T]>
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type="number" step="0.01" {...reg} />
    </div>
  )
}

function DangerRow({
  title,
  description,
  actionLabel,
  destructive,
  onConfirm,
}: {
  title: string
  description: string
  actionLabel: string
  destructive?: boolean
  onConfirm: () => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Button variant={destructive ? "destructive" : "outline"} onClick={onConfirm}>
        {actionLabel}
      </Button>
    </div>
  )
}
