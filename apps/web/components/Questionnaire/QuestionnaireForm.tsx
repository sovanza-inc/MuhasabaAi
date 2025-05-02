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
  IconButton,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Container,
} from '@chakra-ui/react'
import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'

interface QuestionnaireFormProps {
  onComplete: () => void
  initialData?: FormData & { id?: string }
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
  documents: {
    cogsInventory: (File | string)[]
    fixedAssets: (File | string)[]
    accountsPayable: (File | string)[]
    accountsReceivable: (File | string)[]
    loans: (File | string)[]
    vatRegistration: (File | string)[]
  }
  preferManualEntry: boolean
}

const formatFileSize = (bytes: number): string => {
  if (!bytes || isNaN(bytes)) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[Math.min(i, sizes.length - 1)]}`
}

const FileList = ({ 
  files, 
  onRemove 
}: { 
  files: (File | string)[], 
  onRemove: (index: number) => void 
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const cancelRef = React.useRef<HTMLButtonElement>(null)
  const [fileToRemove, setFileToRemove] = React.useState<{ index: number; name: string } | null>(null)

  const handleRemoveClick = (index: number, fileName: string) => {
    const file = files[index]
    if (typeof file === 'string') {
      // For already uploaded files, show confirmation
      setFileToRemove({ index, name: fileName })
      onOpen()
    } else {
      // For newly added files, remove directly
      onRemove(index)
    }
  }

  const handleConfirmRemove = () => {
    if (fileToRemove) {
      onRemove(fileToRemove.index)
    }
    onClose()
    setFileToRemove(null)
  }

  return (
    <>
      <VStack align="stretch" spacing={2} mt={2}>
        {files.map((file, index) => {
          const isStoredFile = typeof file === 'string'
          const fileName = isStoredFile ? file : file.name
          const fileSize = isStoredFile ? null : (file as File).size
          
          return (
            <HStack key={index} p={2} bg="gray.50" borderRadius="md" justify="space-between">
              <HStack>
                <Text fontSize="sm">📎</Text>
                <Text fontSize="sm">{fileName}</Text>
                {fileSize && (
                  <Text fontSize="xs" color="gray.500">({formatFileSize(fileSize)})</Text>
                )}
                {isStoredFile && (
                  <Text fontSize="xs" color="green.500">(Uploaded)</Text>
                )}
              </HStack>
              <IconButton
                aria-label="Remove file"
                icon={<Text>✕</Text>}
                size="sm"
                variant="ghost"
                colorScheme="red"
                onClick={() => handleRemoveClick(index, fileName)}
              />
            </HStack>
          )
        })}
      </VStack>

      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Remove Uploaded File
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to remove &quot;{fileToRemove?.name}&quot;? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleConfirmRemove} ml={3}>
                Remove
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  )
}

// Helper function to normalize filenames
const normalizeFileName = (filename: string): string => {
  return filename.replace(/[_\s-]+/g, ' ').toLowerCase().trim()
}

export function QuestionnaireForm({ onComplete, initialData }: QuestionnaireFormProps) {
  const toast = useToast()
  const [workspace] = useCurrentWorkspace()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [currentStep, setCurrentStep] = React.useState(0)

  // Form state
  const [formData, setFormData] = React.useState<FormData>(() => {
    if (initialData) {
      const documents = Object.keys(initialData.documents || {}).reduce((acc, key) => {
        const section = key as keyof FormData['documents']
        const files = initialData.documents[section] || []
        
        // Deduplicate based on normalized names
        const uniqueFiles = Array.from(
          files.reduce((map, file) => {
            const normalizedName = normalizeFileName(typeof file === 'string' ? file : file.name)
            if (!map.has(normalizedName)) {
              map.set(normalizedName, file)
            }
            return map
          }, new Map()).values()
        )
        
        acc[section] = uniqueFiles
        return acc
      }, {} as FormData['documents'])

      return {
        ...initialData,
        documents: {
          cogsInventory: documents.cogsInventory || [],
          fixedAssets: documents.fixedAssets || [],
          accountsPayable: documents.accountsPayable || [],
          accountsReceivable: documents.accountsReceivable || [],
          loans: documents.loans || [],
          vatRegistration: documents.vatRegistration || [],
        }
      }
    }

    return {
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
      operatingSince: 0,
      documents: {
        cogsInventory: [],
        fixedAssets: [],
        accountsPayable: [],
        accountsReceivable: [],
        loans: [],
        vatRegistration: []
      },
      preferManualEntry: false
    }
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
        // If user chose to upload documents, check if files are uploaded
        if (!formData.preferManualEntry) {
          return formData.documents.fixedAssets && formData.documents.fixedAssets.length > 0
        }
        // For manual entry, check if assets are filled out
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
      const submitData = new FormData()
      submitData.append('workspaceId', workspace?.id || '')
      
      if (initialData?.id) {
        submitData.append('id', initialData.id)
      }

      // Create a copy of formData for JSON serialization
      const formDataForJson = {
        ...formData,
        documents: Object.entries(formData.documents).reduce((acc, [key, files]) => {
          // Only include filenames, no duplicates
          const uniqueFiles = Array.from(new Set(
            files.map(file => typeof file === 'string' ? file : file.name)
          ))
          acc[key] = uniqueFiles
          return acc
        }, {} as Record<string, string[]>)
      }

      submitData.append('responses', JSON.stringify(formDataForJson))

      // Only append new File objects for upload
      Object.entries(formData.documents).forEach(([section, files]) => {
        files.forEach(file => {
          if (file instanceof File) {
            submitData.append(`documents_${section}`, file)
          }
        })
      })

      const response = await fetch('/api/questionnaire', {
        method: 'POST',
        body: submitData
      })

      if (!response.ok) {
        let errorMessage = 'Failed to save questionnaire responses'
        try {
          const contentType = response.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json()
            errorMessage = errorData.error || `Error: ${response.status} - ${response.statusText}`
          } else {
            const textError = await response.text()
            errorMessage = textError || `Error: ${response.status} - ${response.statusText}`
          }
        } catch (parseError) {
          console.error('Error parsing response:', parseError)
          errorMessage = `Server error (${response.status}). Please try again.`
        }
        throw new Error(errorMessage)
      }

      toast({
        title: 'Success',
        description: 'Your response has been saved successfully.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      })

      onComplete()
    } catch (error) {
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

  const handleFileUpload = (section: keyof FormData['documents'], files: FileList | null) => {
    if (!files || files.length === 0) return

    setFormData(prev => {
      const existingFiles = prev.documents[section] || []
      const newFiles = Array.from(files)
      
      // Normalize filenames for comparison
      const existingNormalizedNames = new Set(
        existingFiles.map(f => normalizeFileName(typeof f === 'string' ? f : f.name))
      )

      // Filter out duplicates based on normalized names
      const uniqueNewFiles = newFiles.filter(file => 
        !existingNormalizedNames.has(normalizeFileName(file.name))
      )

      if (uniqueNewFiles.length !== newFiles.length) {
        toast({
          title: 'Duplicate Files',
          description: 'Some files were skipped as they were already uploaded.',
          status: 'warning',
          duration: 3000,
          isClosable: true,
        })
      }

      return {
        ...prev,
        documents: {
          ...prev.documents,
          [section]: [...existingFiles, ...uniqueNewFiles]
        }
      }
    })
  }

  const handleFileRemove = (section: keyof FormData['documents'], index: number) => {
    setFormData(prev => {
      const newDocs = { ...prev.documents }
      if (newDocs[section]) {
        const files = [...newDocs[section]]
        files.splice(index, 1)
        newDocs[section] = files
      }
      return {
        ...prev,
        documents: newDocs
      }
    })
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

            <FormControl>
              <FormLabel>Upload Inventory Documents (Optional)</FormLabel>
              <Text fontSize="sm" color="gray.600" mb={2}>
                Upload inventory reports, stock counts, or purchase records to help calculate COGS
              </Text>
              <Input
                type="file"
                multiple
                accept=".pdf,.xls,.xlsx,.csv"
                onChange={(e) => handleFileUpload('cogsInventory', e.target.files)}
                onClick={(e) => {
                  // Reset the value to allow selecting the same file again
                  (e.target as HTMLInputElement).value = ''
                }}
              />
              {formData.documents.cogsInventory && formData.documents.cogsInventory.length > 0 && (
                <FileList
                  files={formData.documents.cogsInventory}
                  onRemove={(index) => handleFileRemove('cogsInventory', index)}
                />
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
                <Card mt={4} variant="outline">
                  <CardBody>
                    <Stack spacing={4}>
                      <FormControl>
                        <FormLabel>How would you like to provide fixed assets information?</FormLabel>
                        <RadioGroup
                          value={formData.preferManualEntry ? 'manual' : 'upload'}
                          onChange={(value) => setFormData({ ...formData, preferManualEntry: value === 'manual' })}
                        >
                          <Stack direction="row" spacing={4}>
                            <Radio value="upload">Upload Documents</Radio>
                            <Radio value="manual">Enter Manually</Radio>
                          </Stack>
                        </RadioGroup>
                      </FormControl>

                      {!formData.preferManualEntry ? (
                        <FormControl>
                          <FormLabel>Upload Fixed Assets Documents</FormLabel>
                          <Text fontSize="sm" color="gray.600" mb={2}>
                            Upload purchase invoices, asset registers, or depreciation schedules
                          </Text>
                          <Input
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png"
                            onChange={(e) => handleFileUpload('fixedAssets', e.target.files)}
                          />
                          {formData.documents.fixedAssets && formData.documents.fixedAssets.length > 0 && (
                            <FileList
                              files={formData.documents.fixedAssets}
                              onRemove={(index) => handleFileRemove('fixedAssets', index)}
                            />
                          )}
                        </FormControl>
                      ) : (
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
                    </Stack>
                  </CardBody>
                </Card>
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
                      <FormControl>
                        <FormLabel>How would you like to provide accounts payable information?</FormLabel>
                        <RadioGroup
                          value={formData.preferManualEntry ? 'manual' : 'upload'}
                          onChange={(value) => setFormData({ ...formData, preferManualEntry: value === 'manual' })}
                        >
                          <Stack direction="row" spacing={4}>
                            <Radio value="upload">Upload Documents</Radio>
                            <Radio value="manual">Enter Manually</Radio>
                          </Stack>
                        </RadioGroup>
                      </FormControl>

                      {!formData.preferManualEntry ? (
                        <FormControl>
                          <FormLabel>Upload Accounts Payable Documents</FormLabel>
                          <Text fontSize="sm" color="gray.600" mb={2}>
                            Upload vendor invoices, statements, or aging reports
                          </Text>
                          <Input
                            type="file"
                            multiple
                            accept=".pdf,.xls,.xlsx,.csv"
                            onChange={(e) => handleFileUpload('accountsPayable', e.target.files)}
                          />
                          {formData.documents.accountsPayable && formData.documents.accountsPayable.length > 0 && (
                            <FileList
                              files={formData.documents.accountsPayable}
                              onRemove={(index) => handleFileRemove('accountsPayable', index)}
                            />
                          )}
                        </FormControl>
                      ) : (
                        <VStack spacing={4} mt={4} align="stretch">
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
                        </VStack>
                      )}
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
                      <FormControl>
                        <FormLabel>How would you like to provide accounts receivable information?</FormLabel>
                        <RadioGroup
                          value={formData.preferManualEntry ? 'manual' : 'upload'}
                          onChange={(value) => setFormData({ ...formData, preferManualEntry: value === 'manual' })}
                        >
                          <Stack direction="row" spacing={4}>
                            <Radio value="upload">Upload Documents</Radio>
                            <Radio value="manual">Enter Manually</Radio>
                          </Stack>
                        </RadioGroup>
                      </FormControl>

                      {!formData.preferManualEntry ? (
                        <FormControl>
                          <FormLabel>Upload Accounts Receivable Documents</FormLabel>
                          <Text fontSize="sm" color="gray.600" mb={2}>
                            Upload customer invoices, statements, or aging reports
                          </Text>
                          <Input
                            type="file"
                            multiple
                            accept=".pdf,.xls,.xlsx,.csv"
                            onChange={(e) => handleFileUpload('accountsReceivable', e.target.files)}
                          />
                          {formData.documents.accountsReceivable && formData.documents.accountsReceivable.length > 0 && (
                            <FileList
                              files={formData.documents.accountsReceivable}
                              onRemove={(index) => handleFileRemove('accountsReceivable', index)}
                            />
                          )}
                        </FormControl>
                      ) : (
                        <VStack spacing={4} mt={4} align="stretch">
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
                        </VStack>
                      )}
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
                      <FormControl>
                        <FormLabel>How would you like to provide loans information?</FormLabel>
                        <RadioGroup
                          value={formData.preferManualEntry ? 'manual' : 'upload'}
                          onChange={(value) => setFormData({ ...formData, preferManualEntry: value === 'manual' })}
                        >
                          <Stack direction="row" spacing={4}>
                            <Radio value="upload">Upload Documents</Radio>
                            <Radio value="manual">Enter Manually</Radio>
                          </Stack>
                        </RadioGroup>
                      </FormControl>

                      {!formData.preferManualEntry ? (
                        <FormControl>
                          <FormLabel>Upload Loan Documents</FormLabel>
                          <Text fontSize="sm" color="gray.600" mb={2}>
                            Upload loan agreements, statements, or repayment schedules
                          </Text>
                          <Input
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => handleFileUpload('loans', e.target.files)}
                          />
                          {formData.documents.loans && formData.documents.loans.length > 0 && (
                            <FileList
                              files={formData.documents.loans}
                              onRemove={(index) => handleFileRemove('loans', index)}
                            />
                          )}
                        </FormControl>
                      ) : (
                        <VStack spacing={4} mt={4} align="stretch">
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
                        </VStack>
                      )}
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
                        <FormLabel>How would you like to provide VAT registration information?</FormLabel>
                        <RadioGroup
                          value={formData.preferManualEntry ? 'manual' : 'upload'}
                          onChange={(value) => setFormData({ ...formData, preferManualEntry: value === 'manual' })}
                        >
                          <Stack direction="row" spacing={4}>
                            <Radio value="upload">Upload Documents</Radio>
                            <Radio value="manual">Enter Manually</Radio>
                          </Stack>
                        </RadioGroup>
                      </FormControl>

                      {!formData.preferManualEntry ? (
                        <FormControl>
                          <FormLabel>Upload VAT Documents</FormLabel>
                          <Text fontSize="sm" color="gray.600" mb={2}>
                            Upload VAT registration certificate and recent returns
                          </Text>
                          <Input
                            type="file"
                            multiple
                            accept=".pdf,.jpg,.png"
                            onChange={(e) => handleFileUpload('vatRegistration', e.target.files)}
                          />
                          {formData.documents.vatRegistration && formData.documents.vatRegistration.length > 0 && (
                            <FileList
                              files={formData.documents.vatRegistration}
                              onRemove={(index) => handleFileRemove('vatRegistration', index)}
                            />
                          )}
                        </FormControl>
                      ) : (
                        <VStack spacing={4} mt={4} align="stretch">
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
                        </VStack>
                      )}
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
    <Container maxW="8xl" p={8}>
      <Box bg="white" borderRadius="xl" shadow="lg" p={8}>
        <VStack spacing={8} align="stretch">
          <Box>
            <Heading size="xl" mb={3}>AI Bookkeeping Onboarding</Heading>
            <Text color="gray.600" fontSize="lg">
              Welcome to your AI-powered accounting assistant. This short onboarding will help generate accurate IFRS financial reports using your bank transactions.
            </Text>
          </Box>

          <Progress
            value={(currentStep / (steps.length - 1)) * 100}
            mb={6}
            colorScheme="green"
            size="lg"
            borderRadius="full"
          />

          <Stack
            direction={{ base: 'column', md: 'row' }}
            spacing={{ base: 4, md: 12 }}
            align={{ base: 'stretch', md: 'flex-start' }}
          >
            <Box
              minW={{ base: 'full', md: '250px' }}
              overflowX={{ base: 'auto', md: 'visible' }}
              py={{ base: 2, md: 0 }}
            >
              <Stack
                direction={{ base: 'row', md: 'column' }}
                spacing={{ base: 2, md: 4 }}
                align="stretch"
                minW={{ base: 'fit-content', md: 'auto' }}
              >
                {steps.map((step, index) => (
                  <Button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    variant={currentStep === index ? 'solid' : 'ghost'}
                    colorScheme={currentStep === index ? 'green' : 'gray'}
                    size="lg"
                    justifyContent={{ base: 'center', md: 'flex-start' }}
                    p={{ base: 4, md: 6 }}
                    minW={{ base: '100px', md: 'auto' }}
                    leftIcon={
                      <Box
                        w={{ base: '24px', md: '32px' }}
                        h={{ base: '24px', md: '32px' }}
                        borderRadius="full"
                        bg={currentStep === index ? 'white' : 'gray.200'}
                        color={currentStep === index ? 'green.500' : 'gray.600'}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        fontSize={{ base: 'sm', md: 'md' }}
                        fontWeight="bold"
                      >
                        {index + 1}
                      </Box>
                    }
                    isDisabled={!steps.slice(0, index).every(step => step.isComplete())}
                  >
                    <VStack
                      align={{ base: 'center', md: 'flex-start' }}
                      spacing={{ base: 0, md: 1 }}
                      display={{ base: 'none', md: 'flex' }}
                    >
                      <Text fontSize="lg">{step.title}</Text>
                      <Text fontSize="sm" color={currentStep === index ? 'whiteAlpha.800' : 'gray.500'}>
                        {step.description}
                      </Text>
                    </VStack>
                    <Text
                      display={{ base: 'block', md: 'none' }}
                      fontSize="sm"
                      fontWeight="medium"
                    >
                      {step.title.split(' ')[0]}
                    </Text>
                  </Button>
                ))}
              </Stack>
            </Box>

            <Box flex={1}>
              <form onSubmit={handleSubmit}>
                <Card variant="outline" size="lg" p={6}>
                  <CardBody>
                    {renderStep()}
                  </CardBody>
                </Card>

                <HStack mt={6} spacing={4} justify="flex-end">
                  <Button
                    onClick={prevStep}
                    isDisabled={currentStep === 0}
                    variant="outline"
                    colorScheme="green"
                    size="lg"
                    px={8}
                  >
                    Previous
                  </Button>
                  <Button
                    colorScheme="green"
                    onClick={currentStep === steps.length - 1 ? handleSubmit : nextStep}
                    isLoading={isSubmitting}
                    size="lg"
                    px={8}
                  >
                    {currentStep === steps.length - 1 ? 'Submit' : 'Next'}
                  </Button>
                </HStack>
              </form>
            </Box>
          </Stack>
        </VStack>
      </Box>
    </Container>
  )
} 