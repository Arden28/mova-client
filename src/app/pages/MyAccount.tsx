"use client"

import * as React from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Shield, Bell, UserRound, Globe, LogOut, Trash2, UploadCloud, CheckCircle2 } from "lucide-react"
// import { cn } from "@/lib/utils"

/* ------------------------------- Schémas ------------------------------- */
const profileSchema = z.object({
  firstName: z.string().min(1, "Requis"),
  lastName: z.string().min(1, "Requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().min(5, "Numéro invalide").optional(),
  role: z.string().optional(),
})

const prefsSchema = z.object({
  language: z.string().min(1, "Requis"),
  timezone: z.string().min(1, "Requis"),
  currency: z.string().min(1, "Requis"),
  dateFormat: z.string().min(1, "Requis"),
})

const notifSchema = z.object({
  emailBooking: z.boolean(),
  emailPayment: z.boolean(),
  emailCancellation: z.boolean(),
  smsBooking: z.boolean(),
  smsPayment: z.boolean(),
  smsCancellation: z.boolean(),
})

const securitySchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
  twoFA: z.boolean(),
})

/* ------------------------------ Defaults ------------------------------ */
const defaultProfile = {
  firstName: "Arden",
  lastName: "Bouet",
  email: "arden@example.com",
  phone: "+242060000000",
  role: "Admin",
}

const defaultPrefs = {
  language: "fr",
  timezone: "Africa/Brazzaville",
  currency: "XAF",
  dateFormat: "dd/MM/yyyy",
}

const defaultNotif = {
  emailBooking: true,
  emailPayment: true,
  emailCancellation: true,
  smsBooking: true,
  smsPayment: false,
  smsCancellation: false,
}

const defaultSecurity = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
  twoFA: false,
}

/* ------------------------------ Component ----------------------------- */
export default function MyAccount() {
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null)
  const [sessions] = React.useState<Array<{
    id: string
    device: string
    location: string
    lastActive: string
    current?: boolean
  }>>([
    { id: "s1", device: "Chrome • Windows", location: "Brazzaville, CG", lastActive: "Il y a 2 min", current: true },
    { id: "s2", device: "Safari • iPhone 14", location: "Pointe-Noire, CG", lastActive: "Hier, 18:43" },
  ])

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: defaultProfile,
  })

  const prefsForm = useForm<z.infer<typeof prefsSchema>>({
    resolver: zodResolver(prefsSchema),
    defaultValues: defaultPrefs,
  })

  const notifForm = useForm<z.infer<typeof notifSchema>>({
    resolver: zodResolver(notifSchema),
    defaultValues: defaultNotif,
  })

  const securityForm = useForm<z.infer<typeof securitySchema>>({
    resolver: zodResolver(securitySchema),
    defaultValues: defaultSecurity,
  })

  /* ------------------------------ Handlers ------------------------------ */
  const onSaveProfile = (v: z.infer<typeof profileSchema>) => {
    toast.success("Profil mis à jour")
  }
  const onSavePrefs = (v: z.infer<typeof prefsSchema>) => {
    toast.success("Préférences enregistrées")
  }
  const onSaveNotif = (v: z.infer<typeof notifSchema>) => {
    toast.success("Préférences de notifications enregistrées")
  }
  const onSaveSecurity = (v: z.infer<typeof securitySchema>) => {
    if (v.newPassword && v.newPassword !== v.confirmPassword) {
      toast.error("La confirmation du mot de passe ne correspond pas")
      return
    }
    toast.success("Sécurité mise à jour")
  }

  const onUploadAvatar = (file?: File | null) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setAvatarPreview(url)
    toast.success("Avatar mis à jour")
  }

  const signOutAll = () => {
    toast.info("Toutes les sessions seront déconnectées (simulation).")
  }

  const deleteAccount = () => {
    toast.error("Suppression de compte indisponible en mode démo.")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Mon compte</h1>
        <p className="text-sm text-muted-foreground">
          Gérez votre profil, vos préférences, vos notifications et la sécurité de votre compte.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="flex w-full justify-start overflow-x-auto">
          <TabsTrigger value="profile" className="gap-2"><UserRound className="h-4 w-4" /> Profil</TabsTrigger>
          {/* <TabsTrigger value="prefs" className="gap-2"><Globe className="h-4 w-4" /> Préférences</TabsTrigger> */}
          {/* <TabsTrigger value="notifications" className="gap-2"><Bell className="h-4 w-4" /> Notifications</TabsTrigger> */}
          <TabsTrigger value="security" className="gap-2"><Shield className="h-4 w-4" /> Sécurité</TabsTrigger>
        </TabsList>

        {/* ------------------------------ Profil ------------------------------ */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profil</CardTitle>
              <CardDescription>Vos informations visibles par l’équipe et sur les documents.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative h-24 w-24 overflow-hidden rounded-full ring-1 ring-border">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
                      Aucun avatar
                    </div>
                  )}
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <UploadCloud className="h-4 w-4" />
                  <span>Télécharger</span>
                  <Input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => onUploadAvatar(e.target.files?.[0])}
                  />
                </label>
                {avatarPreview && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Prévisualisation
                  </span>
                )}
              </div>

              {/* Infos */}
              <div className="space-y-3 md:col-span-2">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Prénom</Label>
                    <Input {...profileForm.register("firstName")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom</Label>
                    <Input {...profileForm.register("lastName")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" {...profileForm.register("email")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Téléphone</Label>
                    <Input placeholder="+242..." {...profileForm.register("phone")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Rôle</Label>
                    <Select
                      defaultValue={profileForm.getValues("role") || "Admin"}
                      onValueChange={(v) => profileForm.setValue("role", v, { shouldDirty: true })}
                    >
                      <SelectTrigger><SelectValue placeholder="Sélectionner un rôle" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Admin">Administrateur</SelectItem>
                        <SelectItem value="Manager">Manager</SelectItem>
                        <SelectItem value="Agent">Agent de guichet</SelectItem>
                        <SelectItem value="Driver">Chauffeur</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button onClick={profileForm.handleSubmit(onSaveProfile)}>Enregistrer</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* --------------------------- Préférences --------------------------- */}
        <TabsContent value="prefs">
          <Card>
            <CardHeader>
              <CardTitle>Préférences</CardTitle>
              <CardDescription>Langue, fuseau horaire, devise et format de date.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Langue</Label>
                <Select
                  defaultValue={prefsForm.getValues("language")}
                  onValueChange={(v) => prefsForm.setValue("language", v, { shouldDirty: true })}
                >
                  <SelectTrigger><SelectValue placeholder="Choisir la langue" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="sw">Kiswahili</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fuseau horaire</Label>
                <Select
                  defaultValue={prefsForm.getValues("timezone")}
                  onValueChange={(v) => prefsForm.setValue("timezone", v, { shouldDirty: true })}
                >
                  <SelectTrigger><SelectValue placeholder="Sélectionner un fuseau" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Africa/Brazzaville">Africa/Brazzaville</SelectItem>
                    <SelectItem value="Africa/Douala">Africa/Douala</SelectItem>
                    <SelectItem value="Africa/Kinshasa">Africa/Kinshasa</SelectItem>
                    <SelectItem value="Africa/Nairobi">Africa/Nairobi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Devise</Label>
                <Select
                  defaultValue={prefsForm.getValues("currency")}
                  onValueChange={(v) => prefsForm.setValue("currency", v, { shouldDirty: true })}
                >
                  <SelectTrigger><SelectValue placeholder="Sélectionner une devise" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="XAF">XAF — Franc CFA (BEAC)</SelectItem>
                    <SelectItem value="XOF">XOF — Franc CFA (UEMOA)</SelectItem>
                    <SelectItem value="CDF">CDF — Franc congolais</SelectItem>
                    <SelectItem value="KES">KES — Shilling kényan</SelectItem>
                    <SelectItem value="USD">USD — Dollar US</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Format de date</Label>
                <Select
                  defaultValue={prefsForm.getValues("dateFormat")}
                  onValueChange={(v) => prefsForm.setValue("dateFormat", v, { shouldDirty: true })}
                >
                  <SelectTrigger><SelectValue placeholder="Sélectionner un format" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dd/MM/yyyy">JJ/MM/AAAA</SelectItem>
                    <SelectItem value="MM/dd/yyyy">MM/JJ/AAAA</SelectItem>
                    <SelectItem value="yyyy-MM-dd">AAAA-MM-JJ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button onClick={prefsForm.handleSubmit(onSavePrefs)}>Enregistrer</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* --------------------------- Notifications --------------------------- */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Choisissez comment vous voulez être alerté.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">Réservations</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Email</span>
                    <Switch
                      checked={notifForm.watch("emailBooking")}
                      onCheckedChange={(v) => notifForm.setValue("emailBooking", v)}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">SMS</span>
                    <Switch
                      checked={notifForm.watch("smsBooking")}
                      onCheckedChange={(v) => notifForm.setValue("smsBooking", v)}
                    />
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">Paiements</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Email</span>
                    <Switch
                      checked={notifForm.watch("emailPayment")}
                      onCheckedChange={(v) => notifForm.setValue("emailPayment", v)}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">SMS</span>
                    <Switch
                      checked={notifForm.watch("smsPayment")}
                      onCheckedChange={(v) => notifForm.setValue("smsPayment", v)}
                    />
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">Annulations</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Email</span>
                    <Switch
                      checked={notifForm.watch("emailCancellation")}
                      onCheckedChange={(v) => notifForm.setValue("emailCancellation", v)}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">SMS</span>
                    <Switch
                      checked={notifForm.watch("smsCancellation")}
                      onCheckedChange={(v) => notifForm.setValue("smsCancellation", v)}
                    />
                  </div>
                </div>
              </div>

              <Alert>
                <AlertTitle>Astuce</AlertTitle>
                <AlertDescription>
                  Les SMS nécessitent un fournisseur actif (voir <span className="font-medium">Paramètres &gt; Notifications</span>).
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter className="justify-end">
              <Button onClick={notifForm.handleSubmit(onSaveNotif)}>Enregistrer</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* ------------------------------ Sécurité ------------------------------ */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Sécurité</CardTitle>
              <CardDescription>Protégez votre compte et gérez les sessions actives.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Mot de passe */}
              <section className="grid gap-4 rounded-lg border p-4">
                <p className="text-sm font-medium">Mot de passe</p>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Mot de passe actuel</Label>
                    <Input type="password" placeholder="••••••••" {...securityForm.register("currentPassword")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Nouveau mot de passe</Label>
                    <Input type="password" placeholder="••••••••" {...securityForm.register("newPassword")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirmation</Label>
                    <Input type="password" placeholder="••••••••" {...securityForm.register("confirmPassword")} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" onClick={securityForm.handleSubmit(onSaveSecurity)}>
                    Mettre à jour le mot de passe
                  </Button>
                </div>
              </section>

              {/* 2FA */}
              <section className="grid gap-4 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Double authentification (2FA)</p>
                    <p className="text-xs text-muted-foreground">
                      Renforcez la sécurité via application d’authentification ou SMS.
                    </p>
                  </div>
                  <Switch
                    checked={securityForm.watch("twoFA")}
                    onCheckedChange={(v) => securityForm.setValue("twoFA", v)}
                  />
                </div>
                <Alert>
                  <AlertTitle>Conseil</AlertTitle>
                  <AlertDescription>
                    Nous recommandons d’utiliser une app (ex. Authy, Google Authenticator) plutôt que le SMS.
                  </AlertDescription>
                </Alert>
              </section>

              {/* Sessions actives */}
              <section className="grid gap-4 rounded-lg border p-0">
                <div className="flex items-center justify-between p-4">
                  <p className="text-sm font-medium">Sessions actives</p>
                  <Button size="sm" variant="outline" onClick={signOutAll}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Déconnecter toutes les sessions
                  </Button>
                </div>
                <Separator />
                <ScrollArea className="max-h-64">
                  <ul className="divide-y">
                    {sessions.map((s) => (
                      <li key={s.id} className="flex items-center justify-between p-4">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">{s.device}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.location} • {s.lastActive}
                          </p>
                        </div>
                        {s.current ? (
                          <Badge variant="secondary">Cette session</Badge>
                        ) : (
                          <Button size="sm" variant="ghost">
                            Déconnecter
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </section>

              {/* Danger zone */}
              <section className="grid gap-4 rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-destructive" />
                  <p className="text-sm font-medium">Zone sensible</p>
                </div>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-lg border p-4">
                  <div>
                    <p className="text-sm font-medium">Supprimer le compte</p>
                    <p className="text-xs text-muted-foreground">
                      Action irréversible. Toutes vos données seront effacées.
                    </p>
                  </div>
                  <Button variant="destructive" onClick={deleteAccount}>
                    Supprimer le compte
                  </Button>
                </div>
              </section>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
