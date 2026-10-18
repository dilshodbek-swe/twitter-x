import User from '@/database/user.model'
import { connectToDatabase } from '@/lib/mongoose'
import { registerStep1Schema, registerStep2Schema } from '@/lib/validation'
import { NextResponse } from 'next/server'
import { hash } from 'bcrypt'

export async function POST(req: Request) {
	try {
		await connectToDatabase()
		const { searchParams } = new URL(req.url)
		const step = searchParams.get('step')

		if (step === '1') {
			const parsed = registerStep1Schema.safeParse(await req.json())
			if (!parsed.success) {
				return NextResponse.json({ error: 'Invalid name or email' }, { status: 400 })
			}

			const isExistingUser = await User.findOne({ email: parsed.data.email })

			if (isExistingUser) {
				return NextResponse.json(
					{ error: 'Email already exists' },
					{ status: 400 }
				)
			}

			return NextResponse.json({ success: true })
		}

		if (step === '2') {
			const body = await req.json()
			// Validate everything again — step 1 can be skipped by calling step 2 directly
			const parsed = registerStep1Schema
				.merge(registerStep2Schema)
				.safeParse(body)
			if (!parsed.success) {
				return NextResponse.json(
					{ error: 'Invalid registration data' },
					{ status: 400 }
				)
			}
			const { email, password, username, name } = parsed.data

			if (await User.exists({ email })) {
				return NextResponse.json(
					{ error: 'Email already exists' },
					{ status: 400 }
				)
			}

			if (await User.exists({ username })) {
				return NextResponse.json(
					{ error: 'Username already exists' },
					{ status: 400 }
				)
			}

			const hashedPassword = await hash(password, 10)

			await User.create({
				email,
				password: hashedPassword,
				username,
				name,
			})

			// Don't send the user document back: it contains the password hash
			return NextResponse.json({ success: true })
		}

		return NextResponse.json({ error: 'Invalid step' }, { status: 400 })
	} catch (error) {
		const result = error as Error
		return NextResponse.json({ error: result.message }, { status: 400 })
	}
}
