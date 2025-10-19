import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { verifyPassword } from "@/lib/password"

// Validate input
const CredentialsSchema = z.object({
  phone: z.string().min(5),
  password: z.string().min(6),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 }, // 8h
  trustHost: true,
  providers: [
    Credentials({
      name: "Phone",
      credentials: { phone: {}, password: {} },
      authorize: async (raw) => {
        const parsed = CredentialsSchema.safeParse(raw)
        if (!parsed.success) return null
        const { phone, password } = parsed.data

        const user = await prisma.user.findUnique({ where: { phone } })
        if (!user || !user.passwordHash) return null
        const ok = await verifyPassword(user.passwordHash, password)
        if (!ok) return null

        return { id: user.id, name: user.name, role: user.role }
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = (user as any).role
      }
      return token
    },
    session: async ({ session, token }) => {
      (session as any).role = token.role
      return session
    },
  },
  pages: {
    // we use App Router pages; keep defaults (you already have a login page)
  },
})
