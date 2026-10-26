'use client'
import { IUser } from '@/types'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { sliceText } from '@/lib/utils'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Button from '../ui/button'
import { useEffect, useState } from 'react'
import axios from 'axios'

interface Props {
	user: IUser
	onChangeFollowing?: (users: IUser[]) => void
	isFollow?: boolean
	following?: IUser[]
}

const User = ({ user, onChangeFollowing, isFollow, following }: Props) => {
	const [isLoading, setIsLoading] = useState(false)
	// @typescript-eslint/no-explicit-any
	const { data: session }: any = useSession()
	const router = useRouter()

	const currentUserId: string | undefined = session?.currentUser?._id
	const [isFollowing, setIsFollowing] = useState(false)

	// The session loads asynchronously, so re-check once it's available
	useEffect(() => {
		setIsFollowing(!!currentUserId && !!user.followers?.includes(currentUserId))
	}, [currentUserId, user.followers])

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const onFollow = async (e?: any) => {
		e?.stopPropagation()
		try {
			setIsLoading(true)
			// The server takes the current user from the session
			await axios.put(`/api/follows`, { userId: user._id })
			setIsFollowing(true)
			onChangeFollowing?.([...(following ?? []), user])
			router.refresh()
		} catch (error) {
			console.log(error)
		} finally {
			setIsLoading(false)
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const onUnfollow = async (e?: any) => {
		e?.stopPropagation()
		try {
			setIsLoading(true)
			await axios.delete(`/api/follows`, { data: { userId: user._id } })
			setIsFollowing(false)
			onChangeFollowing?.((following ?? []).filter(u => u._id !== user._id))
			router.refresh()
		} catch (error) {
			console.log(error)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className='flex justify-between items-center gap-3 cursor-pointer hover:bg-neutral-300/30 hover:bg-opacity-10 transition py-2 px-3 rounded-md'>
			<div className='flex gap-2 cursor-pointer'>
				<Avatar>
					<AvatarImage src={user.profileImage} />
					<AvatarFallback>{user.name[0]}</AvatarFallback>
				</Avatar>

				<div className='flex flex-col'>
					<p className='text-white font-semibold text-sm line-clamp-1'>
						{user.name}
					</p>
					<p className='text-neutral-400 text-sm line-clamp-1'>
						{user.username
							? `@${sliceText(user.username, 16)}`
							: sliceText(user.email, 16)}
					</p>
				</div>
			</div>

			{isFollow && currentUserId && user._id !== currentUserId ? (
				<>
					{isFollowing ? (
						<Button
							label={'Unfollow'}
							outline
							classNames='h-[30px] p-0 w-fit px-3 text-sm'
							disabled={isLoading}
							onClick={onUnfollow}
						/>
					) : (
						<Button
							label={'Follow'}
							outline
							classNames='h-[30px] p-0 w-fit px-3 text-sm'
							disabled={isLoading}
							onClick={onFollow}
						/>
					)}
				</>
			) : null}
		</div>
	)
}

export default User
