import NextAuth from "next-auth"
import { NextAuthOptions } from "next-auth"
import FortyTwoProvider from "next-auth/providers/42-school"

export const authOptions: NextAuthOptions = {
    providers: [
        FortyTwoProvider({
            clientId: process.env.FORTY_TWO_CLIENT_ID as string,
            clientSecret: process.env.FORTY_TWO_CLIENT_SECRET as string,
        }),
    ],
    callbacks: {
        async jwt({ token, account, profile }) {
            if (account && profile) {
                token.accessToken = account.access_token
                token.id = (profile as any).id
                token.login = (profile as any).login
                token.image = (profile as any).image?.link
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).login = token.login;
                (session.user as any).image = token.image;
                (session as any).accessToken = token.accessToken;
            }
            return session
        },
    },
    pages: {
        signIn: '/login',
    },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
