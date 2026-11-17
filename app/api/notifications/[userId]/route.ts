import Notification from '@/database/notification.model'
import User from '@/database/user.model'
import { forbidden, getCurrentUserId, unauthorized } from '@/lib/get-current-user'
import { connectToDatabase } from '@/lib/mongoose'
import { NextResponse } from 'next/server'

export async function GET(req: Request, route: { params: { userId: string } }) {
	try {
		const currentUserId = await getCurrentUserId()
		if (!currentUserId) return unauthorized()

		const { userId } = route.params
		// Users can only read their own notifications
		if (userId !== currentUserId) return forbidden()

		await connectToDatabase()

		const notifications = await Notification.find({ user: userId }).sort({
			createdAt: -1,
		})

		await User.findByIdAndUpdate(userId, {
			$set: { hasNewNotifications: false },
		})

		return NextResponse.json(notifications)
	} catch (error) {
		const result = error as Error
		return NextResponse.json({ error: result.message }, { status: 400 })
	}
}

export async function DELETE(
	req: Request,
	route: { params: { userId: string } }
) {
	try {
		const currentUserId = await getCurrentUserId()
		if (!currentUserId) return unauthorized()

		const { userId } = route.params
		if (userId !== currentUserId) return forbidden()

		await connectToDatabase()

		await Notification.deleteMany({ user: userId })

		await User.findByIdAndUpdate(userId, {
			$set: { hasNewNotifications: false },
		})

		return NextResponse.json({ message: 'Notifications cleared' })
	} catch (error) {
		const result = error as Error
		return NextResponse.json({ error: result.message }, { status: 400 })
	}
}
