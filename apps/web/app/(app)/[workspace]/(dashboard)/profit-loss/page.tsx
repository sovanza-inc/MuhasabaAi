'use client'

import { 
  Box, 
  Text, 
  Select, 
  Heading, 
  SimpleGrid, 
  HStack,
  Table,
  // Thead,
  Tbody,
  Tr,
  // Th,
  Td,
  TableContainer,
  // Icon,
  Card,
  CardBody,
  Spinner,
  Button,
  useToast,
  Image,
  IconButton
} from '@chakra-ui/react'
import React, { useState } from 'react'
import { PageHeader } from '#features/common/components/page-header'
import { useProfitLoss } from '#features/bank-integrations/hooks/use-profit-loss'
import { LuDownload, LuPlus } from 'react-icons/lu'
import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'
import { useApiCache } from '#features/common/hooks/use-api-cache'
import jsPDF from 'jspdf'
import { EditablePdfPreview } from './components/EditablePdfPreview'
import { FilteredProfitLossData, CustomStatement } from './types'
import { z } from 'zod'
import { useModals } from '@saas-ui/react'

interface Bank {
  id: string;
  bank_identifier: string;
  name: string;
}

export default function ProfitLossPage() {
  const { data, isLoading, error, selectBank } = useProfitLoss();
  const [banks, setBanks] = React.useState<Bank[]>([]);
  const [selectedBankId, setSelectedBankId] = React.useState<string>('all');
  const [authToken, setAuthToken] = React.useState<string | null>(null);
  const [customerId, setCustomerId] = React.useState<string | null>(null);
  const [workspace] = useCurrentWorkspace();
  const { CACHE_KEYS, prefetchData } = useApiCache();
  const contentRef = React.useRef<HTMLDivElement>(null);
  const toast = useToast();
  const logoRef = React.useRef<HTMLImageElement>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [customStatements, setCustomStatements] = useState<CustomStatement[]>([]);
  const modals = useModals();
  
  // Load custom statements from local storage on mount
  React.useEffect(() => {
    if (workspace?.id) {
      const storageKey = `customStatements_${workspace.id}`;
      const savedStatements = localStorage.getItem(storageKey);
      if (savedStatements) {
        try {
          const parsedStatements = JSON.parse(savedStatements);
          setCustomStatements(parsedStatements);
        } catch (error) {
          console.error('Error parsing saved statements:', error);
          localStorage.removeItem(storageKey);
        }
      }
    }
  }, [workspace?.id]);

  // Save custom statements to local storage whenever they change
  React.useEffect(() => {
    if (workspace?.id) {
      const storageKey = `customStatements_${workspace.id}`;
      localStorage.setItem(storageKey, JSON.stringify(customStatements));
    }
  }, [customStatements, workspace?.id]);

  // Clear storage on auth token change (indicates login/logout)
  React.useEffect(() => {
    if (!authToken && workspace?.id) {
      const storageKey = `customStatements_${workspace.id}`;
      localStorage.removeItem(storageKey);
    }
  }, [authToken, workspace?.id]);

  // Initialize auth token and customer ID
  React.useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get auth token
        const authResponse = await fetch('/api/bank-integration/auth', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!authResponse.ok) {
          throw new Error('Failed to authenticate');
          // Clear storage on auth failure
          if (workspace?.id) {
            const storageKey = `customStatements_${workspace.id}`;
            localStorage.removeItem(storageKey);
          }
        }
        
        const authData = await authResponse.json();
        setAuthToken(authData.access_token);

        // Check if customer exists
        const customerCheckResponse = await fetch(`/api/bank-integration/get-customer?app_user_id=${workspace.id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authData.access_token}`
          }
        });

        if (customerCheckResponse.ok) {
          const customerData = await customerCheckResponse.json();
          setCustomerId(customerData.customer_id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear storage on auth error
        if (workspace?.id) {
          const storageKey = `customStatements_${workspace.id}`;
          localStorage.removeItem(storageKey);
        }
      }
    }

    if (workspace?.id) {
      initializeAuth();
    }
  }, [workspace?.id]);

  // Fetch connected banks
  React.useEffect(() => {
    const fetchBanks = async () => {
      if (!customerId || !authToken) return;

      try {
        // Create a unique cache key that includes the customer ID
        const cacheKey = `${CACHE_KEYS.ACCOUNTS}_${customerId}`;
        const cachedData = await prefetchData(
          cacheKey,
          async () => {
            const response = await fetch(`/api/bank-integration/accounts?customer_id=${customerId}`, {
              headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${authToken}`
              }
            });

            const data = await response.json();
            
            if (!response.ok) {
              throw new Error(data.details || 'Failed to fetch connected banks');
            }

            return data;
          }
        );

        setBanks(cachedData);
      } catch (error) {
        console.error('Error fetching connected banks:', error);
      }
    };

    fetchBanks();
  }, [customerId, authToken, prefetchData, CACHE_KEYS.ACCOUNTS]);

  // Handle bank selection
  const handleBankSelect = (bankId: string) => {
    setSelectedBankId(bankId);
    selectBank(bankId);
  };

  const handleExportClick = () => {
    setIsPreviewOpen(true);
  };

  const handleAddStatement = async (type: 'income' | 'expense') => {
    const schema = z.object({
      name: z.string().min(1, 'Name is required'),
      amount: z.string().min(1, 'Amount is required').transform(val => Number(val)),
      date: z.string().optional(),
      amountType: z.enum(['deposit', 'expense']).default('deposit')
    });

    type FormData = z.infer<typeof schema>;

    const onSubmit = (data: FormData) => {
      const newStatement: CustomStatement = {
        id: Math.random().toString(36).substr(2, 9),
        name: data.name,
        amount: data.amountType === 'expense' ? -Math.abs(data.amount) : Math.abs(data.amount),
        date: data.date || new Date().toISOString().split('T')[0],
        type,
        amountType: data.amountType
      };

      setCustomStatements(prev => [...prev, newStatement]);

      toast({
        title: "Statement added",
        description: `New ${type} statement has been added successfully`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      modals.closeAll(); // Explicitly close all modals after successful submission
      return true;
    };

    modals.form({
      title: `Add New ${type === 'income' ? 'Income' : 'Expense'} Statement`,
      schema,
      defaultValues: {
        date: new Date().toISOString().split('T')[0]
      },
      onSubmit,
      fields: {
        name: {
          label: 'Statement Name',
          placeholder: 'Enter statement name'
        },
        amount: {
          label: 'Amount (AED)',
          type: 'number',
          placeholder: '0.00'
        },
        amountType: {
          label: 'Amount Type',
          type: 'select',
          options: [
            { label: 'Deposit', value: 'deposit' },
            { label: 'Expense', value: 'expense' }
          ]
        },
        date: {
          label: 'Date',
          type: 'date'
        }
      }
    });
  };

  const handleExportPDF = async (filteredData: FilteredProfitLossData) => {
    if (!contentRef.current || !logoRef.current) return;

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.width;
      const pageHeight = pdf.internal.pageSize.height;
      const margin = 20;

      // Helper function to format amounts consistently
      const formatAmount = (amount: number) => {
        const absAmount = Math.abs(amount);
        const formatted = absAmount.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
        return amount < 0 ? `(${formatted})` : formatted;
      };

      // Helper function to add header with consistent styling
      const addHeader = async (pageNum: number) => {
        pdf.setPage(pageNum);

        // Add logo on the right
        try {
          const logoCanvas = document.createElement('canvas');
          const logoCtx = logoCanvas.getContext('2d');
          if (logoCtx && logoRef.current) {
            logoCanvas.width = logoRef.current.naturalWidth;
            logoCanvas.height = logoRef.current.naturalHeight;
            logoCtx.drawImage(logoRef.current, 0, 0);
            const logoData = logoCanvas.toDataURL('image/png');
            const logoWidth = 40;
            const aspectRatio = logoRef.current.naturalWidth / logoRef.current.naturalHeight;
            const logoHeight = logoWidth / aspectRatio;
            const logoX = pageWidth - margin - logoWidth;
            pdf.addImage(logoData, 'PNG', logoX, margin - 5, logoWidth, logoHeight);
          }
        } catch (error) {
          console.error('Error adding logo:', error);
        }

        // Add title and date with consistent styling
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Muhasaba', margin, margin + 5);
        
        pdf.setFontSize(14);
        pdf.text('PROFIT AND LOSS STATEMENT', margin, margin + 12);
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        const periodStart = filteredData.period.startDate;
        const periodEnd = filteredData.period.endDate;
        pdf.text(
          `For the Period ${periodStart.toLocaleString('default', { month: 'long', year: 'numeric' })} to ${periodEnd.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
          margin,
          margin + 18
        );
        
        // Add column headers with consistent styling
        const startY = margin + 30;
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        
        pdf.text('Description', margin, startY);
        pdf.text('Amount', pageWidth - margin, startY, { align: 'right' });
        
        // Consistent header underline
        pdf.setLineWidth(0.2);
        pdf.line(margin, startY + 1, pageWidth - margin, startY + 1);
        
        return startY + 8;
      };

      // Helper function to add section with consistent styling
      const addSection = (title: string, items: any[], startY: number) => {
        let currentY = startY;
        
        // Section title with consistent styling
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.text(title, margin, currentY);
        currentY += 6;
        
        // Items with consistent styling
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        items.forEach(item => {
          const xPos = margin + (item.indent ? 5 : 0);
          
          if (item.isTotal || item.isSubTotal) {
            pdf.setFont('helvetica', 'bold');
          }
          
          // Consistent text alignment
          pdf.text(item.description, xPos, currentY);
          
          const amountText = formatAmount(item.amount);
          pdf.text(amountText, pageWidth - margin, currentY, { align: 'right' });
          
          // Consistent line styling for totals and subtotals
          if (item.isTotal) {
            pdf.setLineWidth(0.2);
            pdf.line(pageWidth - margin - 70, currentY + 1, pageWidth - margin, currentY + 1);
            pdf.line(pageWidth - margin - 70, currentY + 2, pageWidth - margin, currentY + 2);
          } else if (item.isSubTotal) {
            pdf.setLineWidth(0.2);
            pdf.line(pageWidth - margin - 70, currentY + 1, pageWidth - margin, currentY + 1);
          }
          
          pdf.setFont('helvetica', 'normal');
          currentY += 6;
        });
      };

      const startY = await addHeader(1);

      // Process revenues data using filtered data
      const revenuesItems = [
        { description: 'Revenue', amount: 0 },
        { 
          description: 'Sales / Service Income', 
          amount: filteredData.revenues.totalSpending,
          indent: true 
        },
        // Add custom income statements
        ...customStatements
          .filter(statement => statement.type === 'income')
          .map(statement => ({
            description: statement.name,
            amount: statement.amount,
            indent: true,
            date: statement.date
          })),
        {
          description: 'Other Operating Income',
          amount: filteredData.calculations.otherIncome,
          indent: true
        },
        { 
          description: 'Total Income', 
          amount: filteredData.revenues.totalSpending + 
                  filteredData.calculations.otherIncome +
                  customStatements
                    .filter(statement => statement.type === 'income')
                    .reduce((total, statement) => total + statement.amount, 0),
          isSubTotal: true 
        }
      ];
      addSection('REVENUES', revenuesItems, startY);

      // Calculate next section Y position based on number of items
      const expensesStartY = startY + (revenuesItems.length * 6) + 10;

      // Process expenses data using filtered data
      const expensesItems = [
        { description: 'Cost of Goods Sold (COGS)', amount: filteredData.calculations.cogs },
        { 
          description: 'Gross Profit', 
          amount: filteredData.calculations.grossProfit +
                  customStatements
                    .filter(statement => statement.type === 'income')
                    .reduce((total, statement) => total + statement.amount, 0),
          isSubTotal: true 
        },
        { description: 'Operating Expenses:', amount: 0 },
        {
          description: 'Salaries & Wages',
          amount: filteredData.calculations.operatingExpenses.salariesAndWages,
          indent: true
        },
        {
          description: 'Rent & Utilities',
          amount: filteredData.calculations.operatingExpenses.rentAndUtilities,
          indent: true
        },
        {
          description: 'Marketing & Advertising',
          amount: filteredData.calculations.operatingExpenses.marketingAndAdvertising,
          indent: true
        },
        {
          description: 'Administrative Expenses',
          amount: filteredData.calculations.operatingExpenses.administrativeExpenses,
          indent: true
        },
        {
          description: 'Depreciation',
          amount: filteredData.calculations.operatingExpenses.depreciation,
          indent: true
        },
        {
          description: 'Amortization',
          amount: filteredData.calculations.operatingExpenses.amortization,
          indent: true
        },
        // Add custom expense statements
        ...customStatements
          .filter(statement => statement.type === 'expense')
          .map(statement => ({
            description: statement.name,
            amount: statement.amount,
            indent: true,
            date: statement.date
          })),
        {
          description: 'Total Operating Expenses',
          amount: filteredData.calculations.operatingExpenses.total +
                  customStatements
                    .filter(statement => statement.type === 'expense')
                    .reduce((total, statement) => total + statement.amount, 0),
          isSubTotal: true
        },
        {
          description: 'Operating Profit',
          amount: filteredData.calculations.operatingProfit +
                  customStatements
                    .filter(statement => statement.type === 'income')
                    .reduce((total, statement) => total + statement.amount, 0) -
                  customStatements
                    .filter(statement => statement.type === 'expense')
                    .reduce((total, statement) => total + statement.amount, 0),
          isSubTotal: true
        },
        {
          description: 'Finance Costs',
          amount: filteredData.calculations.financeCosts,
          indent: true
        },
        { 
          description: 'Total Expenses', 
          amount: -(filteredData.calculations.cogs + 
                   filteredData.calculations.operatingExpenses.total + 
                   filteredData.calculations.financeCosts +
                   customStatements
                    .filter(statement => statement.type === 'expense')
                    .reduce((total, statement) => total + statement.amount, 0)),
          isSubTotal: true 
        }
      ];
      addSection('EXPENSES', expensesItems, expensesStartY);

      // Calculate next section Y position based on number of items
      const netProfitStartY = expensesStartY + (expensesItems.length * 6) + 10;

      // Add net profit/loss using filtered data
      const netProfitItems = [
        { 
          description: 'NET PROFIT/(LOSS)', 
          amount: filteredData.netProfit +
                  customStatements
                    .filter(statement => statement.type === 'income')
                    .reduce((total, statement) => total + statement.amount, 0) -
                  customStatements
                    .filter(statement => statement.type === 'expense')
                    .reduce((total, statement) => total + statement.amount, 0),
          isTotal: true 
        }
      ];
      addSection('', netProfitItems, netProfitStartY);

      // Add footer note
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'italic');
      const footerNote = 'The accompanying notes are an integral part of these financial statements.';
      pdf.text(footerNote, margin, pageHeight - margin);

      // Save the PDF
      pdf.save('profit-and-loss-statement.pdf');

      toast({
        title: "Export successful",
        description: "Your profit & loss statement has been downloaded",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Export failed",
        description: "There was an error exporting your report",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  if (error) {
    return (
      <Box p={8}>
        <Text color="red.500">Error loading profit & loss data: {error}</Text>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader />
      <Box p={4}>
        {/* Hidden logo for PDF generation */}
        <Image
          ref={logoRef}
          src="/img/onboarding/muhasaba-logo.png"
          alt="Muhasaba"
          style={{ display: 'none' }}
          crossOrigin="anonymous"
          width="30px"
          height="15px"
        />
        
        <Box 
          height="calc(100vh - 65px)"
          position="relative"
          display="flex"
          flexDirection="column"
          overflowY="auto"
          sx={{
            '&::-webkit-scrollbar': {
              display: 'none'
            },
            msOverflowStyle: 'none',
            scrollbarWidth: 'none'
          }}
        >
          {/* Reports Section */}
          <Box mb={6}>
            <Box mb={4}>
              <HStack 
                justify="space-between" 
                align="center"
                sx={{
                  '@media screen and (min-width: 321px) and (max-width: 740px)': {
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '1rem'
                  }
                }}
              >
                <Box>
                  <Heading size="lg" mb={2}>Profit & Loss</Heading>
                  <Text color="gray.600" mb={4} fontSize="md">
                    Effortlessly view and analyze your financial reports in one place with real-time insights and data updates.
                  </Text>
                </Box>
                <Button
                  leftIcon={<LuDownload />}
                  colorScheme="green"
                  onClick={handleExportClick}
                  isLoading={isLoading}
                >
                  Export as PDF
                </Button>
              </HStack>
            </Box>

            <Box display="flex" justifyContent="flex-end" mb={4}>
              <Select 
                maxW="200px"
                value={selectedBankId}
                onChange={(e) => {
                  handleBankSelect(e.target.value);
                }}
                bg="green.50"
                color="green.500"
                borderColor="green.200"
                _hover={{
                  borderColor: "green.300"
                }}
              >
                <option value="all">All Banks</option>
                {banks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.bank_identifier || bank.name}
                  </option>
                ))}
              </Select>
            </Box>
          </Box>

          <Box ref={contentRef}>
            {isLoading ? (
              <Box display="flex" justifyContent="center" p={8}>
                <Spinner size="xl" />
              </Box>
            ) : data ? (
              <>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={6}>
                  {/* Revenues Card */}
                  <Card borderTop="4px solid" borderTopColor="green.400">
                    <CardBody>
                      <Heading size="md" mb={4}>Revenues</Heading>
                      <SimpleGrid columns={3} gap={4}>
                        <Box>
                          <Text color="gray.600" fontSize="sm">Project cost:</Text>
                          <Text fontSize="md">${data.revenues.projectCost}</Text>
                        </Box>
                        <Box>
                          <Text color="gray.600" fontSize="sm">Total spending:</Text>
                          <Text fontSize="md">${data.revenues.totalSpending}</Text>
                        </Box>
                        <Box>
                          <Text color="gray.600" fontSize="sm">This Month</Text>
                          <Text fontSize="md">{data.revenues.thisMonth}</Text>
                        </Box>
                      </SimpleGrid>
                    </CardBody>
                  </Card>

                  {/* Expenses Card */}
                  <Card borderTop="4px solid" borderTopColor="green.400">
                    <CardBody>
                      <Heading size="md" mb={4}>Expenses</Heading>
                      <SimpleGrid columns={3} gap={4}>
                        <Box>
                          <Text color="gray.600" fontSize="sm">Project cost:</Text>
                          <Text fontSize="md">${data.expenses.projectCost}</Text>
                        </Box>
                        <Box>
                          <Text color="gray.600" fontSize="sm">Total spending:</Text>
                          <Text fontSize="md">${data.expenses.totalSpending}</Text>
                        </Box>
                        <Box>
                          <Text color="gray.600" fontSize="sm">This Month</Text>
                          <Text fontSize="md">{data.expenses.thisMonth}</Text>
                        </Box>
                      </SimpleGrid>
                    </CardBody>
                  </Card>
                </SimpleGrid>

                {/* New Profit & Loss Statement Section */}
                  <Card>
                    <CardBody>
                      <Box textAlign="center" mb={6}>
                        <Heading size="md" mb={2}>Muhasaba</Heading>
                        <Text fontSize="lg" fontWeight="medium">Statement of Profit or Loss</Text>
                      <Text color="gray.600">For the period ended {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                    </Box>

                    {/* Revenue Section */}
                    <Box mb={8} borderRadius="lg" overflow="hidden">
                      <Box bg="blue.50" p={4} display="flex" alignItems="center" justifyContent="space-between">
                        <Heading size="md" color="blue.700">INCOME</Heading>
                        <IconButton
                          aria-label="Add income statement"
                          icon={<LuPlus />}
                          size="sm"
                          colorScheme="blue"
                          variant="ghost"
                          onClick={() => handleAddStatement('income')}
                        />
                      </Box>
                      <Box p={4} bg="white">
                      <TableContainer>
                        <Table variant="simple">
                          <Tbody>
                            <Tr>
                                <Td pl={8}>Sales / Service Income</Td>
                              <Td isNumeric>AED {Number(data?.revenues?.totalSpending || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Td>
                            </Tr>
                            {/* Custom Income Statements */}
                            {customStatements
                              .filter(statement => statement.type === 'income')
                              .map(statement => (
                                <Tr key={statement.id}>
                                  <Td pl={8}>{statement.name}</Td>
                                  <Td isNumeric>AED {statement.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Td>
                                </Tr>
                              ))
                            }
                            <Tr>
                                <Td pl={8}>
                                  <HStack>
                                    <Text>Other Operating Income</Text>
                                    <Text fontSize="xs" color="gray.500">(Optional)</Text>
                                  </HStack>
                                </Td>
                                <Td isNumeric>AED {(data?.revenues?.transactions?.reduce((total: number, transaction) => {
                                  // Sum up transactions marked as other operating income
                                  if (transaction.description?.toLowerCase().includes('other income') ||
                                      transaction.description?.toLowerCase().includes('misc income') ||
                                      transaction.description?.toLowerCase().includes('miscellaneous income')) {
                                    return total + Number(transaction.amount);
                                  }
                                  return total;
                                }, 0) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Td>
                            </Tr>
                              <Tr borderTop="1px" borderColor="gray.100">
                                <Td fontWeight="bold" color="blue.700">Total Income</Td>
                                <Td isNumeric fontWeight="bold" color="blue.700">
                                  AED {(
                                    Number(data?.revenues?.totalSpending || 0) +
                                    (data?.revenues?.transactions?.reduce((total: number, transaction) => {
                                      if (transaction.description?.toLowerCase().includes('other income') ||
                                          transaction.description?.toLowerCase().includes('misc income') ||
                                          transaction.description?.toLowerCase().includes('miscellaneous income')) {
                                        return total + Number(transaction.amount);
                                      }
                                      return total;
                                    }, 0) || 0) +
                                    // Add custom income statements
                                    customStatements
                                      .filter(statement => statement.type === 'income')
                                      .reduce((total, statement) => total + statement.amount, 0)
                                  ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </Td>
                            </Tr>
                            </Tbody>
                          </Table>
                        </TableContainer>
                      </Box>
                    </Box>

                            {/* Expenses Section */}
                    <Box mb={8} borderRadius="lg" overflow="hidden">
                      <Box bg="red.50" p={4} display="flex" alignItems="center" justifyContent="space-between">
                        <Heading size="md" color="red.700">EXPENSES</Heading>
                        <IconButton
                          aria-label="Add expense statement"
                          icon={<LuPlus />}
                          size="sm"
                          colorScheme="red"
                          variant="ghost"
                          onClick={() => handleAddStatement('expense')}
                        />
                      </Box>
                      <Box p={4} bg="white">
                        <TableContainer>
                          <Table variant="simple">
                            <Tbody>
                            {data?.expenses?.transactions && (
                              <>
                                  {/* COGS */}
                                <Tr>
                                  <Td pl={8}>Cost of Goods Sold (COGS)</Td>
                                  <Td isNumeric>
                                    AED {(Number(data.expenses.totalSpending) * 0.4).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </Td>
                                </Tr>

                                  {/* Custom Expense Statements */}
                                  {customStatements
                                    .filter(statement => statement.type === 'expense')
                                    .map(statement => (
                                      <Tr key={statement.id}>
                                        <Td pl={8}>{statement.name}</Td>
                                        <Td isNumeric>AED {statement.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Td>
                                      </Tr>
                                    ))
                                  }

                                  {/* Gross Profit Calculation */}
                                  <Tr borderTop="1px" borderColor="gray.100" bg="gray.50">
                                    <Td fontWeight="bold" color="blue.700">Gross Profit</Td>
                                    <Td isNumeric fontWeight="bold" color="blue.700">
                                      AED {(
                                        Number(data?.revenues?.totalSpending || 0) - 
                                        (Number(data.expenses.totalSpending) * 0.4)
                                      ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </Td>
                                  </Tr>

                                  {/* Operating Expenses */}
                                  <Tr>
                                    <Td pl={8} fontWeight="medium" pt={6}>Operating Expenses:</Td>
                                    <Td></Td>
                                  </Tr>
                                <Tr>
                                  <Td pl={8}>Salaries & Wages</Td>
                                  <Td isNumeric>
                                    AED {(Number(data.expenses.totalSpending) * 0.25).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </Td>
                                </Tr>
                                <Tr>
                                  <Td pl={8}>Rent & Utilities</Td>
                                  <Td isNumeric>
                                    AED {(Number(data.expenses.totalSpending) * 0.15).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </Td>
                                </Tr>
                                <Tr>
                                  <Td pl={8}>Marketing & Advertising</Td>
                                  <Td isNumeric>
                                    AED {(Number(data.expenses.totalSpending) * 0.1).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </Td>
                                </Tr>
                                <Tr>
                                    <Td pl={8}>Administrative Expenses</Td>
                                  <Td isNumeric>
                                    AED {(Number(data.expenses.totalSpending) * 0.1).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </Td>
                                </Tr>

                                  {/* Depreciation Section */}
                                  <Tr>
                                    <Td pl={8}>
                                      <HStack>
                                        <Text>Depreciation</Text>
                                        <Text fontSize="xs" color="gray.500">(Cost of Asset ÷ Useful Life)</Text>
                                      </HStack>
                                    </Td>
                                    <Td isNumeric>
                                      AED {(
                                        // This should come from backend, using placeholder values
                                        (100000 / 5) // Example: Asset cost 100,000 AED, 5 years life
                                      ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </Td>
                            </Tr>

                                  {/* Amortization Section */}
                                  <Tr>
                                    <Td pl={8}>
                                      <HStack>
                                        <Text>Amortization</Text>
                                        <Text fontSize="xs" color="gray.500">(Intangible Cost ÷ Useful Life)</Text>
                                      </HStack>
                                    </Td>
                                    <Td isNumeric>
                                      AED {(
                                        // This should come from backend, using placeholder values
                                        (50000 / 3) // Example: Intangible cost 50,000 AED, 3 years life
                                      ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </Td>
                                  </Tr>

                                  {/* Total Operating Expenses */}
                                  <Tr borderTop="1px" borderColor="gray.100">
                                    <Td pl={8} fontWeight="semibold">Total Operating Expenses</Td>
                                    <Td isNumeric fontWeight="semibold">
                                      AED {(
                                        (Number(data.expenses.totalSpending) * 0.25) + // Salaries
                                        (Number(data.expenses.totalSpending) * 0.15) + // Rent
                                        (Number(data.expenses.totalSpending) * 0.1) +  // Marketing
                                        (Number(data.expenses.totalSpending) * 0.1) +  // Admin
                                        (100000 / 5) + // Depreciation
                                        (50000 / 3)    // Amortization
                                      ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </Td>
                                  </Tr>

                                  {/* Operating Profit */}
                                  <Tr borderTop="1px" borderColor="gray.100" bg="gray.50">
                                    <Td fontWeight="bold" color="blue.700">Operating Profit</Td>
                                    <Td isNumeric fontWeight="bold" color="blue.700">
                                      AED {(
                                        // Gross Profit
                                        (Number(data?.revenues?.totalSpending || 0) - (Number(data.expenses.totalSpending) * 0.4)) -
                                        // Minus Operating Expenses
                                        ((Number(data.expenses.totalSpending) * 0.25) + // Salaries
                                        (Number(data.expenses.totalSpending) * 0.15) + // Rent
                                        (Number(data.expenses.totalSpending) * 0.1) +  // Marketing
                                        (Number(data.expenses.totalSpending) * 0.1) +  // Admin
                                        (100000 / 5) + // Depreciation
                                        (50000 / 3))   // Amortization
                                      ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </Td>
                            </Tr>

                                  {/* Finance Costs Section */}
                                  <Tr>
                                    <Td pl={8}>
                                      <HStack>
                                        <Text>Finance Costs</Text>
                                        <Text fontSize="xs" color="gray.500">(Loan × Rate ÷ 12)</Text>
                                      </HStack>
                                    </Td>
                                    <Td isNumeric>
                                      AED {(
                                        // This should come from backend, using placeholder values
                                        (1000000 * 0.05 / 12) + // Loan: 1M AED at 5% annual rate
                                        (500000 * 0.06 / 12)    // Lease: 500K AED at 6% annual rate
                                      ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </Td>
                            </Tr>

                                  {/* Total Expenses */}
                                  <Tr borderTop="1px" borderColor="gray.100">
                                    <Td fontWeight="bold" color="red.700">Total Expenses</Td>
                                    <Td isNumeric fontWeight="bold" color="red.700">
                                      AED {(
                                        (Number(data.expenses.totalSpending) * 0.4) + // COGS
                                        (Number(data.expenses.totalSpending) * 0.25) + // Salaries
                                        (Number(data.expenses.totalSpending) * 0.15) + // Rent
                                        (Number(data.expenses.totalSpending) * 0.1) +  // Marketing
                                        (Number(data.expenses.totalSpending) * 0.1) +  // Admin
                                        (100000 / 5) + // Depreciation
                                        (50000 / 3) + // Amortization
                                        ((1000000 * 0.05 / 12) + (500000 * 0.06 / 12)) + // Finance Costs
                                        // Add custom expense statements
                                        customStatements
                                          .filter(statement => statement.type === 'expense')
                                          .reduce((total, statement) => total + statement.amount, 0)
                                      ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </Td>
                                  </Tr>
                                </>
                              )}
                            </Tbody>
                          </Table>
                        </TableContainer>
                      </Box>
                    </Box>

                    {/* Net Profit/Loss Section */}
                    <Box p={4} bg="gray.50" borderRadius="lg">
                      <TableContainer>
                        <Table variant="simple">
                          <Tbody>
                            <Tr>
                              <Td fontWeight="bold" fontSize="lg" color="gray.700">NET PROFIT/(LOSS)</Td>
                              <Td 
                                isNumeric 
                                fontWeight="bold" 
                                fontSize="lg" 
                                color={Number(data?.netProfit || 0) >= 0 ? "green.600" : "red.600"}
                              >
                                AED {(
                                  // Operating Profit
                                  ((Number(data?.revenues?.totalSpending || 0) - (Number(data.expenses.totalSpending) * 0.4)) -
                                  ((Number(data.expenses.totalSpending) * 0.25) + // Salaries
                                  (Number(data.expenses.totalSpending) * 0.15) + // Rent
                                  (Number(data.expenses.totalSpending) * 0.1) +  // Marketing
                                  (Number(data.expenses.totalSpending) * 0.1) +  // Admin
                                  (100000 / 5) + // Depreciation
                                  (50000 / 3))) -
                                  // Minus Finance Costs
                                  ((1000000 * 0.05 / 12) + (500000 * 0.06 / 12)) +
                                  // Add custom income statements
                                  customStatements
                                    .filter(statement => statement.type === 'income')
                                    .reduce((total, statement) => total + statement.amount, 0) -
                                  // Subtract custom expense statements
                                  customStatements
                                    .filter(statement => statement.type === 'expense')
                                    .reduce((total, statement) => total + statement.amount, 0)
                                ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </Td>
                            </Tr>
                          </Tbody>
                        </Table>
                      </TableContainer>
                    </Box>
                    </CardBody>
                  </Card>
              </>
            ) : null}
          </Box>
        </Box>
      </Box>

      <EditablePdfPreview
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onExport={handleExportPDF}
        data={data || {
          revenues: {
            projectCost: '0',
            totalSpending: '0',
            thisMonth: '0%',
            transactions: []
          },
          expenses: {
            projectCost: '0',
            totalSpending: '0',
            thisMonth: '0%',
            transactions: []
          },
          netProfit: '0'
        }}
      />

      {/* Summary Footer */}
      <Box 
        bg="teal.700" 
        color="white" 
        p={4}
        data-summary-footer
        position="sticky"
        bottom={0}
        zIndex={1}
      >
        <HStack justify="space-between">
          <Text>Summary: Revenue-Expenses</Text>
          <Text>Net Profit: ${data?.netProfit || '0'}</Text>
        </HStack>
      </Box>
    </Box>
  )
}
