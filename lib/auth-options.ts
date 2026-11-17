import CredentialsProvider from 'next-auth/providers/credentials'
import GitHubProvider from 'next-auth/providers/github'
import GoogleProvider from 'next-auth/providers/google'

import { AuthOptions } from 'next-auth'
import { connectToDatabase } from './mongoose'
import User from '@/database/user.model'
import { compare } from 'bcrypt'

// Extend the Session type to include currentUser
declare module 'next-auth' {
	interface Session {
		currentUser?: {
			_id: string
			email: string
			name: string
			profileImage: string
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			[key: string]: any
		}
	}
}

export const authOptions: AuthOptions = {
	providers: [
		CredentialsProvider({
			name: 'credentials',
			credentials: {
				email: { label: 'Email', type: 'email' },
				password: { label: 'Password', type: 'password' },
			},
			async authorize(credentials) {
				if (!credentials?.email || !credentials?.password) return null

				await connectToDatabase()

				const isExistingUser = await User.findOne({
					email: credentials.email,
				})

				// OAuth-only accounts have no password and can't use credentials login
				if (!isExistingUser || !isExistingUser.password) return null

				const isPasswordValid = await compare(
					credentials.password,
					isExistingUser.password
				)
				if (!isPasswordValid) return null

				return isExistingUser
			},
		}),
		GitHubProvider({
			clientId: process.env.GITHUB_CLIENT_ID!,
			clientSecret: process.env.GITHUB_CLIENT_SECRET!,
		}),
		GoogleProvider({
			clientId: process.env.GOOGLE_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
		}),
	],
	callbacks: {
		async session({ session }) {
			await connectToDatabase()

			// Never expose the password hash — the session is sent to the browser
			let currentUser = await User.findOne({
				email: session.user?.email,
			}).select('-password')

			if (!currentUser) {
				const newUser = await User.create({
					email: session.user?.email,
					name: session.user?.name,
					profileImage: session.user?.image,
				})
				currentUser = await User.findById(newUser._id).select('-password')
			}

			session.currentUser = currentUser
			return session
		},
	},
	session: { strategy: 'jwt' },
	jwt: {
		secret: process.env.NEXTAUTH_JWT_SECRET,
	},
	secret: process.env.NEXTAUTH_SECRET,
}
