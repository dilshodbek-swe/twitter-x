import Comment from '@/database/comment.model'
import Notification from '@/database/notification.model'
import Post from '@/database/post.model'
import User from '@/database/user.model'
import { getCurrentUserId, unauthorized } from '@/lib/get-current-user'
import { connectToDatabase } from '@/lib/mongoose'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
	try {
		const userId = await getCurrentUserId()
		if (!userId) return unauthorized()

		await connectToDatabase()
		const { body, postId } = await req.json()

		if (typeof body !== 'string' || !body.trim()) {
			return NextResponse.json({ error: 'Comment is empty' }, { status: 400 })
		}

		const post = await Post.findById(postId)
		if (!post) {
			return NextResponse.json({ error: 'Post not found' }, { status: 404 })
		}

		const comment = await Comment.create({ body, post: postId, user: userId })
		await Post.findByIdAndUpdate(postId, { $push: { comments: comment._id } })

		if (String(post.user) !== userId) {
			const commentedUser = await User.findById(userId)

			await Notification.create({
				user: String(post.user),
				body: `${commentedUser.name} commented on your post.`,
			})

			await User.findOneAndUpdate(
				{ _id: String(post.user) },
				{ $set: { hasNewNotifications: true } }
			)
		}

		return NextResponse.json(comment)
	} catch (error) {
		const result = error as Error
		return NextResponse.json({ error: result.message }, { status: 400 })
	}
}

// add a like to a comment
export async function PUT(req: Request) {
	try {
		const userId = await getCurrentUserId()
		if (!userId) return unauthorized()

		await connectToDatabase()
		const { commentId } = await req.json()

		// Only update if this user hasn't liked the comment yet
		const comment = await Comment.findOneAndUpdate(
			{ _id: commentId, likes: { $ne: userId } },
			{ $addToSet: { likes: userId } }
		)

		if (comment && String(comment.user) !== userId) {
			await Notification.create({
				user: String(comment.user),
				body: `Someone liked your comment.`,
			})

			await User.findOneAndUpdate(
				{ _id: String(comment.user) },
				{ $set: { hasNewNotifications: true } }
			)
		}

		return NextResponse.json({ message: 'Comment liked' })
	} catch (error) {
		const result = error as Error
		return NextResponse.json({ error: result.message }, { status: 400 })
	}
}

// remove a like from a comment
export async function DELETE(req: Request) {
	try {
		const userId = await getCurrentUserId()
		if (!userId) return unauthorized()

		await connectToDatabase()
		const { commentId } = await req.json()

		await Comment.findByIdAndUpdate(commentId, { $pull: { likes: userId } })

		return NextResponse.json({ message: 'Like removed from comment' })
	} catch (error) {
		const result = error as Error
		return NextResponse.json({ error: result.message }, { status: 400 })
	}
}
