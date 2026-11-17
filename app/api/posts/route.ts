import Comment from '@/database/comment.model'
import Post from '@/database/post.model'
import { forbidden, getCurrentUserId, unauthorized } from '@/lib/get-current-user'
import User from '@/database/user.model'
import { authOptions } from '@/lib/auth-options'
import { connectToDatabase } from '@/lib/mongoose'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
	try {
		const userId = await getCurrentUserId()
		if (!userId) return unauthorized()

		await connectToDatabase()
		const { body } = await req.json()

		if (typeof body !== 'string' || !body.trim()) {
			return NextResponse.json({ error: 'Post is empty' }, { status: 400 })
		}

		const post = await Post.create({ body, user: userId })
		return NextResponse.json(post)
	} catch (error) {
		const result = error as Error
		return NextResponse.json({ error: result.message }, { status: 400 })
	}
}

export async function GET(req: Request) {
	try {
		await connectToDatabase()
		const { searchParams } = new URL(req.url)
		const limit = searchParams.get('limit')

		// @typescript-eslint/no-explicit-any
		const { currentUser }: any = await getServerSession(authOptions)

		const posts = await Post.find({})
			.populate({
				path: 'user',
				model: User,
				select: 'name email profileImage _id username',
			})
			.limit(Number(limit))
			.sort({ createdAt: -1 })

		const filteredPosts = posts.map(post => ({
			_id: post._id,
			body: post.body,
			createdAt: post.createdAt,
			user: {
				name: post.user.name,
				email: post.user.email,
				profileImage: post.user.profileImage,
				_id: post.user._id,
				username: post.user.username,
			},
			likes: post.likes.length,
			comments: post.comments.length,
			hasLiked: post.likes.includes(currentUser._id),
		}))

		return NextResponse.json(filteredPosts)
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

		const post = await Post.findById(postId)
		if (!post) {
			return NextResponse.json({ error: 'Post not found' }, { status: 404 })
		}
		if (String(post.user) !== userId) return forbidden()

		await Comment.deleteMany({ post: post._id })
		await post.deleteOne()

		return NextResponse.json({ message: 'Post deleted successfully' })
	} catch (error) {
		const result = error as Error
		return NextResponse.json({ error: result.message }, { status: 400 })
	}
}
