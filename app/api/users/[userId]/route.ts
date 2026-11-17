import User from '@/database/user.model'
import { forbidden, getCurrentUserId, unauthorized } from '@/lib/get-current-user'
import { connectToDatabase } from '@/lib/mongoose'
import { NextResponse } from 'next/server'

// Only these fields may be changed through this route.
// (Prevents overwriting password, email, followers, etc.)
const IMAGE_FIELDS = ['profileImage', 'coverImage'] as const
const PROFILE_FIELDS = ['name', 'username', 'bio', 'location'] as const

function pick(body: Record<string, unknown>, fields: readonly string[]) {
	const result: Record<string, unknown> = {}
	for (const field of fields) {
		if (typeof body[field] === 'string') result[field] = body[field]
	}
	return result
}

export async function PUT(req: Request, route: { params: { userId: string } }) {
	try {
		const currentUserId = await getCurrentUserId()
		if (!currentUserId) return unauthorized()

		const { userId } = route.params
		// Users can only edit their own profile
		if (userId !== currentUserId) return forbidden()

		await connectToDatabase()
		const body = await req.json()

		const { searchParams } = new URL(req.url)
		const type = searchParams.get('type')

		if (type === 'updateImage') {
			await User.findByIdAndUpdate(userId, pick(body, IMAGE_FIELDS))
			return NextResponse.json({ message: 'User updated successfully' })
		}

		const updates = pick(body, PROFILE_FIELDS)
		const existUser = await User.findById(userId)

		if (updates.username && updates.username !== existUser.username) {
			const usernameExist = await User.exists({ username: updates.username })
			if (usernameExist) {
				return NextResponse.json(
					{ error: 'Username already exists!' },
					{ status: 400 }
				)
			}
		}

		await User.findByIdAndUpdate(userId, updates)
		return NextResponse.json({ message: 'User updated successfully' })
	} catch (error) {
		const result = error as Error
		return NextResponse.json({ error: result.message }, { status: 400 })
	}
}
