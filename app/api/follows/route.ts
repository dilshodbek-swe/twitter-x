import Notification from '@/database/notification.model'
import User from '@/database/user.model'
import { getCurrentUserId, unauthorized } from '@/lib/get-current-user'
import { connectToDatabase } from '@/lib/mongoose'
import { NextResponse } from 'next/server'

export async function PUT(req: Request) {
	try {
		const currentUserId = await getCurrentUserId()
		if (!currentUserId) return unauthorized()

		await connectToDatabase()
		const { userId } = await req.json()

		if (String(userId) === currentUserId) {
			return NextResponse.json(
				{ error: "You can't follow yourself" },
				{ status: 400 }
			)
		}

		// Only update if not already following (no duplicates / repeat notifications)
		const followedUser = await User.findOneAndUpdate(
			{ _id: userId, followers: { $ne: currentUserId } },
			{ $addToSet: { followers: currentUserId } }
		)

		await User.findByIdAndUpdate(currentUserId, {
			$addToSet: { following: userId },
		})

		if (followedUser) {
			const follower = await User.findById(currentUserId)

			await Notification.create({
				user: userId,
				body: `${follower.name} started following you.`,
			})

			await User.findOneAndUpdate(
				{ _id: userId },
				{ $set: { hasNewNotifications: true } }
			)
		}

		return NextResponse.json({ message: 'Followed' })
	} catch (error) {
		const result = error as Error
		return NextResponse.json({ error: result.message }, { status: 400 })
	}
}

export async function DELETE(req: Request) {
	try {
		const currentUserId = await getCurrentUserId()
		if (!currentUserId) return unauthorized()

		await connectToDatabase()
		const { userId } = await req.json()

		await User.findByIdAndUpdate(userId, {
			$pull: { followers: currentUserId },
		})

		await User.findByIdAndUpdate(currentUserId, {
			$pull: { following: userId },
		})

		return NextResponse.json({ message: 'Unfollowed' })
	} catch (error) {
		const result = error as Error
		return NextResponse.json({ error: result.message }, { status: 400 })
	}
}

export async function GET(req: Request) {
	try {
		await connectToDatabase()
		const { searchParams } = new URL(req.url)
		const userId = searchParams.get('userId')
		const state = searchParams.get('state')

		const user = await User.findById(userId)
		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 })
		}

		// followers is needed by the client to show Follow / Unfollow
		const publicFields = '_id name username email profileImage followers'
		if (state === 'following') {
			const following = await User.find({ _id: { $in: user.following } }).select(publicFields)
			return NextResponse.json(following)
		} else if (state === 'followers') {
			const followers = await User.find({ _id: { $in: user.followers } }).select(publicFields)
			return NextResponse.json(followers)
		}

		return NextResponse.json({ error: 'Invalid state' }, { status: 400 })
	} catch (error) {
		const result = error as Error
		return NextResponse.json({ error: result.message }, { status: 400 })
	}
}
