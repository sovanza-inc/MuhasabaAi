import { NextRequest, NextResponse } from 'next/server'
import { db, questionnaireResponses } from '@acme/db'
import { eq, desc } from 'drizzle-orm'
import { getSession } from '@acme/better-auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

interface FixedAsset {
  name: string
  type: string
  value: number
  purchaseDate: string
  depreciationMethod: string
  usefulLife: number
}

interface Loan {
  purpose: string
  amount: number
  interestRate: number
  monthlyPayment: number
  startDate: string
}

interface OutstandingBalance {
  partyName: string
  type: string
  amount: number
  dueDate: string
  description: string
}

interface QuestionnaireResponseRecord {
  id: string
  workspaceId: string
  userId: string
  responses: {
    productType: string
    cogsCategories: Array<{ type: string; description: string }>
    calculateCogs: boolean
    beginningInventory: number | string
    purchases: number | string
    endingInventory: number | string
    hasFixedAssets: boolean
    fixedAssets: FixedAsset[]
    hasLoans: boolean
    loans: Loan[]
    paymentType: string
    outstandingBalances: OutstandingBalance[]
    isVatRegistered: boolean
    trn: string
    vatFrequency: string
    trackVat: boolean
    businessName: string
    industry: string
    operatingSince: number | string
    documents?: {
      cogsInventory?: string[]
      fixedAssets?: string[]
      accountsPayable?: string[]
      accountsReceivable?: string[]
      loans?: string[]
      vatRegistration?: string[]
    }
  }
  systemPrompt: string
  createdAt?: Date
  updatedAt?: Date
}

// Function to generate a 24-character ID
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 11);
  return (timestamp + randomStr).padEnd(24, '0').slice(0, 24);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const workspaceId = formData.get('workspaceId') as string
    const responsesJson = formData.get('responses') as string
    const responses = JSON.parse(responsesJson)
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

    // Handle file uploads
    const uploadPath = join(process.cwd(), 'public', 'uploads', workspaceId)

    // Ensure upload directory exists
    try {
      await mkdir(uploadPath, { recursive: true })
    } catch (error) {
      console.error('Error creating upload directory:', error)
    }

    // Start with the existing files from the form submission
    const documents = { ...responses.documents }

    // Process new file uploads
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('documents_') && value instanceof File) {
        const documentType = key.split('_')[1]
        const fileName = value.name // Use original filename without timestamp
        const filePath = join(uploadPath, fileName)
        
        const arrayBuffer = await value.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        await writeFile(filePath, uint8Array)
        
        // Only add the file if it's not already in the documents array
        if (!documents[documentType]) {
          documents[documentType] = []
        }
        if (!documents[documentType].includes(fileName)) {
          documents[documentType].push(fileName)
        }
      }
    }

    // Create final response object with the updated documents
    const mergedResponses = {
      ...responses,
      documents
    }

    // Convert numeric values to strings for storage
    const responsesForStorage = {
      ...mergedResponses,
      beginningInventory: mergedResponses.beginningInventory.toString(),
      purchases: mergedResponses.purchases.toString(),
      endingInventory: mergedResponses.endingInventory.toString(),
      operatingSince: mergedResponses.operatingSince.toString(),
      fixedAssets: mergedResponses.fixedAssets.map((asset: FixedAsset) => ({
        ...asset,
        value: asset.value.toString(),
        usefulLife: asset.usefulLife.toString()
      })),
      loans: mergedResponses.loans.map((loan: Loan) => ({
        ...loan,
        amount: loan.amount.toString(),
        interestRate: loan.interestRate.toString(),
        monthlyPayment: loan.monthlyPayment.toString()
      })),
      outstandingBalances: mergedResponses.outstandingBalances.map((balance: OutstandingBalance) => ({
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
      const generatedPrompt = generateSystemPrompt(responsesForStorage)
      await db.update(questionnaireResponses)
        .set({
          responses: responsesForStorage,
          systemPrompt: generatedPrompt,
          updatedAt: new Date(),
        })
        .where(eq(questionnaireResponses.id, existingResponse.id))
    } else {
      // Create new record
      const newId = generateId()
      const generatedPrompt = generateSystemPrompt(responsesForStorage)
      const newRecord = {
        id: newId,
        workspaceId,
        userId: session.user.id,
        responses: responsesForStorage,
        systemPrompt: generatedPrompt,
      }
      await db.insert(questionnaireResponses).values(newRecord)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving questionnaire responses:', error)
    return NextResponse.json(
      { error: 'Failed to save questionnaire responses' },
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

function generateSystemPrompt(responses: QuestionnaireResponseRecord['responses']): string {
  let prompt = `You are an AI bookkeeping assistant for a ${responses.industry} business named "${responses.businessName}" that has been operating since ${responses.operatingSince}.\n\n`

  // Add product/service info
  prompt += `The business ${responses.productType === 'both' ? 'sells both products and services' : `sells ${responses.productType}`}.\n`

  // Add COGS info
  if (responses.calculateCogs) {
    prompt += `COGS is calculated using inventory values with:\n`
    prompt += `- Beginning Inventory: AED ${responses.beginningInventory}\n`
    prompt += `- Purchases: AED ${responses.purchases}\n`
    prompt += `- Ending Inventory: AED ${responses.endingInventory}\n`
    
    if (responses.cogsCategories.length > 0) {
      prompt += `\nCOGS Categories:\n`
      responses.cogsCategories.forEach(category => {
        prompt += `- ${category.type}${category.description ? `: ${category.description}` : ''}\n`
      })
    }
  }

  // Add Fixed Assets info
  if (responses.hasFixedAssets) {
    prompt += `\nFixed Assets:\n`
    responses.fixedAssets.forEach(asset => {
      prompt += `- ${asset.name} (${asset.type}): AED ${asset.value}, purchased on ${asset.purchaseDate}\n`
      prompt += `  Depreciation: ${asset.depreciationMethod} method over ${asset.usefulLife} years\n`
    })
  }

  // Add Loans info
  if (responses.hasLoans) {
    prompt += `\nLoans:\n`
    responses.loans.forEach(loan => {
      prompt += `- ${loan.purpose}: AED ${loan.amount} at ${loan.interestRate}% interest\n`
      prompt += `  Monthly payment: AED ${loan.monthlyPayment}, started on ${loan.startDate}\n`
    })
  }

  // Add VAT info
  if (responses.isVatRegistered) {
    prompt += `\nVAT Registration:\n`
    prompt += `- TRN: ${responses.trn}\n`
    prompt += `- Filing Frequency: ${responses.vatFrequency}\n`
    prompt += `- VAT Tracking: ${responses.trackVat ? 'Enabled' : 'Disabled'}\n`
  }

  // Add Outstanding Balances info
  if (responses.outstandingBalances.length > 0) {
    prompt += `\nOutstanding Balances:\n`
    responses.outstandingBalances.forEach(balance => {
      prompt += `- ${balance.partyName} (${balance.type}): AED ${balance.amount} due on ${balance.dueDate}\n`
      if (balance.description) {
        prompt += `  Description: ${balance.description}\n`
      }
    })
  }

  return prompt
}