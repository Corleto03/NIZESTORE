import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "client",
      name: "Client Login",
      credentials: {
        correo: { label: "Correo", type: "email" },
        password: { label: "Contraseñassword" }
      },
      async authorize(credentials) {
        if (!credentials?.correo || !credentials?.password) return null;
        const user = await prisma.cliente.findUnique({
          where: { correo: credentials.correo },
          include: {
            cliente_natural: true,
            cliente_juridico: true
          }
        });
        if (!user) return null;
        const isValid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!isValid) return null;
        
        let displayName = "Cliente";
        if (user.cliente_natural) {
          displayName = user.cliente_natural.nombres + " " + user.cliente_natural.apellidos;
        } else if (user.cliente_juridico) {
          displayName = user.cliente_juridico.nombre_comercial || user.cliente_juridico.razon_social;
        }

        return { id: user.id_cliente.toString(), email: user.correo, name: displayName, role: "client" };
      }
    }),
    CredentialsProvider({
      id: "admin",
      name: "Admin Login",
      credentials: {
        correo: { label: "Correo", type: "email" },
        password: { label: "Contraseñassword" }
      },
      async authorize(credentials) {
        if (!credentials?.correo || !credentials?.password) return null;
        const admin = await prisma.administrador.findUnique({ where: { correo: credentials.correo } });
        if (!admin) return null;
        const isValid = await bcrypt.compare(credentials.password, admin.password_hash);
        if (!isValid) return null;
        return { id: admin.id_administrador.toString(), email: admin.correo, name: admin.nombre, role: "admin" };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
};
