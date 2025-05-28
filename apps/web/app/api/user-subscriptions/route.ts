import { db, userSubscriptions } from '@acme/db'
import { eq } from 'drizzle-orm'
import { getSession } from '@acme/better-auth'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get user_id from query params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return new NextResponse('User ID is required', { status: 400 })
    }

    // Verify the requesting user is the same as the user being queried
    if (session.user.id !== userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get user's subscription
    const subscription = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId))
      .limit(1)

    if (!subscription || subscription.length === 0) {
      return new NextResponse('Subscription not found', { status: 404 })
    }

    const userSubscription = subscription[0]

    // Return the subscription with its current status
    return NextResponse.json({
      ...userSubscription,
      hasActiveSubscription: userSubscription.status === 'active'
    })
  } catch (error) {
    console.error('Error fetching user subscription:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}