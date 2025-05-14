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
  Select,
  Textarea,
} from '@chakra-ui/react'
import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'

interface QuestionnaireFormProps {
  onComplete: () => void
  initialData?: Omit<FormData, 'documents'> & { 
    id?: string;
    documents?: InitialDataDocuments;
  };
}

interface FixedAsset {
  name: string
  type: 'Equipment' | 'Vehicle' | 'Furniture' | 'Software' | 'License' | 'Other'
  value: number
  purchaseDate: string
  depreciationMethod: 'Straight-line' | 'Declining balance'
  usefulLife: number
  isIntangible: boolean
  residualValue: number
  description: string
}

interface FormData {
  businessName: string;
  industry: string;
  operatingSince: number;
  productType: string;
  cogsCategories: Array<{ type: string; description: string }>;
  calculateCogs: boolean;
  beginningInventory: number;
  purchases: number;
  endingInventory: number;
  hasFixedAssets: boolean;
  fixedAssets: Array<{
    name: string;
    type: string;
    value: number;
    purchaseDate: string;
    depreciationMethod: string;
    usefulLife: number;
    isIntangible: boolean;
    residualValue: number;
    description: string;
  }>;
  hasLoans: boolean;
  loans: Array<{
    purpose: string;
    amount: number;
    interestRate: number
    monthlyPayment: number;
    startDate: string;
    type: 'Loan' | 'Lease';
    isActive: boolean;
    endDate: string;
    assetLeased: string;
    leaseTerm: number;
  }>;
  hasAccountsPayable: boolean;
  accountsPayable: Array<{
    vendorName: string;
    amount: number;
    dueDate: string;
    description: string;
    terms: string;
  }>;
  hasAccountsReceivable: boolean;
  accountsReceivable: Array<{
    customerName: string;
    amount: number;
    dueDate: string;
    description: string;
    terms: string;
  }>;
  paymentType: string;
  outstandingBalances: Array<{
    partyName: string;
    type: string;
    amount: number
    dueDate: string;
    description: string;
  }>;
  isVatRegistered: boolean;
  trn: string;
  vatFrequency: string;
  trackVat: boolean;
  hasCapitalContributions: boolean;
  capitalContributions: Array<{
    amount: number;
    date: string;
    proof?: string | File;
  }>;
  hasEquipmentPurchases: boolean;
  equipmentPurchases: Array<{
    name: string;
    cost: number;
    date: string;
  }>;
  hasLoanRepayments: boolean;
  loanRepayments: Array<{
    amount: number;
    date: string;
    loanId: string;
  }>;
  manualEntryPreferences: {
    fixedAssets: boolean;
    accountsPayable: boolean;
    accountsReceivable: boolean;
    vatRegistration: boolean;
    cogsInventory: boolean;
    loans: boolean;
  };
  documents: {
    cogsInventory: File[];
    fixedAssets: File[];
    accountsPayable: File[];
    accountsReceivable: File[];
    loans: File[];
    vatRegistration: File[];
  };
  preferManualEntry: boolean;
}

interface InitialDataDocuments {
  cogsInventory?: string[];
  fixedAssets?: string[];
  accountsPayable?: string[];
  accountsReceivable?: string[];
  loans?: string[];
  vatRegistration?: string[];
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
  files: File[], 
  onRemove: (index: number) => void 
}) => {
  return (
    <VStack align="stretch" spacing={2} mt={2}>
      {files.map((file, index) => (
        <HStack key={index} p={2} bg="gray.50" borderRadius="md" justify="space-between">
          <HStack>
            <Text fontSize="sm">📎</Text>
            <Text fontSize="sm">{file.name}</Text>
            <Text fontSize="xs" color="gray.500">
              {file.size > 0 ? `(${formatFileSize(file.size)})` : '(Uploaded)'}
            </Text>
          </HStack>
          <IconButton
            aria-label="Remove file"
            icon={<Text>✕</Text>}
            size="sm"
            variant="ghost"
            colorScheme="red"
            onClick={() => onRemove(index)}
          />
        </HStack>
      ))}
    </VStack>
  )
}

const normalizeFileName = (filename: string): string => {
  return filename.replace(/[_\s-]+/g, ' ').toLowerCase().trim();
};

export function QuestionnaireForm({ onComplete, initialData }: QuestionnaireFormProps) {
  const toast = useToast()
  const [workspace] = useCurrentWorkspace()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [currentStep, setCurrentStep] = React.useState(0)

  // Form state
  const [formData, setFormData] = React.useState<FormData>(() => {
    const defaultManualPreferences = {
      fixedAssets: false,
      accountsPayable: false,
      accountsReceivable: false,
      vatRegistration: false,
      cogsInventory: false,
      loans: false
    };

    const defaultDocuments = {
      cogsInventory: [] as File[],
      fixedAssets: [] as File[],
      accountsPayable: [] as File[],
      accountsReceivable: [] as File[],
      loans: [] as File[],
      vatRegistration: [] as File[]
    };

    const defaultState: FormData = {
      businessName: '',
      industry: '',
      operatingSince: 0,
      productType: '',
      cogsCategories: [{ type: '', description: '' }],
      calculateCogs: false,
      beginningInventory: 0,
      purchases: 0,
      endingInventory: 0,
      hasFixedAssets: false,
      fixedAssets: [{
        name: '',
        type: 'Equipment',
        value: 0,
        purchaseDate: '',
        depreciationMethod: 'Straight-line',
        usefulLife: 0,
        isIntangible: false,
        residualValue: 0,
        description: ''
      }],
      hasLoans: false,
      loans: [{
        purpose: '',
        amount: 0,
        interestRate: 0,
        monthlyPayment: 0,
        startDate: '',
        type: 'Loan' as const,
        isActive: true,
        endDate: '',
        assetLeased: '',
        leaseTerm: 0
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
      hasCapitalContributions: false,
      capitalContributions: [],
      hasEquipmentPurchases: false,
      equipmentPurchases: [],
      hasLoanRepayments: false,
      loanRepayments: [],
      manualEntryPreferences: defaultManualPreferences,
      documents: defaultDocuments,
      preferManualEntry: false
    };

    if (initialData) {
      // Set manual entry preferences based on existing files
      Object.entries(initialData.documents || {}).forEach(([key, fileNames]) => {
        if (Array.isArray(fileNames) && fileNames.length > 0) {
          // Set manual entry preference to false if there are files
          defaultManualPreferences[key as keyof typeof defaultManualPreferences] = false;
        }
      });

      // Create placeholder File objects for existing documents
      const documents = Object.entries(initialData.documents || {}).reduce((acc, [key, fileNames]) => {
        if (Array.isArray(fileNames)) {
          // Create placeholder File objects with just the name
          acc[key as keyof FormData['documents']] = fileNames.map(fileName => 
            new File([], fileName, { type: 'application/octet-stream' })
          );
        }
        return acc;
      }, { ...defaultDocuments });

      return {
        ...defaultState,
        ...initialData,
        manualEntryPreferences: {
          ...defaultManualPreferences,
          ...(initialData.manualEntryPreferences || {})
        },
        documents
      };
    }

    return defaultState;
  })

  const steps = [
    {
      title: 'Business Information',
      description: 'Tell us about your business',
      isComplete: () => Boolean(formData.businessName && formData.industry && formData.operatingSince > 0),
    },
    {
      title: 'Products & Services',
      description: 'What do you sell?',
      isComplete: () => Boolean(formData.productType),
    },
    {
      title: 'COGS & Inventory',
      description: 'Cost of goods sold details',
      isComplete: () => {
        // If COGS calculation is not enabled, step is complete
        if (!formData.calculateCogs) return true;

        // If manual entry is selected, check for categories
        if (formData.manualEntryPreferences.cogsInventory) {
          return Boolean(formData.cogsCategories?.[0]?.type);
        }

        // If we reach here, document upload is optional
        return true;
      },
    },
    {
      title: 'Fixed Assets',
      description: 'Equipment and property',
      isComplete: () => {
        if (!formData.hasFixedAssets) return true;
        
        if (!formData.manualEntryPreferences.fixedAssets) {
          return Boolean(formData.documents.fixedAssets?.length > 0);
        }
        
        const asset = formData.fixedAssets?.[0];
        return Boolean(
          asset?.name &&
          asset?.type &&
          asset?.value > 0 &&
          asset?.purchaseDate &&
          asset?.depreciationMethod &&
          asset?.usefulLife > 0 &&
          typeof asset?.residualValue === 'number'
        );
      },
    },
    {
      title: 'Accounts Payable',
      description: 'Money owed to vendors',
      isComplete: () => {
        if (!formData.hasAccountsPayable) return true;
        
        // For document upload mode
        if (!formData.manualEntryPreferences.accountsPayable) {
          return formData.documents.accountsPayable && formData.documents.accountsPayable.length > 0;
        }
        
        // For manual entry mode
        const payable = formData.accountsPayable[0];
        return Boolean(
          payable &&
          payable.vendorName &&
          payable.amount > 0 &&
          payable.dueDate &&
          payable.terms
        );
      },
    },
    {
      title: 'Accounts Receivable',
      description: 'Money owed by customers',
      isComplete: () => {
        if (!formData.hasAccountsReceivable) return true;
        
        if (!formData.manualEntryPreferences.accountsReceivable) {
          return Boolean(formData.documents.accountsReceivable?.length > 0);
        }
        
        const receivable = formData.accountsReceivable?.[0];
        return Boolean(
          receivable?.customerName &&
          receivable?.amount > 0 &&
          receivable?.dueDate &&
          receivable?.terms
        );
      },
    },
    {
      title: 'Loans',
      description: 'Business loans and financing',
      isComplete: () => {
        // If no loans selected, step is complete
        if (!formData.hasLoans) {
          return true;
        }

        const loan = formData.loans?.[0];
        if (!loan) {
          return false;
        }

        // Basic validation for both loan and lease
        const baseValidation = Boolean(
          loan.startDate &&
          loan.endDate
        );

        // Specific validation based on type
        if (loan.type === 'Loan') {
          return Boolean(
            baseValidation &&
            loan.purpose &&
            loan.amount > 0 &&
            loan.interestRate >= 0
          );
        } else {
          return Boolean(
            baseValidation &&
            loan.assetLeased &&
            loan.monthlyPayment > 0
          );
        }
      },
    },
    {
      title: 'VAT Registration',
      description: 'Tax information',
      isComplete: () => {
        if (!formData.isVatRegistered) return true;
        
        if (!formData.manualEntryPreferences.vatRegistration) {
          return Boolean(formData.documents.vatRegistration?.length > 0);
        }
        
        return Boolean(
          formData.trn &&
          formData.vatFrequency
        );
      },
    },
    {
      title: 'Owner\'s Capital',
      description: 'Capital contributions',
      isComplete: () => {
        if (!formData.hasCapitalContributions) return true
        return formData.capitalContributions?.length > 0 && formData.capitalContributions[0] && (
          formData.capitalContributions[0].amount > 0 && 
          formData.capitalContributions[0].date
        )
      },
    },
    {
      title: 'Equipment & Investments',
      description: 'Asset classification',
      isComplete: () => {
        if (!formData.hasEquipmentPurchases) return true
        return formData.equipmentPurchases?.length > 0 && formData.equipmentPurchases[0] && (
          formData.equipmentPurchases[0].name && 
          formData.equipmentPurchases[0].cost > 0 && 
          formData.equipmentPurchases[0].date
        )
      },
    },
    {
      title: 'Loan Repayments',
      description: 'Interest and principal split',
      isComplete: () => {
        if (!formData.hasLoanRepayments) return true
        return formData.loanRepayments?.length > 0 && formData.loanRepayments[0] && (
          formData.loanRepayments[0].amount > 0 && 
          formData.loanRepayments[0].date && 
          formData.loanRepayments[0].loanId
        )
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
            files.map(file => file.name)
          ))
          acc[key] = uniqueFiles
          return acc
        }, {} as Record<string, string[]>)
      }

      submitData.append('responses', JSON.stringify(formDataForJson))

      // Only append new File objects for upload
      Object.entries(formData.documents).forEach(([section, files]) => {
        files.forEach(file => {
          submitData.append(`documents_${section}`, file)
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
    if (!files) return;

    // Normalize filenames and check for duplicates
    const existingFiles = formData.documents[section];
    const existingNames = new Set(existingFiles.map(f => normalizeFileName(f.name)));
    
    const newFiles = Array.from(files).filter(file => 
      !existingNames.has(normalizeFileName(file.name))
    );

    setFormData({
      ...formData,
      documents: {
        ...formData.documents,
        [section]: [...existingFiles, ...newFiles]
      }
    });
  };

  const handleFileRemove = (section: keyof FormData['documents'], index: number) => {
    const newFiles = [...formData.documents[section]];
    newFiles.splice(index, 1);
    
    setFormData({
      ...formData,
      documents: {
        ...formData.documents,
        [section]: newFiles
      }
    });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <VStack spacing={8} align="stretch">
            <FormControl isRequired>
              <FormLabel fontSize="lg" mb={3}>Business Name</FormLabel>
              <Input
                placeholder="Enter your business name"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                size="lg"
                height="56px"
                fontSize="md"
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel fontSize="lg" mb={3}>Industry</FormLabel>
              <Input
                placeholder="e.g. Retail, Manufacturing, Services"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                size="lg"
                height="56px"
                fontSize="md"
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel fontSize="lg" mb={3}>Operating Since (Year)</FormLabel>
              <NumberInput
                min={1900}
                max={new Date().getFullYear()}
                value={formData.operatingSince || undefined}
                onChange={(_, valueNumber) => setFormData({ ...formData, operatingSince: valueNumber || 0 })}
                size="lg"
              >
                <NumberInputField
                  placeholder="Enter year"
                  height="56px"
                  fontSize="md"
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
                  Do you have any fixed or intangible assets?
                </Checkbox>
              </HStack>

              {formData.hasFixedAssets && (
                <Card mt={4} variant="outline">
                  <CardBody>
                    <Stack spacing={4}>
                      <FormControl isRequired>
                        <FormLabel>How would you like to provide fixed assets information?</FormLabel>
                        <RadioGroup
                          value={formData.manualEntryPreferences.fixedAssets ? 'manual' : 'upload'}
                          onChange={(value) => {
                            setFormData({ 
                              ...formData, 
                              manualEntryPreferences: {
                                ...formData.manualEntryPreferences,
                                fixedAssets: value === 'manual'
                              },
                              // Reset the data when switching between manual and upload
                              fixedAssets: value === 'manual' ? [{
                                name: '',
                                type: 'Equipment',
                                value: 0,
                                purchaseDate: '',
                                depreciationMethod: 'Straight-line',
                                usefulLife: 0,
                                isIntangible: false,
                                residualValue: 0,
                                description: ''
                              }] : [],
                              documents: {
                                ...formData.documents,
                                fixedAssets: value === 'upload' ? [] : formData.documents.fixedAssets
                              }
                            })
                          }}
                        >
                          <Stack direction="row" spacing={4}>
                            <Radio value="upload">Upload Documents</Radio>
                            <Radio value="manual">Enter Manually</Radio>
                          </Stack>
                        </RadioGroup>
                      </FormControl>

                      {!formData.manualEntryPreferences.fixedAssets ? (
                        <FormControl isRequired>
                          <FormLabel>Upload Fixed Assets Documents</FormLabel>
                          <Text fontSize="sm" color="gray.600" mb={2}>
                            Upload purchase invoices, depreciation schedules, or asset registers
                          </Text>
                          <Input
                            type="file"
                            multiple
                            accept=".pdf,.xls,.xlsx,.csv"
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
                        <>
                          <FormControl>
                            <FormLabel>Asset Information</FormLabel>
                            <Text fontSize="sm" color="gray.600" mb={2}>
                              Enter details for each asset
                            </Text>
                            <Select
                              placeholder="Select asset type"
                              value={formData.fixedAssets[0]?.type || ''}
                              onChange={(e) => {
                                const newAssets = [...formData.fixedAssets];
                                if (newAssets[0]) {
                                  newAssets[0].type = e.target.value as FixedAsset['type'];
                                  newAssets[0].isIntangible = ['Software', 'License'].includes(e.target.value);
                                }
                                setFormData({ ...formData, fixedAssets: newAssets });
                              }}
                            >
                              <option value="Equipment">Equipment</option>
                              <option value="Vehicle">Vehicle</option>
                              <option value="Furniture">Furniture</option>
                              <option value="Software">Software (Intangible)</option>
                              <option value="License">License (Intangible)</option>
                              <option value="Other">Other</option>
                            </Select>
                          </FormControl>

                          <FormControl>
                            <FormLabel>Name</FormLabel>
                            <Input
                              placeholder="Enter asset name"
                              value={formData.fixedAssets[0]?.name || ''}
                              onChange={(e) => {
                                const newAssets = [...formData.fixedAssets];
                                if (newAssets[0]) newAssets[0].name = e.target.value;
                                setFormData({ ...formData, fixedAssets: newAssets });
                              }}
                            />
                          </FormControl>

                          <FormControl>
                            <FormLabel>Description</FormLabel>
                            <Textarea
                              placeholder="Enter asset description"
                              value={formData.fixedAssets[0]?.description || ''}
                              onChange={(e) => {
                                const newAssets = [...formData.fixedAssets];
                                if (newAssets[0]) newAssets[0].description = e.target.value;
                                setFormData({ ...formData, fixedAssets: newAssets });
                              }}
                            />
                          </FormControl>

                          <FormControl>
                            <FormLabel>Purchase Value (AED)</FormLabel>
                            <Input
                              type="number"
                              value={formData.fixedAssets[0]?.value || ''}
                              onChange={(e) => {
                                const newAssets = [...formData.fixedAssets];
                                if (newAssets[0]) newAssets[0].value = parseFloat(e.target.value);
                                setFormData({ ...formData, fixedAssets: newAssets });
                              }}
                            />
                          </FormControl>

                          <FormControl>
                            <FormLabel>Residual Value (AED)</FormLabel>
                            <Input
                              type="number"
                              value={formData.fixedAssets[0]?.residualValue || ''}
                              onChange={(e) => {
                                const newAssets = [...formData.fixedAssets];
                                if (newAssets[0]) newAssets[0].residualValue = parseFloat(e.target.value);
                                setFormData({ ...formData, fixedAssets: newAssets });
                              }}
                            />
                          </FormControl>

                          <FormControl>
                            <FormLabel>Purchase Date</FormLabel>
                            <Input
                              type="date"
                              value={formData.fixedAssets[0]?.purchaseDate || ''}
                              onChange={(e) => {
                                const newAssets = [...formData.fixedAssets];
                                if (newAssets[0]) newAssets[0].purchaseDate = e.target.value;
                                setFormData({ ...formData, fixedAssets: newAssets });
                              }}
                            />
                          </FormControl>

                          <FormControl>
                            <FormLabel>Useful Life (years)</FormLabel>
                            <Input
                              type="number"
                              value={formData.fixedAssets[0]?.usefulLife || ''}
                              onChange={(e) => {
                                const newAssets = [...formData.fixedAssets];
                                if (newAssets[0]) newAssets[0].usefulLife = parseInt(e.target.value);
                                setFormData({ ...formData, fixedAssets: newAssets });
                              }}
                            />
                          </FormControl>

                          {!formData.fixedAssets[0]?.isIntangible && (
                            <FormControl>
                              <FormLabel>Depreciation Method</FormLabel>
                              <Select
                                value={formData.fixedAssets[0]?.depreciationMethod || ''}
                                onChange={(e) => {
                                  const newAssets = [...formData.fixedAssets];
                                  if (newAssets[0]) newAssets[0].depreciationMethod = e.target.value as 'Straight-line' | 'Declining balance';
                                  setFormData({ ...formData, fixedAssets: newAssets });
                                }}
                              >
                                <option value="Straight-line">Straight-line</option>
                                <option value="Declining balance">Declining balance</option>
                              </Select>
                            </FormControl>
                          )}
                        </>
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
                      <FormControl isRequired>
                        <FormLabel>How would you like to provide accounts payable information?</FormLabel>
                        <RadioGroup
                          value={formData.manualEntryPreferences.accountsPayable ? 'manual' : 'upload'}
                          onChange={(value) => {
                            const isManual = value === 'manual';
                            setFormData({
                              ...formData,
                              manualEntryPreferences: {
                                ...formData.manualEntryPreferences,
                                accountsPayable: isManual
                              },
                              // Reset the data when switching between manual and upload
                              accountsPayable: isManual ? [{
                                vendorName: '',
                                amount: 0,
                                dueDate: '',
                                description: '',
                                terms: ''
                              }] : [],
                              documents: {
                                ...formData.documents,
                                accountsPayable: isManual ? [] : formData.documents.accountsPayable
                              }
                            });
                          }}
                        >
                          <Stack direction="row" spacing={4}>
                            <Radio value="upload">Upload Documents</Radio>
                            <Radio value="manual">Enter Manually</Radio>
                          </Stack>
                        </RadioGroup>
                      </FormControl>

                      {!formData.manualEntryPreferences.accountsPayable ? (
                        <FormControl isRequired>
                          <FormLabel>Upload Accounts Payable Documents</FormLabel>
                          <Text fontSize="sm" color="gray.600" mb={2}>
                            Upload vendor invoices, statements, or aging reports
                          </Text>
                          <Input
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.xls,.xlsx"
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
                      <FormControl isRequired>
                        <FormLabel>How would you like to provide accounts receivable information?</FormLabel>
                        <RadioGroup
                          value={formData.manualEntryPreferences.accountsReceivable ? 'manual' : 'upload'}
                          onChange={(value) => {
                            setFormData({ 
                              ...formData, 
                              manualEntryPreferences: {
                                ...formData.manualEntryPreferences,
                                accountsReceivable: value === 'manual'
                              },
                              // Reset the data when switching between manual and upload
                              accountsReceivable: value === 'manual' ? [{ customerName: '', amount: 0, dueDate: '', description: '', terms: '' }] : [],
                              documents: {
                                ...formData.documents,
                                accountsReceivable: value === 'upload' ? [] : formData.documents.accountsReceivable
                              }
                            });
                          }}
                        >
                          <Stack direction="row" spacing={4}>
                            <Radio value="upload">Upload Documents</Radio>
                            <Radio value="manual">Enter Manually</Radio>
                          </Stack>
                        </RadioGroup>
                      </FormControl>

                      {!formData.manualEntryPreferences.accountsReceivable ? (
                        <FormControl isRequired>
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
                  onChange={(e) => {
                    const newFormData = { 
                      ...formData, 
                      hasLoans: e.target.checked,
                      manualEntryPreferences: {
                        ...formData.manualEntryPreferences,
                        loans: true // Set to true by default when loans are enabled
                      }
                    };
                    if (e.target.checked && (!newFormData.loans || !newFormData.loans.length)) {
                      newFormData.loans = [{
                        purpose: '',
                        amount: 0,
                        interestRate: 0,
                        monthlyPayment: 0,
                        startDate: '',
                        type: 'Loan' as const,
                        isActive: true,
                        endDate: '',
                        assetLeased: '',
                        leaseTerm: 0
                      }];
                    }
                    setFormData(newFormData);
                  }}
                  size="lg"
                >
                  Do you have any active business loans or lease agreements?
                </Checkbox>
              </HStack>

              {formData.hasLoans && (
                <Card mt={4} variant="outline">
                  <CardBody>
                    <Stack spacing={4}>
                      <FormControl>
                        <FormLabel>Type</FormLabel>
                        <Select
                          value={formData.loans?.[0]?.type || 'Loan'}
                          onChange={(e) => {
                            const newType = e.target.value as 'Loan' | 'Lease';
                            const newLoans = [...(formData.loans || [])];
                            
                            // Initialize or update the loan object based on type
                            newLoans[0] = {
                              // Common fields
                              startDate: formData.loans?.[0]?.startDate || '',
                              endDate: formData.loans?.[0]?.endDate || '',
                              isActive: true,
                              type: newType,
                              
                              // Type-specific fields with appropriate defaults
                              purpose: newType === 'Loan' ? (formData.loans?.[0]?.purpose || '') : '',
                              amount: newType === 'Loan' ? (formData.loans?.[0]?.amount || 0) : 0,
                              interestRate: newType === 'Loan' ? (formData.loans?.[0]?.interestRate || 0) : 0,
                              monthlyPayment: newType === 'Lease' ? (formData.loans?.[0]?.monthlyPayment || 0) : 0,
                              assetLeased: newType === 'Lease' ? (formData.loans?.[0]?.assetLeased || '') : '',
                              leaseTerm: newType === 'Lease' ? (formData.loans?.[0]?.leaseTerm || 0) : 0
                            };
                            
                            setFormData({ ...formData, loans: newLoans });
                          }}
                        >
                          <option value="Loan">Loan</option>
                          <option value="Lease">Lease</option>
                        </Select>
                      </FormControl>

                      <FormControl>
                        <FormLabel>{(formData.loans?.[0]?.type || 'Loan') === 'Lease' ? 'Asset Leased' : 'Purpose'}</FormLabel>
                        {(formData.loans?.[0]?.type || 'Loan') === 'Lease' ? (
                          <Input
                            placeholder="Enter leased asset description"
                            value={formData.loans?.[0]?.assetLeased || ''}
                            onChange={(e) => {
                              const newLoans = [...(formData.loans || [])];
                              if (!newLoans[0]) {
                                newLoans[0] = {
                                  purpose: '',
                                  amount: 0,
                                  interestRate: 0,
                                  monthlyPayment: 0,
                                  startDate: '',
                                  type: 'Lease',
                                  isActive: true,
                                  endDate: '',
                                  assetLeased: e.target.value,
                                  leaseTerm: 0
                                };
                              } else {
                                newLoans[0].assetLeased = e.target.value;
                              }
                              setFormData({ ...formData, loans: newLoans });
                            }}
                          />
                        ) : (
                          <Input
                            placeholder="Enter loan purpose"
                            value={formData.loans?.[0]?.purpose || ''}
                            onChange={(e) => {
                              const newLoans = [...(formData.loans || [])];
                              if (!newLoans[0]) {
                                newLoans[0] = {
                                  purpose: e.target.value,
                                  amount: 0,
                                  interestRate: 0,
                                  monthlyPayment: 0,
                                  startDate: '',
                                  type: 'Loan' as const,
                                  isActive: true,
                                  endDate: '',
                                  assetLeased: '',
                                  leaseTerm: 0
                                };
                              } else {
                                newLoans[0].purpose = e.target.value;
                              }
                              setFormData({ ...formData, loans: newLoans });
                            }}
                          />
                        )}
                      </FormControl>

                      <FormControl>
                        <FormLabel>{(formData.loans?.[0]?.type || 'Loan') === 'Lease' ? 'Monthly Payment (AED)' : 'Amount (AED)'}</FormLabel>
                        <Input
                          type="number"
                          value={(formData.loans?.[0]?.type || 'Loan') === 'Lease' 
                            ? formData.loans?.[0]?.monthlyPayment || ''
                            : formData.loans?.[0]?.amount || ''}
                          onChange={(e) => {
                            const newLoans = [...(formData.loans || [])];
                            if (!newLoans[0]) {
                              newLoans[0] = {
                                purpose: '',
                                amount: 0,
                                interestRate: 0,
                                monthlyPayment: 0,
                                startDate: '',
                                type: formData.loans?.[0]?.type || 'Loan',
                                isActive: true,
                                endDate: '',
                                assetLeased: '',
                                leaseTerm: 0
                              };
                            }
                            if (newLoans[0].type === 'Lease') {
                              newLoans[0].monthlyPayment = parseFloat(e.target.value) || 0;
                            } else {
                              newLoans[0].amount = parseFloat(e.target.value) || 0;
                            }
                            setFormData({ ...formData, loans: newLoans });
                          }}
                        />
                      </FormControl>

                      {(formData.loans?.[0]?.type || 'Loan') === 'Loan' && (
                        <FormControl>
                          <FormLabel>Interest Rate (%)</FormLabel>
                          <Input
                            type="number"
                            value={formData.loans?.[0]?.interestRate || ''}
                            onChange={(e) => {
                              const newLoans = [...(formData.loans || [])];
                              if (!newLoans[0]) {
                                newLoans[0] = {
                                  purpose: '',
                                  amount: 0,
                                  interestRate: parseFloat(e.target.value) || 0,
                                  monthlyPayment: 0,
                                  startDate: '',
                                  type: 'Loan' as const,
                                  isActive: true,
                                  endDate: '',
                                  assetLeased: '',
                                  leaseTerm: 0
                                };
                              } else {
                                newLoans[0].interestRate = parseFloat(e.target.value) || 0;
                              }
                              setFormData({ ...formData, loans: newLoans });
                            }}
                          />
                        </FormControl>
                      )}

                      {(formData.loans?.[0]?.type || 'Loan') === 'Lease' && (
                        <FormControl>
                          <FormLabel>Lease Term (months)</FormLabel>
                          <Input
                            type="number"
                            value={formData.loans?.[0]?.leaseTerm || ''}
                            onChange={(e) => {
                              const newLoans = [...(formData.loans || [])];
                              if (!newLoans[0]) {
                                newLoans[0] = {
                                  purpose: '',
                                  amount: 0,
                                  interestRate: 0,
                                  monthlyPayment: 0,
                                  startDate: '',
                                  type: 'Lease' as const,
                                  isActive: true,
                                  endDate: '',
                                  assetLeased: '',
                                  leaseTerm: parseInt(e.target.value) || 0
                                };
                              } else {
                                newLoans[0].leaseTerm = parseInt(e.target.value) || 0;
                              }
                              setFormData({ ...formData, loans: newLoans });
                            }}
                          />
                        </FormControl>
                      )}

                      <FormControl>
                        <FormLabel>Start Date</FormLabel>
                        <Input
                          type="date"
                          value={formData.loans?.[0]?.startDate || ''}
                          onChange={(e) => {
                            const newLoans = [...(formData.loans || [])];
                            if (!newLoans[0]) {
                              newLoans[0] = {
                                purpose: '',
                                amount: 0,
                                interestRate: 0,
                                monthlyPayment: 0,
                                startDate: e.target.value,
                                type: 'Loan' as const,
                                isActive: true,
                                endDate: '',
                                assetLeased: '',
                                leaseTerm: 0
                              };
                            } else {
                              newLoans[0].startDate = e.target.value;
                            }
                            setFormData({ ...formData, loans: newLoans });
                          }}
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel>End Date</FormLabel>
                        <Input
                          type="date"
                          value={formData.loans?.[0]?.endDate || ''}
                          onChange={(e) => {
                            const newLoans = [...(formData.loans || [])];
                            if (!newLoans[0]) {
                              newLoans[0] = {
                                purpose: '',
                                amount: 0,
                                interestRate: 0,
                                monthlyPayment: 0,
                                startDate: '',
                                type: 'Loan' as const,
                                isActive: true,
                                endDate: e.target.value,
                                assetLeased: '',
                                leaseTerm: 0
                              };
                            } else {
                              newLoans[0].endDate = e.target.value;
                            }
                            setFormData({ ...formData, loans: newLoans });
                          }}
                        />
                      </FormControl>

                      <FormControl>
                        <Checkbox
                          isChecked={formData.loans?.[0]?.isActive ?? true}
                          onChange={(e) => {
                            const newLoans = [...(formData.loans || [])];
                            if (!newLoans[0]) {
                              newLoans[0] = {
                                purpose: '',
                                amount: 0,
                                interestRate: 0,
                                monthlyPayment: 0,
                                startDate: '',
                                type: 'Loan' as const,
                                isActive: e.target.checked,
                                endDate: '',
                                assetLeased: '',
                                leaseTerm: 0
                              };
                            } else {
                              newLoans[0].isActive = e.target.checked;
                            }
                            setFormData({ ...formData, loans: newLoans });
                          }}
                        >
                          Is this {(formData.loans?.[0]?.type || 'Loan').toLowerCase()} still active?
                        </Checkbox>
                      </FormControl>
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
                          value={formData.manualEntryPreferences.vatRegistration ? 'manual' : 'upload'}
                          onChange={(value) => {
                            setFormData({ 
                              ...formData, 
                              manualEntryPreferences: {
                                ...formData.manualEntryPreferences,
                                vatRegistration: value === 'manual'
                              },
                              preferManualEntry: value === 'manual',
                              trn: '',
                              vatFrequency: '',
                              trackVat: false,
                              documents: {
                                ...formData.documents,
                                vatRegistration: value === 'upload' ? [] : formData.documents.vatRegistration
                              }
                            });
                          }}
                        >
                          <Stack direction="row" spacing={4}>
                            <Radio value="upload">Upload Documents</Radio>
                            <Radio value="manual">Enter Manually</Radio>
                          </Stack>
                        </RadioGroup>
                      </FormControl>

                      {!formData.manualEntryPreferences.vatRegistration ? (
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

      case 8:
        return (
          <VStack spacing={6} align="stretch">
            <FormControl>
              <HStack>
                <Checkbox
                  isChecked={formData.hasCapitalContributions}
                  onChange={(e) => {
                    const newFormData = { ...formData, hasCapitalContributions: e.target.checked };
                    if (e.target.checked && (!newFormData.capitalContributions || !newFormData.capitalContributions.length)) {
                      newFormData.capitalContributions = [{ amount: 0, date: '', proof: undefined }];
                    }
                    setFormData(newFormData);
                  }}
                  size="lg"
                >
                  Do you have any capital contributions?
                </Checkbox>
              </HStack>

              {formData.hasCapitalContributions && (
                <Card mt={4} variant="outline">
                  <CardBody>
                    <Stack spacing={4}>
                      <FormControl>
                        <FormLabel>Capital Contributions</FormLabel>
                        <Text fontSize="sm" color="gray.600" mb={2}>
                          Enter the amount and date of each capital contribution
                        </Text>
                        <Input
                          placeholder="Enter amount"
                          value={formData.capitalContributions?.[0]?.amount.toString() || ''}
                          onChange={(e) => {
                            const newContributions = [...(formData.capitalContributions || [])];
                            if (!newContributions[0]) {
                              newContributions[0] = { amount: 0, date: '', proof: undefined };
                            }
                            newContributions[0].amount = parseFloat(e.target.value) || 0;
                            setFormData({ ...formData, capitalContributions: newContributions });
                          }}
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Date</FormLabel>
                        <Input
                          type="date"
                          value={formData.capitalContributions?.[0]?.date || ''}
                          onChange={(e) => {
                            const newContributions = [...(formData.capitalContributions || [])];
                            if (!newContributions[0]) {
                              newContributions[0] = { amount: 0, date: '', proof: undefined };
                            }
                            newContributions[0].date = e.target.value;
                            setFormData({ ...formData, capitalContributions: newContributions });
                          }}
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Proof</FormLabel>
                        <Input
                          type="file"
                          accept=".pdf,.jpg,.png"
                          onChange={(e) => {
                            const newContributions = [...(formData.capitalContributions || [])];
                            if (!newContributions[0]) {
                              newContributions[0] = { amount: 0, date: '', proof: undefined };
                            }
                            if (e.target.files && e.target.files.length > 0) {
                              newContributions[0].proof = e.target.files[0];
                            } else {
                              newContributions[0].proof = undefined;
                            }
                            setFormData({ ...formData, capitalContributions: newContributions });
                          }}
                        />
                      </FormControl>
                    </Stack>
                  </CardBody>
                </Card>
              )}
            </FormControl>
          </VStack>
        )

      case 9:
        return (
          <VStack spacing={6} align="stretch">
            <FormControl>
              <HStack>
                <Checkbox
                  isChecked={formData.hasEquipmentPurchases}
                  onChange={(e) => {
                    const newFormData = { ...formData, hasEquipmentPurchases: e.target.checked };
                    if (e.target.checked && (!newFormData.equipmentPurchases || !newFormData.equipmentPurchases.length)) {
                      newFormData.equipmentPurchases = [{ name: '', cost: 0, date: '' }];
                    }
                    setFormData(newFormData);
                  }}
                  size="lg"
                >
                  Do you have any equipment purchases?
                </Checkbox>
              </HStack>

              {formData.hasEquipmentPurchases && (
                <Card mt={4} variant="outline">
                  <CardBody>
                    <Stack spacing={4}>
                      <FormControl>
                        <FormLabel>Equipment Purchases</FormLabel>
                        <Text fontSize="sm" color="gray.600" mb={2}>
                          Enter the name, cost, and date of each equipment purchase
                        </Text>
                        <Input
                          placeholder="Enter name"
                          value={formData.equipmentPurchases?.[0]?.name || ''}
                          onChange={(e) => {
                            const newPurchases = [...(formData.equipmentPurchases || [])];
                            if (!newPurchases[0]) {
                              newPurchases[0] = { name: '', cost: 0, date: '' };
                            }
                            newPurchases[0].name = e.target.value;
                            setFormData({ ...formData, equipmentPurchases: newPurchases });
                          }}
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Cost</FormLabel>
                        <Input
                          type="number"
                          value={formData.equipmentPurchases?.[0]?.cost.toString() || ''}
                          onChange={(e) => {
                            const newPurchases = [...(formData.equipmentPurchases || [])];
                            if (!newPurchases[0]) {
                              newPurchases[0] = { name: '', cost: 0, date: '' };
                            }
                            newPurchases[0].cost = parseFloat(e.target.value) || 0;
                            setFormData({ ...formData, equipmentPurchases: newPurchases });
                          }}
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Date</FormLabel>
                        <Input
                          type="date"
                          value={formData.equipmentPurchases?.[0]?.date || ''}
                          onChange={(e) => {
                            const newPurchases = [...(formData.equipmentPurchases || [])];
                            if (!newPurchases[0]) {
                              newPurchases[0] = { name: '', cost: 0, date: '' };
                            }
                            newPurchases[0].date = e.target.value;
                            setFormData({ ...formData, equipmentPurchases: newPurchases });
                          }}
                        />
                      </FormControl>
                    </Stack>
                  </CardBody>
                </Card>
              )}
            </FormControl>
          </VStack>
        )

      case 10:
        return (
          <VStack spacing={6} align="stretch">
            <FormControl>
              <HStack>
                <Checkbox
                  isChecked={formData.hasLoanRepayments}
                  onChange={(e) => {
                    const newFormData = { ...formData, hasLoanRepayments: e.target.checked };
                    if (e.target.checked && (!newFormData.loanRepayments || !newFormData.loanRepayments.length)) {
                      newFormData.loanRepayments = [{ amount: 0, date: '', loanId: '' }];
                    }
                    setFormData(newFormData);
                  }}
                  size="lg"
                >
                  Do you have any loan repayments?
                </Checkbox>
              </HStack>

              {formData.hasLoanRepayments && (
                <Card mt={4} variant="outline">
                  <CardBody>
                    <Stack spacing={4}>
                      <FormControl>
                        <FormLabel>Loan Repayments</FormLabel>
                        <Text fontSize="sm" color="gray.600" mb={2}>
                          Enter the amount, date, and loan ID of each loan repayment
                        </Text>
                        <Input
                          placeholder="Enter amount"
                          value={formData.loanRepayments?.[0]?.amount.toString() || ''}
                          onChange={(e) => {
                            const newRepayments = [...(formData.loanRepayments || [])];
                            if (!newRepayments[0]) {
                              newRepayments[0] = { amount: 0, date: '', loanId: '' };
                            }
                            newRepayments[0].amount = parseFloat(e.target.value) || 0;
                            setFormData({ ...formData, loanRepayments: newRepayments });
                          }}
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Date</FormLabel>
                        <Input
                          type="date"
                          value={formData.loanRepayments?.[0]?.date || ''}
                          onChange={(e) => {
                            const newRepayments = [...(formData.loanRepayments || [])];
                            if (!newRepayments[0]) {
                              newRepayments[0] = { amount: 0, date: '', loanId: '' };
                            }
                            newRepayments[0].date = e.target.value;
                            setFormData({ ...formData, loanRepayments: newRepayments });
                          }}
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Loan ID</FormLabel>
                        <Input
                          placeholder="Enter loan ID"
                          value={formData.loanRepayments?.[0]?.loanId || ''}
                          onChange={(e) => {
                            const newRepayments = [...(formData.loanRepayments || [])];
                            if (!newRepayments[0]) {
                              newRepayments[0] = { amount: 0, date: '', loanId: '' };
                            }
                            newRepayments[0].loanId = e.target.value;
                            setFormData({ ...formData, loanRepayments: newRepayments });
                          }}
                        />
                      </FormControl>
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
    <Box w="100%" minH="100vh" bg="gray.50">
      <Box maxW="100%" mx="auto" p={4}>
        <Box bg="white" borderRadius="xl" shadow="lg" p={8}>
          <VStack spacing={8} align="stretch" w="100%">
            <Box>
              <Heading size="xl" mb={4}>AI Bookkeeping Onboarding</Heading>
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
              spacing={6}
              align="flex-start"
              w="100%"
            >
              <Box
                w={{ base: 'full', md: '280px' }}
                position={{ base: 'relative', md: 'sticky' }}
                top={{ base: 0, md: '20px' }}
              >
                <Stack
                  direction={{ base: 'row', md: 'column' }}
                  spacing={3}
                  overflowX={{ base: 'auto', md: 'visible' }}
                  pb={{ base: 4, md: 0 }}
                >
                  {steps.map((step, index) => (
                    <Button
                      key={index}
                      onClick={() => setCurrentStep(index)}
                      variant={currentStep === index ? 'solid' : 'ghost'}
                      colorScheme={currentStep === index ? 'green' : 'gray'}
                      size="lg"
                      justifyContent="flex-start"
                      p={4}
                      whiteSpace="nowrap"
                      leftIcon={
                        <Box
                          w="32px"
                          h="32px"
                          borderRadius="full"
                          bg={currentStep === index ? 'white' : 'gray.200'}
                          color={currentStep === index ? 'green.500' : 'gray.600'}
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          fontSize="md"
                          fontWeight="bold"
                        >
                          {index + 1}
                        </Box>
                      }
                      isDisabled={!steps.slice(0, index).every(step => step.isComplete())}
                    >
                      <VStack
                        align="flex-start"
                        spacing={0}
                      >
                        <Text fontSize="md" fontWeight="medium">{step.title}</Text>
                        <Text 
                          fontSize="sm" 
                          color={currentStep === index ? 'whiteAlpha.800' : 'gray.500'}
                          display={{ base: 'none', md: 'block' }}
                        >
                          {step.description}
                        </Text>
                      </VStack>
                    </Button>
                  ))}
                </Stack>
              </Box>

              <Box flex="1" w="100%">
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
      </Box>
    </Box>
  )
} 