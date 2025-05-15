import { NextResponse } from 'next/server'
import { db, questionnaireResponses, eq, desc } from '@acme/db'

export async function GET(
  request: Request,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const { workspaceId } = params

    const response = await db.query.questionnaireResponses.findFirst({
      where: eq(questionnaireResponses.workspaceId, workspaceId),
      orderBy: [desc(questionnaireResponses.updatedAt)],
    })

    if (!response) {
      return NextResponse.json(
        { status: 404 }
      )
    }

    return NextResponse.json({ responses: response.responses })
  } catch (error) {
    console.error('Error fetching questionnaire responses:', error)
    return NextResponse.json(
      { message: 'Failed to fetch questionnaire responses' },
      { status: 500 }
    )
  }
} 