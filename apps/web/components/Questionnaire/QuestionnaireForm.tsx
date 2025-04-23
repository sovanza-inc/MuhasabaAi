'use client'

import React from 'react'
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  Input,
  Radio,
  RadioGroup,
  Stack,
  Text,
  useToast,
  Progress,
  HStack,
  VStack,
  Heading,
  Card,
  CardBody,
  Divider,
  NumberInput,
  NumberInputField,
} from '@chakra-ui/react'
import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'

interface QuestionnaireFormProps {
  onComplete: () => void
  initialData?: FormData
}

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

interface AccountPayable {
  vendorName: string
  amount: number
  dueDate: string
  description: string
  terms: string
}

interface AccountReceivable {
  customerName: string
  amount: number
  dueDate: string
  description: string
  terms: string
}

interface FormData {
  productType: string
  cogsCategories: Array<{ type: string; description: string }>
  calculateCogs: boolean
  beginningInventory: number
  purchases: number
  endingInventory: number
  hasFixedAssets: boolean
  fixedAssets: FixedAsset[]
  hasLoans: boolean
  loans: Loan[]
  hasAccountsPayable: boolean
  accountsPayable: AccountPayable[]
  hasAccountsReceivable: boolean
  accountsReceivable: AccountReceivable[]
  paymentType: string
  outstandingBalances: OutstandingBalance[]
  isVatRegistered: boolean
  trn: string
  vatFrequency: string
  trackVat: boolean
  businessName: string
  industry: string
  operatingSince: number
}

export function QuestionnaireForm({ onComplete, initialData }: QuestionnaireFormProps) {
  const toast = useToast()
  const [workspace] = useCurrentWorkspace()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [currentStep, setCurrentStep] = React.useState(0)

  // Form state
  const [formData, setFormData] = React.useState<FormData>(initialData || {
    productType: '',
    cogsCategories: [{ type: '', description: '' }],
    calculateCogs: false,
    beginningInventory: 0,
    purchases: 0,
    endingInventory: 0,
    hasFixedAssets: false,
    fixedAssets: [{
      name: '',
      type: '',
      value: 0,
      purchaseDate: '',
      depreciationMethod: '',
      usefulLife: 0
    }],
    hasLoans: false,
    loans: [{
      purpose: '',
      amount: 0,
      interestRate: 0,
      monthlyPayment: 0,
      startDate: ''
    }],
    hasAccountsPayable: false,
    accountsPayable: [{
      vendorName: '',
      amount: 0,
      dueDate: '',
      description: '',
      terms: ''
    }],
    hasAccountsReceivable: false,
    accountsReceivable: [{
      customerName: '',
      amount: 0,
      dueDate: '',
      description: '',
      terms: ''
    }],
    paymentType: '',
    outstandingBalances: [{
      partyName: '',
      type: '',
      amount: 0,
      dueDate: '',
      description: ''
    }],
    isVatRegistered: false,
    trn: '',
    vatFrequency: '',
    trackVat: false,
    businessName: '',
    industry: '',
    operatingSince: 0
  })

  const steps = [
    {
      title: 'Business Information',
      description: 'Tell us about your business',
      isComplete: () => formData.businessName && formData.industry && formData.operatingSince > 0,
    },
    {
      title: 'Products & Services',
      description: 'What do you sell?',
      isComplete: () => formData.productType !== '',
    },
    {
      title: 'COGS & Inventory',
      description: 'Cost of goods sold details',
      isComplete: () => {
        if (!formData.calculateCogs) return true
        return formData.cogsCategories[0].type !== ''
      },
    },
    {
      title: 'Fixed Assets',
      description: 'Equipment and property',
      isComplete: () => {
        if (!formData.hasFixedAssets) return true
        return formData.fixedAssets.some(asset => 
          asset.name && 
          asset.type && 
          asset.value > 0 && 
          asset.purchaseDate && 
          asset.depreciationMethod && 
          asset.usefulLife > 0
        )
      },
    },
    {
      title: 'Accounts Payable',
      description: 'Money owed to vendors',
      isComplete: () => {
        if (!formData.hasAccountsPayable) return true
        return formData.accountsPayable.some(payable => 
          payable.vendorName && 
          payable.amount > 0 && 
          payable.dueDate && 
          payable.terms
        )
      },
    },
    {
      title: 'Accounts Receivable',
      description: 'Money owed by customers',
      isComplete: () => {
        if (!formData.hasAccountsReceivable) return true
        return formData.accountsReceivable.some(receivable => 
          receivable.customerName && 
          receivable.amount > 0 && 
          receivable.dueDate && 
          receivable.terms
        )
      },
    },
    {
      title: 'Loans',
      description: 'Business loans and financing',
      isComplete: () => {
        if (!formData.hasLoans) return true
        return formData.loans.some(loan => 
          loan.purpose && 
          loan.amount > 0 && 
          loan.interestRate > 0 && 
          loan.monthlyPayment > 0 && 
          loan.startDate
        )
      },
    },
    {
      title: 'VAT Registration',
      description: 'Tax information',
      isComplete: () => {
        if (!formData.isVatRegistered) return true
        return Boolean(formData.trn && formData.vatFrequency)
      },
    },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate all steps are complete before submitting
    const incompleteSteps = steps.map((step, index) => !step.isComplete() ? index : -1).filter(i => i !== -1)
    if (incompleteSteps.length > 0) {
      toast({
        title: 'Incomplete Steps',
        description: `Please complete step ${incompleteSteps[0] + 1} before submitting.`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      setCurrentStep(incompleteSteps[0])
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/questionnaire', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspaceId: workspace?.id,
          responses: formData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to save questionnaire responses')
      }

      toast({
        title: 'Success',
        description: 'Your responses have been saved successfully.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      })

      onComplete()
    } catch (error: unknown) {
      console.error('Error saving responses:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save your responses. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextStep = () => {
    // Check if current step is complete before moving to next
    if (!steps[currentStep].isComplete()) {
      const stepName = steps[currentStep].title
      toast({
        title: `Incomplete Step: ${stepName}`,
        description: 'Please complete all required fields in this step before continuing.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      return
    }

    // Check if previous steps are complete
    for (let i = 0; i < currentStep; i++) {
      if (!steps[i].isComplete()) {
        toast({
          title: 'Previous Step Incomplete',
          description: `Please complete step ${i + 1} before proceeding.`,
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
        setCurrentStep(i)
        return
      }
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleSubmit(new Event('submit') as any)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <VStack spacing={6} align="stretch">
            <FormControl isRequired>
              <FormLabel>Business Name</FormLabel>
              <Input
                placeholder="Enter your business name"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                size="lg"
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Industry</FormLabel>
              <Input
                placeholder="e.g. Retail, Manufacturing, Services"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                size="lg"
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Operating Since (Year)</FormLabel>
              <NumberInput
                min={1900}
                max={new Date().getFullYear()}
                value={formData.operatingSince || undefined}
                onChange={(_, valueNumber) => setFormData({ ...formData, operatingSince: valueNumber || 0 })}
                size="lg"
              >
                <NumberInputField
                  placeholder="Enter year"
                />
              </NumberInput>
            </FormControl>
          </VStack>
        )

      case 1:
        return (
          <VStack spacing={6} align="stretch">
            <FormControl isRequired>
              <FormLabel>Do you sell physical products or services?</FormLabel>
              <RadioGroup
                value={formData.productType}
                onChange={(value) => setFormData({ ...formData, productType: value })}
              >
                <Stack spacing={4}>
                  <Radio value="products" size="lg">
                    <Text fontSize="lg">Products</Text>
                    <Text fontSize="sm" color="gray.500">Physical items that you sell to customers</Text>
                  </Radio>
                  <Radio value="services" size="lg">
                    <Text fontSize="lg">Services</Text>
                    <Text fontSize="sm" color="gray.500">Professional services or consulting</Text>
                  </Radio>
                  <Radio value="both" size="lg">
                    <Text fontSize="lg">Both</Text>
                    <Text fontSize="sm" color="gray.500">A combination of products and services</Text>
                  </Radio>
                </Stack>
              </RadioGroup>
            </FormControl>
          </VStack>
        )

      case 2:
        return (
          <VStack spacing={6} align="stretch">
            <FormControl>
              <FormLabel>Add your COGS-related expense categories:</FormLabel>
              <VStack spacing={4} align="stretch">
                {formData.cogsCategories.map((category, index) => (
                  <Card key={index} variant="outline">
                    <CardBody>
                      <Stack spacing={4}>
                        <HStack>
                          <FormControl>
                            <FormLabel>Expense Type</FormLabel>
                            <Input
                              placeholder="e.g. Raw Materials, Direct Labor"
                              value={category.type}
                              onChange={(e) => {
                                const newCategories = [...formData.cogsCategories]
                                newCategories[index].type = e.target.value
                                setFormData({ ...formData, cogsCategories: newCategories })
                              }}
                            />
                          </FormControl>
                          <FormControl>
                            <FormLabel>Description</FormLabel>
                            <Input
                              placeholder="Optional description"
                              value={category.description}
                              onChange={(e) => {
                                const newCategories = [...formData.cogsCategories]
                                newCategories[index].description = e.target.value
                                setFormData({ ...formData, cogsCategories: newCategories })
                              }}
                            />
                          </FormControl>
                          {index > 0 && (
                            <Button
                              aria-label="Remove category"
                              onClick={() => {
                                const newCategories = formData.cogsCategories.filter((_, i) => i !== index)
                                setFormData({ ...formData, cogsCategories: newCategories })
                              }}
                              colorScheme="red"
                              variant="ghost"
                              alignSelf="flex-end"
                            >
                              Remove
                            </Button>
                          )}
                        </HStack>
                      </Stack>
                    </CardBody>
                  </Card>
                ))}
              </VStack>
              <Button
                onClick={() => setFormData({
                  ...formData,
                  cogsCategories: [...formData.cogsCategories, { type: '', description: '' }]
                })}
                mt={4}
                size="sm"
                variant="outline"
              >
                + Add Another Category
              </Button>
            </FormControl>

            <Divider my={4} />

            <FormControl>
              <HStack>
                <Checkbox
                  isChecked={formData.calculateCogs}
                  onChange={(e) => setFormData({ ...formData, calculateCogs: e.target.checked })}
                  size="lg"
                >
                  Calculate COGS using inventory values
                </Checkbox>
              </HStack>

              {formData.calculateCogs && (
                <Card mt={4} variant="outline">
                  <CardBody>
                    <Stack spacing={4}>
                      <FormControl>
                        <FormLabel>Beginning Inventory (AED)</FormLabel>
                        <NumberInput
                          min={0}
                          value={formData.beginningInventory || undefined}
                          onChange={(_, valueNumber) => setFormData({ ...formData, beginningInventory: valueNumber || 0 })}
                        >
                          <NumberInputField placeholder="Enter amount" />
                        </NumberInput>
                      </FormControl>
                      <FormControl>
                        <FormLabel>Purchases (AED)</FormLabel>
                        <NumberInput
                          min={0}
                          value={formData.purchases || undefined}
                          onChange={(_, valueNumber) => setFormData({ ...formData, purchases: valueNumber || 0 })}
                        >
                          <NumberInputField placeholder="Enter amount" />
                        </NumberInput>
                      </FormControl>
                      <FormControl>
                        <FormLabel>Ending Inventory (AED)</FormLabel>
                        <NumberInput
                          min={0}
                          value={formData.endingInventory || undefined}
                          onChange={(_, valueNumber) => setFormData({ ...formData, endingInventory: valueNumber || 0 })}
                        >
                          <NumberInputField placeholder="Enter amount" />
                        </NumberInput>
                      </FormControl>
                    </Stack>
                  </CardBody>
                </Card>
              )}
            </FormControl>
          </VStack>
        )

      case 3:
        return (
          <VStack spacing={6} align="stretch">
            <FormControl>
              <HStack>
                <Checkbox
                  isChecked={formData.hasFixedAssets}
                  onChange={(e) => setFormData({ ...formData, hasFixedAssets: e.target.checked })}
                  size="lg"
                >
                  Do you have any fixed assets like equipment or vehicles?
                </Checkbox>
              </HStack>

              {formData.hasFixedAssets && (
                <VStack spacing={4} mt={4} align="stretch">
                  {formData.fixedAssets.map((asset, index) => (
                    <Card key={index} variant="outline">
                      <CardBody>
                        <Stack spacing={4}>
                          <FormControl>
                            <FormLabel>Asset Name</FormLabel>
                            <Input
                              placeholder="e.g. Delivery Van, Office Equipment"
                              value={asset.name}
                              onChange={(e) => {
                                const newAssets = [...formData.fixedAssets]
                                newAssets[index] = { ...asset, name: e.target.value }
                                setFormData({ ...formData, fixedAssets: newAssets })
                              }}
                            />
                          </FormControl>

                          <FormControl>
                            <FormLabel>Asset Type</FormLabel>
                            <RadioGroup
                              value={asset.type}
                              onChange={(value) => {
                                const newAssets = [...formData.fixedAssets]
                                newAssets[index] = { ...asset, type: value }
                                setFormData({ ...formData, fixedAssets: newAssets })
                              }}
                            >
                              <Stack direction="row" spacing={4}>
                                <Radio value="equipment">Equipment</Radio>
                                <Radio value="vehicle">Vehicle</Radio>
                                <Radio value="furniture">Furniture</Radio>
                                <Radio value="other">Other</Radio>
                              </Stack>
                            </RadioGroup>
                          </FormControl>

                          <HStack spacing={4}>
                            <FormControl>
                              <FormLabel>Purchase Value (AED)</FormLabel>
                              <NumberInput
                                min={0}
                                value={asset.value || undefined}
                                onChange={(_, valueNumber) => {
                                  const newAssets = [...formData.fixedAssets]
                                  newAssets[index] = { ...asset, value: valueNumber || 0 }
                                  setFormData({ ...formData, fixedAssets: newAssets })
                                }}
                              >
                                <NumberInputField placeholder="Enter amount" />
                              </NumberInput>
                            </FormControl>

                            <FormControl>
                              <FormLabel>Purchase Date</FormLabel>
                              <Input
                                type="date"
                                value={asset.purchaseDate}
                                onChange={(e) => {
                                  const newAssets = [...formData.fixedAssets]
                                  newAssets[index] = { ...asset, purchaseDate: e.target.value }
                                  setFormData({ ...formData, fixedAssets: newAssets })
                                }}
                              />
                            </FormControl>
                          </HStack>

                          <HStack spacing={4}>
                            <FormControl>
                              <FormLabel>Depreciation Method</FormLabel>
                              <RadioGroup
                                value={asset.depreciationMethod}
                                onChange={(value) => {
                                  const newAssets = [...formData.fixedAssets]
                                  newAssets[index] = { ...asset, depreciationMethod: value }
                                  setFormData({ ...formData, fixedAssets: newAssets })
                                }}
                              >
                                <Stack direction="row" spacing={4}>
                                  <Radio value="straight-line">Straight-line</Radio>
                                  <Radio value="declining-balance">Declining balance</Radio>
                                </Stack>
                              </RadioGroup>
                            </FormControl>

                            <FormControl>
                              <FormLabel>Useful Life (Years)</FormLabel>
                              <NumberInput
                                min={0}
                                value={asset.usefulLife || undefined}
                                onChange={(_, valueNumber) => {
                                  const newAssets = [...formData.fixedAssets]
                                  newAssets[index] = { ...asset, usefulLife: valueNumber || 0 }
                                  setFormData({ ...formData, fixedAssets: newAssets })
                                }}
                              >
                                <NumberInputField placeholder="Enter years" />
                              </NumberInput>
                            </FormControl>
                          </HStack>

                          {index > 0 && (
                            <Button
                              aria-label="Remove asset"
                              onClick={() => {
                                const newAssets = formData.fixedAssets.filter((_, i) => i !== index)
                                setFormData({ ...formData, fixedAssets: newAssets })
                              }}
                              colorScheme="red"
                              variant="ghost"
                              alignSelf="flex-end"
                            >
                              Remove
                            </Button>
                          )}
                        </Stack>
                      </CardBody>
                    </Card>
                  ))}

                  <Button
                    onClick={() => setFormData({
                      ...formData,
                      fixedAssets: [...formData.fixedAssets, {
                        name: '',
                        type: '',
                        value: 0,
                        purchaseDate: '',
                        depreciationMethod: '',
                        usefulLife: 0
                      }]
                    })}
                    size="sm"
                    variant="outline"
                  >
                    + Add Another Asset
                  </Button>
                </VStack>
              )}
            </FormControl>
          </VStack>
        )

      case 4:
        return (
          <VStack spacing={6} align="stretch">
            <FormControl>
              <HStack>
                <Checkbox
                  isChecked={formData.hasAccountsPayable}
                  onChange={(e) => setFormData({ ...formData, hasAccountsPayable: e.target.checked })}
                  size="lg"
                >
                  Do you have accounts payable?
                </Checkbox>
              </HStack>

              {formData.hasAccountsPayable && (
                <Card mt={4} variant="outline">
                  <CardBody>
                    <Stack spacing={4}>
                      {formData.accountsPayable.map((payable, index) => (
                        <Card key={index} variant="outline">
                          <CardBody>
                            <Stack spacing={4}>
                              <FormControl>
                                <FormLabel>Vendor Name</FormLabel>
                                <Input
                                  placeholder="Enter vendor name"
                                  value={payable.vendorName}
                                  onChange={(e) => {
                                    const newPayables = [...formData.accountsPayable]
                                    newPayables[index] = { ...payable, vendorName: e.target.value }
                                    setFormData({ ...formData, accountsPayable: newPayables })
                                  }}
                                />
                              </FormControl>
                              <FormControl>
                                <FormLabel>Amount</FormLabel>
                                <NumberInput
                                  min={0}
                                  value={payable.amount || undefined}
                                  onChange={(_, valueNumber) => {
                                    const newPayables = [...formData.accountsPayable]
                                    newPayables[index] = { ...payable, amount: valueNumber || 0 }
                                    setFormData({ ...formData, accountsPayable: newPayables })
                                  }}
                                >
                                  <NumberInputField placeholder="Enter amount" />
                                </NumberInput>
                              </FormControl>
                              <FormControl>
                                <FormLabel>Due Date</FormLabel>
                                <Input
                                  type="date"
                                  value={payable.dueDate}
                                  onChange={(e) => {
                                    const newPayables = [...formData.accountsPayable]
                                    newPayables[index] = { ...payable, dueDate: e.target.value }
                                    setFormData({ ...formData, accountsPayable: newPayables })
                                  }}
                                />
                              </FormControl>
                              <FormControl>
                                <FormLabel>Description</FormLabel>
                                <Input
                                  placeholder="Enter description"
                                  value={payable.description}
                                  onChange={(e) => {
                                    const newPayables = [...formData.accountsPayable]
                                    newPayables[index] = { ...payable, description: e.target.value }
                                    setFormData({ ...formData, accountsPayable: newPayables })
                                  }}
                                />
                              </FormControl>
                              <FormControl>
                                <FormLabel>Terms</FormLabel>
                                <Input
                                  placeholder="Enter terms"
                                  value={payable.terms}
                                  onChange={(e) => {
                                    const newPayables = [...formData.accountsPayable]
                                    newPayables[index] = { ...payable, terms: e.target.value }
                                    setFormData({ ...formData, accountsPayable: newPayables })
                                  }}
                                />
                              </FormControl>
                              {index > 0 && (
                                <Button
                                  aria-label="Remove account payable"
                                  onClick={() => {
                                    const newPayables = formData.accountsPayable.filter((_, i) => i !== index)
                                    setFormData({ ...formData, accountsPayable: newPayables })
                                  }}
                                  colorScheme="red"
                                  variant="ghost"
                                  alignSelf="flex-end"
                                >
                                  Remove
                                </Button>
                              )}
                            </Stack>
                          </CardBody>
                        </Card>
                      ))}

                      <Button
                        onClick={() => setFormData({
                          ...formData,
                          accountsPayable: [...formData.accountsPayable, {
                            vendorName: '',
                            amount: 0,
                            dueDate: '',
                            description: '',
                            terms: ''
                          }]
                        })}
                        size="sm"
                        variant="outline"
                      >
                        + Add Another Account Payable
                      </Button>
                    </Stack>
                  </CardBody>
                </Card>
              )}
            </FormControl>
          </VStack>
        )

      case 5:
        return (
          <VStack spacing={6} align="stretch">
            <FormControl>
              <HStack>
                <Checkbox
                  isChecked={formData.hasAccountsReceivable}
                  onChange={(e) => setFormData({ ...formData, hasAccountsReceivable: e.target.checked })}
                  size="lg"
                >
                  Do you have accounts receivable?
                </Checkbox>
              </HStack>

              {formData.hasAccountsReceivable && (
                <Card mt={4} variant="outline">
                  <CardBody>
                    <Stack spacing={4}>
                      {formData.accountsReceivable.map((receivable, index) => (
                        <Card key={index} variant="outline">
                          <CardBody>
                            <Stack spacing={4}>
                              <FormControl>
                                <FormLabel>Customer Name</FormLabel>
                                <Input
                                  placeholder="Enter customer name"
                                  value={receivable.customerName}
                                  onChange={(e) => {
                                    const newReceivables = [...formData.accountsReceivable]
                                    newReceivables[index] = { ...receivable, customerName: e.target.value }
                                    setFormData({ ...formData, accountsReceivable: newReceivables })
                                  }}
                                />
                              </FormControl>
                              <FormControl>
                                <FormLabel>Amount</FormLabel>
                                <NumberInput
                                  min={0}
                                  value={receivable.amount || undefined}
                                  onChange={(_, valueNumber) => {
                                    const newReceivables = [...formData.accountsReceivable]
                                    newReceivables[index] = { ...receivable, amount: valueNumber || 0 }
                                    setFormData({ ...formData, accountsReceivable: newReceivables })
                                  }}
                                >
                                  <NumberInputField placeholder="Enter amount" />
                                </NumberInput>
                              </FormControl>
                              <FormControl>
                                <FormLabel>Due Date</FormLabel>
                                <Input
                                  type="date"
                                  value={receivable.dueDate}
                                  onChange={(e) => {
                                    const newReceivables = [...formData.accountsReceivable]
                                    newReceivables[index] = { ...receivable, dueDate: e.target.value }
                                    setFormData({ ...formData, accountsReceivable: newReceivables })
                                  }}
                                />
                              </FormControl>
                              <FormControl>
                                <FormLabel>Description</FormLabel>
                                <Input
                                  placeholder="Enter description"
                                  value={receivable.description}
                                  onChange={(e) => {
                                    const newReceivables = [...formData.accountsReceivable]
                                    newReceivables[index] = { ...receivable, description: e.target.value }
                                    setFormData({ ...formData, accountsReceivable: newReceivables })
                                  }}
                                />
                              </FormControl>
                              <FormControl>
                                <FormLabel>Terms</FormLabel>
                                <Input
                                  placeholder="Enter terms"
                                  value={receivable.terms}
                                  onChange={(e) => {
                                    const newReceivables = [...formData.accountsReceivable]
                                    newReceivables[index] = { ...receivable, terms: e.target.value }
                                    setFormData({ ...formData, accountsReceivable: newReceivables })
                                  }}
                                />
                              </FormControl>
                              {index > 0 && (
                                <Button
                                  aria-label="Remove account receivable"
                                  onClick={() => {
                                    const newReceivables = formData.accountsReceivable.filter((_, i) => i !== index)
                                    setFormData({ ...formData, accountsReceivable: newReceivables })
                                  }}
                                  colorScheme="red"
                                  variant="ghost"
                                  alignSelf="flex-end"
                                >
                                  Remove
                                </Button>
                              )}
                            </Stack>
                          </CardBody>
                        </Card>
                      ))}

                      <Button
                        onClick={() => setFormData({
                          ...formData,
                          accountsReceivable: [...formData.accountsReceivable, {
                            customerName: '',
                            amount: 0,
                            dueDate: '',
                            description: '',
                            terms: ''
                          }]
                        })}
                        size="sm"
                        variant="outline"
                      >
                        + Add Another Account Receivable
                      </Button>
                    </Stack>
                  </CardBody>
                </Card>
              )}
            </FormControl>
          </VStack>
        )

      case 6:
        return (
          <VStack spacing={6} align="stretch">
            <FormControl>
              <HStack>
                <Checkbox
                  isChecked={formData.hasLoans}
                  onChange={(e) => setFormData({ ...formData, hasLoans: e.target.checked })}
                  size="lg"
                >
                  Do you have any loans or financing?
                </Checkbox>
              </HStack>

              {formData.hasLoans && (
                <Card mt={4} variant="outline">
                  <CardBody>
                    <Stack spacing={4}>
                      {formData.loans.map((loan, index) => (
                        <Card key={index} variant="outline">
                          <CardBody>
                            <Stack spacing={4}>
                              <FormControl>
                                <FormLabel>Purpose</FormLabel>
                                <Input
                                  placeholder="Enter purpose"
                                  value={loan.purpose}
                                  onChange={(e) => {
                                    const newLoans = [...formData.loans]
                                    newLoans[index] = { ...loan, purpose: e.target.value }
                                    setFormData({ ...formData, loans: newLoans })
                                  }}
                                />
                              </FormControl>
                              <FormControl>
                                <FormLabel>Amount</FormLabel>
                                <NumberInput
                                  min={0}
                                  value={loan.amount || undefined}
                                  onChange={(_, valueNumber) => {
                                    const newLoans = [...formData.loans]
                                    newLoans[index] = { ...loan, amount: valueNumber || 0 }
                                    setFormData({ ...formData, loans: newLoans })
                                  }}
                                >
                                  <NumberInputField placeholder="Enter amount" />
                                </NumberInput>
                              </FormControl>
                              <FormControl>
                                <FormLabel>Interest Rate</FormLabel>
                                <NumberInput
                                  min={0}
                                  value={loan.interestRate || undefined}
                                  onChange={(_, valueNumber) => {
                                    const newLoans = [...formData.loans]
                                    newLoans[index] = { ...loan, interestRate: valueNumber || 0 }
                                    setFormData({ ...formData, loans: newLoans })
                                  }}
                                >
                                  <NumberInputField placeholder="Enter interest rate" />
                                </NumberInput>
                              </FormControl>
                              <FormControl>
                                <FormLabel>Monthly Payment</FormLabel>
                                <NumberInput
                                  min={0}
                                  value={loan.monthlyPayment || undefined}
                                  onChange={(_, valueNumber) => {
                                    const newLoans = [...formData.loans]
                                    newLoans[index] = { ...loan, monthlyPayment: valueNumber || 0 }
                                    setFormData({ ...formData, loans: newLoans })
                                  }}
                                >
                                  <NumberInputField placeholder="Enter monthly payment" />
                                </NumberInput>
                              </FormControl>
                              <FormControl>
                                <FormLabel>Start Date</FormLabel>
                                <Input
                                  type="date"
                                  value={loan.startDate}
                                  onChange={(e) => {
                                    const newLoans = [...formData.loans]
                                    newLoans[index] = { ...loan, startDate: e.target.value }
                                    setFormData({ ...formData, loans: newLoans })
                                  }}
                                />
                              </FormControl>
                              {index > 0 && (
                                <Button
                                  aria-label="Remove loan"
                                  onClick={() => {
                                    const newLoans = formData.loans.filter((_, i) => i !== index)
                                    setFormData({ ...formData, loans: newLoans })
                                  }}
                                  colorScheme="red"
                                  variant="ghost"
                                  alignSelf="flex-end"
                                >
                                  Remove
                                </Button>
                              )}
                            </Stack>
                          </CardBody>
                        </Card>
                      ))}

                      <Button
                        onClick={() => setFormData({
                          ...formData,
                          loans: [...formData.loans, {
                            purpose: '',
                            amount: 0,
                            interestRate: 0,
                            monthlyPayment: 0,
                            startDate: ''
                          }]
                        })}
                        size="sm"
                        variant="outline"
                      >
                        + Add Another Loan
                      </Button>
                    </Stack>
                  </CardBody>
                </Card>
              )}
            </FormControl>
          </VStack>
        )

      case 7:
        return (
          <VStack spacing={6} align="stretch">
            <FormControl>
              <HStack>
                <Checkbox
                  isChecked={formData.isVatRegistered}
                  onChange={(e) => setFormData({ ...formData, isVatRegistered: e.target.checked })}
                  size="lg"
                >
                  Is your business VAT-registered in the UAE?
                </Checkbox>
              </HStack>

              {formData.isVatRegistered && (
                <Card mt={4} variant="outline">
                  <CardBody>
                    <Stack spacing={4}>
                      <FormControl>
                        <FormLabel>TRN (Tax Registration Number)</FormLabel>
                        <Input
                          placeholder="Enter your TRN"
                          value={formData.trn}
                          onChange={(e) => setFormData({ ...formData, trn: e.target.value })}
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel>VAT Filing Frequency</FormLabel>
                        <RadioGroup
                          value={formData.vatFrequency}
                          onChange={(value) => setFormData({ ...formData, vatFrequency: value })}
                        >
                          <Stack direction="row" spacing={4}>
                            <Radio value="monthly">Monthly</Radio>
                            <Radio value="quarterly">Quarterly</Radio>
                          </Stack>
                        </RadioGroup>
                      </FormControl>

                      <Checkbox
                        isChecked={formData.trackVat}
                        onChange={(e) => setFormData({ ...formData, trackVat: e.target.checked })}
                      >
                        Track VAT on sales and purchases
                      </Checkbox>
                    </Stack>
                  </CardBody>
                </Card>
              )}
            </FormControl>
          </VStack>
        )

      default:
        return null
    }
  }

  return (
    <Box p={8} bg="white" borderRadius="xl">
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading size="lg" mb={2}>AI Bookkeeping Onboarding</Heading>
          <Text color="gray.600">
            Welcome to your AI-powered accounting assistant. This short onboarding will help generate accurate IFRS financial reports using your bank transactions.
          </Text>
        </Box>

        <Progress
          value={(currentStep / (steps.length - 1)) * 100}
          mb={4}
          colorScheme="green"
        />

        <HStack spacing={8} align="flex-start">
          <VStack spacing={4} minW="200px" align="stretch">
            {steps.map((step, index) => (
              <Button
                key={index}
                onClick={() => setCurrentStep(index)}
                variant={currentStep === index ? 'solid' : 'ghost'}
                colorScheme={currentStep === index ? 'green' : 'gray'}
                size="lg"
                justifyContent="flex-start"
                leftIcon={
                  <Box
                    w="24px"
                    h="24px"
                    borderRadius="full"
                    bg={currentStep === index ? 'white' : 'gray.200'}
                    color={currentStep === index ? 'green.500' : 'gray.600'}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontSize="sm"
                    fontWeight="bold"
                  >
                    {index + 1}
                  </Box>
                }
                isDisabled={!steps.slice(0, index).every(step => step.isComplete())}
              >
                <VStack align="flex-start" spacing={0}>
                  <Text>{step.title}</Text>
                  <Text fontSize="xs" color={currentStep === index ? 'whiteAlpha.800' : 'gray.500'}>
                    {step.description}
                  </Text>
                </VStack>
              </Button>
            ))}
          </VStack>

          <Box flex={1}>
            <form onSubmit={handleSubmit}>
              {renderStep()}

              <HStack mt={4} spacing={4}>
                <Button
                  onClick={prevStep}
                  isDisabled={currentStep === 0}
                  variant="outline"
                  colorScheme="green"
                >
                  Previous
                </Button>
                <Button
                  colorScheme="green"
                  onClick={currentStep === steps.length - 1 ? handleSubmit : nextStep}
                  isLoading={isSubmitting}
                >
                  {currentStep === steps.length - 1 ? 'Submit' : 'Next'}
                </Button>
              </HStack>
            </form>
          </Box>
        </HStack>
      </VStack>
    </Box>
  )
} 