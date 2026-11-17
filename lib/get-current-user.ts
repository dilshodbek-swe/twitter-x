import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from './auth-options'

/**
 * Returns the logged-in user's id from the NextAuth session, or null.
 * API routes must use this instead of trusting a userId sent by the client.
 */
export async function getCurrentUserId(): Promise<string | null> {
	const session = await getServerSession(authOptions)
	const id = session?.currentUser?._id
	return id ? String(id) : null
}

export const unauthorized = () =>
	NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

export const forbidden = () =>
	NextResponse.json({ error: 'Not allowed' }, { status: 403 })
