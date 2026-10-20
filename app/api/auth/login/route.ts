import User from '@/database/user.model'
import { connectToDatabase } from '@/lib/mongoose'
import { compare } from 'bcrypt'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
	try {
		await connectToDatabase()
		const { email, password } = await req.json()

		if (typeof email !== 'string' || typeof password !== 'string') {
			return NextResponse.json(
				{ error: 'Email and password are required.' },
				{ status: 400 }
			)
		}

		const isExistingUser = await User.findOne({ email })

		if (!isExistingUser) {
			return NextResponse.json(
				{ error: 'Email does not exist.' },
				{ status: 400 }
			)
		}

		// Accounts created with Google/GitHub have no password
		if (!isExistingUser.password) {
			return NextResponse.json(
				{ error: 'This account uses Google or GitHub sign-in.' },
				{ status: 400 }
			)
		}

		const isPasswordValid = await compare(password, isExistingUser.password)

		if (!isPasswordValid) {
			return NextResponse.json(
				{ error: 'Password is incorrect.' },
				{ status: 400 }
			)
		}

		// Don't send the user document back: it contains the password hash
		return NextResponse.json({ success: true })
	} catch (error) {
		const result = error as Error
		return NextResponse.json({ error: result.message }, { status: 400 })
	}
}
