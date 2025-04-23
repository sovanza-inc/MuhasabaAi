import { NextRequest, NextResponse } from 'next/server'
import { db, questionnaireResponses } from '@acme/db'
import { eq, desc } from 'drizzle-orm'
import { getSession } from '@acme/better-auth'

interface QuestionnaireResponse {
  workspaceId: string
  responses: {
    productType: string
    cogsCategories: Array<{ type: string; description: string }>
    calculateCogs: boolean
    beginningInventory: number
    purchases: number
    endingInventory: number
    hasFixedAssets: boolean
    fixedAssets: Array<{
      name: string
      type: string
      value: number
      purchaseDate: string
      depreciationMethod: string
      usefulLife: number
    }>
    hasLoans: boolean
    loans: Array<{
      purpose: string
      amount: number
      interestRate: number
      monthlyPayment: number
      startDate: string
    }>
    paymentType: string
    outstandingBalances: Array<{
      partyName: string
      type: string
      amount: number
      dueDate: string
      description: string
    }>
    isVatRegistered: boolean
    trn: string
    vatFrequency: string
    trackVat: boolean
    businessName: string
    industry: string
    operatingSince: number
  }
}

// Function to generate a 24-character ID
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 11);
  return (timestamp + randomStr).padEnd(24, '0').slice(0, 24);
}

export async function POST(request: NextRequest) {
  try {
    const { workspaceId, responses } = (await request.json()) as QuestionnaireResponse
    const session = await getSession()

    if (!workspaceId || !responses) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Generate system prompt based on responses
    const systemPrompt = generateSystemPrompt(responses)

    // Convert numeric values to strings for storage
    const responsesForStorage = {
      ...responses,
      beginningInventory: responses.beginningInventory.toString(),
      purchases: responses.purchases.toString(),
      endingInventory: responses.endingInventory.toString(),
      operatingSince: responses.operatingSince.toString(),
      fixedAssets: responses.fixedAssets.map(asset => ({
        ...asset,
        value: asset.value.toString(),
        usefulLife: asset.usefulLife.toString()
      })),
      loans: responses.loans.map(loan => ({
        ...loan,
        amount: loan.amount.toString(),
        interestRate: loan.interestRate.toString(),
        monthlyPayment: loan.monthlyPayment.toString()
      })),
      outstandingBalances: responses.outstandingBalances.map(balance => ({
        ...balance,
        amount: balance.amount.toString()
      }))
    }

    // Check if a record already exists for this workspace
    const existingResponse = await db.query.questionnaireResponses.findFirst({
      where: eq(questionnaireResponses.workspaceId, workspaceId),
      orderBy: [desc(questionnaireResponses.createdAt)],
    })

    if (existingResponse) {
      // Update existing record
      await db.update(questionnaireResponses)
        .set({
          responses: responsesForStorage,
          systemPrompt,
          updatedAt: new Date(),
        })
        .where(eq(questionnaireResponses.id, existingResponse.id))
    } else {
      // Create new record
      await db.insert(questionnaireResponses).values({
        id: generateId(),
        workspaceId,
        userId: session.user.id,
        responses: responsesForStorage,
        systemPrompt,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving questionnaire responses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Missing workspaceId' },
        { status: 400 }
      )
    }

    // Get responses from database
    const response = await db.query.questionnaireResponses.findFirst({
      where: eq(questionnaireResponses.workspaceId, workspaceId),
      orderBy: [desc(questionnaireResponses.createdAt)],
    })

    if (!response) {
      return NextResponse.json(
        { exists: false },
        { status: 404 }
      )
    }

    return NextResponse.json({ exists: true, data: response })
  } catch (error) {
    console.error('Error fetching questionnaire responses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateSystemPrompt(responses: QuestionnaireResponse['responses']) {
  let prompt = `You are an AI bookkeeping assistant for a ${responses.industry} business named "${responses.businessName}" that has been operating since ${responses.operatingSince}.\n\n`

  // Add product/service info
  prompt += `The business ${responses.productType === 'both' ? 'sells both products and services' : `sells ${responses.productType}`}.\n`

  // Add COGS info
  if (responses.calculateCogs) {
    prompt += `COGS is calculated using inventory values with:\n`
    prompt += `- Beginning Inventory: AED ${responses.beginningInventory}\n`
    prompt += `- Purchases: AED ${responses.purchases}\n`
    prompt += `- Ending Inventory: AED ${responses.endingInventory}\n`
  }

  // Add fixed assets info
  if (responses.hasFixedAssets && responses.fixedAssets.length > 0) {
    prompt += `\nFixed Assets:\n`
    responses.fixedAssets.forEach((asset) => {
      prompt += `- ${asset.name} (${asset.type}): AED ${asset.value}, purchased on ${asset.purchaseDate}, using ${asset.depreciationMethod} depreciation over ${asset.usefulLife} years\n`
    })
  }

  // Add VAT info
  if (responses.isVatRegistered) {
    prompt += `\nVAT Information:\n`
    prompt += `- TRN: ${responses.trn}\n`
    prompt += `- Filing Frequency: ${responses.vatFrequency}\n`
    prompt += `- VAT Tracking: ${responses.trackVat ? 'Required' : 'Not Required'}\n`
  }

  return prompt
}
