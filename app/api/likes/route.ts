import Notification from '@/database/notification.model'
import Post from '@/database/post.model'
import User from '@/database/user.model'
import { getCurrentUserId, unauthorized } from '@/lib/get-current-user'
import { connectToDatabase } from '@/lib/mongoose'
import { NextResponse } from 'next/server'

export async function PUT(req: Request) {
	try {
		const userId = await getCurrentUserId()
		if (!userId) return unauthorized()

		await connectToDatabase()
		const { postId } = await req.json()

		// Only update if this user hasn't liked the post yet (no duplicate likes / notifications)
		const post = await Post.findOneAndUpdate(
			{ _id: postId, likes: { $ne: userId } },
			{ $addToSet: { likes: userId } },
			{ new: true }
		)

		if (post && String(post.user) !== userId) {
			const likedUser = await User.findById(userId)

			await Notification.create({
				user: String(post.user),
				body: `${likedUser.name} liked your post`,
			})

			await User.findOneAndUpdate(
				{ _id: String(post.user) },
				{ $set: { hasNewNotifications: true } }
			)
		}

		return NextResponse.json({ success: true })
	} catch (error) {
		const result = error as Error
		return NextResponse.json({ error: result.message }, { status: 400 })
	}
}

export async function DELETE(req: Request) {
	try {
		const userId = await getCurrentUserId()
		if (!userId) return unauthorized()

		await connectToDatabase()
		const { postId } = await req.json()
		await Post.findByIdAndUpdate(postId, { $pull: { likes: userId } })

		return NextResponse.json({ success: true })
	} catch (error) {
		const result = error as Error
		return NextResponse.json({ error: result.message }, { status: 400 })
	}
}
