import Comment from '@/database/comment.model'
import Post from '@/database/post.model'
import { forbidden, getCurrentUserId, unauthorized } from '@/lib/get-current-user'
import { connectToDatabase } from '@/lib/mongoose'
import { NextResponse } from 'next/server'

export async function DELETE(
	req: Request,
	route: { params: { commentId: string } }
) {
	try {
		const userId = await getCurrentUserId()
		if (!userId) return unauthorized()

		await connectToDatabase()
		const { commentId } = route.params

		const comment = await Comment.findById(commentId)
		if (!comment) {
			return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
		}
		if (String(comment.user) !== userId) return forbidden()

		await comment.deleteOne()
		// Keep the post's comment counter in sync
		await Post.findByIdAndUpdate(comment.post, {
			$pull: { comments: comment._id },
		})

		return NextResponse.json({ message: 'Comment deleted' })
	} catch (error) {
		const result = error as Error
		return NextResponse.json({ error: result.message }, { status: 400 })
	}
}
