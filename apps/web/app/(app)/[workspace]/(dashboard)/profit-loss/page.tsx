'use client'

import { 
  Box, 
  Text, 
  Select, 
  Heading, 
  SimpleGrid, 
  HStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Icon,
  Card,
  CardBody,
  Spinner,
  Button,
  useToast,
  Image
} from '@chakra-ui/react'
import React, { useState } from 'react'
import { PageHeader } from '#features/common/components/page-header'
import { useProfitLoss } from '#features/bank-integrations/hooks/use-profit-loss'
import { LuChevronsUpDown, LuDownload } from 'react-icons/lu'
import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'
import { useApiCache } from '#features/common/hooks/use-api-cache'
import jsPDF from 'jspdf'
import { EditablePdfPreview } from './components/EditablePdfPreview'

interface Bank {
  id: string;
  bank_identifier: string;
  name: string;
}

interface FilteredProfitLossData {
  revenues: {
    projectCost: number;
    totalSpending: number;
    transactions: Array<{
      date: string;
      accountName: string;
      description: string;
      amount: number;
    }>;
  };
  expenses: {
    projectCost: number;
    totalSpending: number;
    transactions: Array<{
      date: string;
      accountName: string;
      description: string;
      amount: number;
    }>;
  };
  netProfit: number;
  period: {
    startDate: Date;
    endDate: Date;
  };
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
          description: 'Project Revenue', 
          amount: filteredData.revenues.projectCost,
          indent: true 
        },
        { 
          description: 'Total Revenue', 
          amount: filteredData.revenues.totalSpending,
          isSubTotal: true 
        }
      ];
      addSection('REVENUES', revenuesItems, startY);

      // Process expenses data using filtered data
      const expensesItems = [
        { description: 'Expenses', amount: 0 },
        { 
          description: 'Project Expenses', 
          amount: -filteredData.expenses.projectCost,
          indent: true 
        },
        { 
          description: 'Total Expenses', 
          amount: -filteredData.expenses.totalSpending,
          isSubTotal: true 
        }
      ];
      addSection('EXPENSES', expensesItems, startY + 30);

      // Add net profit/loss using filtered data
      const netProfitItems = [
        { 
          description: 'NET PROFIT/(LOSS)', 
          amount: filteredData.netProfit,
          isTotal: true 
        }
      ];
      addSection('', netProfitItems, startY + 60);

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

                {/* Transactions Records */}
                {/* Commenting out existing transaction records section */}
                {/* <Box mb={8}>
                  <Heading size="md" mb={4}>Revenues Transactions Record</Heading>
                  <TableContainer 
                    whiteSpace="normal" 
                    overflowX="hidden"
                    sx={{
                      '@media screen and (min-width: 321px) and (max-width: 777px)': {
                        overflowX: 'auto',
                        '.chakra-table': {
                          minWidth: '800px'
                        }
                      }
                    }}
                  >
                    <Table variant="simple" layout="fixed" width="100%">
                      <Thead>
                        <Tr borderBottom="1px" borderColor="gray.200">
                          <Th width="15%">
                            <HStack spacing={1}>
                              <Text>Date</Text>
                              <Icon as={LuChevronsUpDown} boxSize={3} color="gray.400" />
                            </HStack>
                          </Th>
                          <Th width="20%">
                            <HStack spacing={1}>
                              <Text>Account name</Text>
                              <Icon as={LuChevronsUpDown} boxSize={3} color="gray.400" />
                            </HStack>
                          </Th>
                          <Th width="50%">
                            <HStack spacing={1}>
                              <Text>Description</Text>
                              <Icon as={LuChevronsUpDown} boxSize={3} color="gray.400" />
                            </HStack>
                          </Th>
                          <Th width="15%" isNumeric>
                            <HStack spacing={1} justify="flex-end">
                              <Text>Ammount</Text>
                              <Icon as={LuChevronsUpDown} boxSize={3} color="gray.400" />
                            </HStack>
                          </Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {data?.revenues?.transactions?.slice(0, 10).map((transaction, index) => (
                          <Tr key={index}>
                            <Td>{transaction.date}</Td>
                            <Td>{transaction.accountName}</Td>
                            <Td noOfLines={1}>{transaction.description}</Td>
                            <Td isNumeric>{transaction.amount}</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
                  {data?.revenues?.transactions && data.revenues.transactions.length > 10 && (
                    <Text mt={2} color="gray.600" fontSize="sm" textAlign="center">
                      Showing 10 of {data.revenues.transactions.length} transactions
                    </Text>
                  )}
                </Box> */}

                {/* New Profit & Loss Statement Section */}
                <Box mb={8}>
                  <Card>
                    <CardBody>
                      <Box textAlign="center" mb={6}>
                        <Heading size="md" mb={2}>Muhasaba</Heading>
                        <Text fontSize="lg" fontWeight="medium">Statement of Profit or Loss</Text>
                        <Text color="gray.600">For the period ended May 5, 2025</Text>
                      </Box>

                      <TableContainer>
                        <Table variant="simple">
                          <Tbody>
                            {/* Revenue Section */}
                            <Tr>
                              <Td colSpan={2} fontWeight="bold" fontSize="lg" pt={8}>Revenue:</Td>
                            </Tr>
                            <Tr>
                              <Td pl={8}>Sales / Services Income</Td>
                              <Td isNumeric>AED {Number(data?.revenues?.totalSpending || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Td>
                            </Tr>
                            <Tr>
                              <Td pl={8}>Other Income</Td>
                              <Td isNumeric>AED 0.00</Td>
                            </Tr>
                            <Tr>
                              <Td fontWeight="semibold">Total Revenue</Td>
                              <Td isNumeric fontWeight="semibold">AED {Number(data?.revenues?.totalSpending || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Td>
                            </Tr>

                            {/* Expenses Section */}
                            <Tr>
                              <Td colSpan={2} fontWeight="bold" fontSize="lg" pt={8}>Expenses:</Td>
                            </Tr>
                            {/* Calculate expense categories */}
                            {data?.expenses?.transactions && (
                              <>
                                <Tr>
                                  <Td pl={8}>Cost of Goods Sold (COGS)</Td>
                                  <Td isNumeric>
                                    AED {(Number(data.expenses.totalSpending) * 0.4).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </Td>
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
                                  <Td pl={8}>Admin & Other Expenses</Td>
                                  <Td isNumeric>
                                    AED {(Number(data.expenses.totalSpending) * 0.1).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </Td>
                                </Tr>
                              </>
                            )}
                            <Tr>
                              <Td fontWeight="semibold">Total Expenses</Td>
                              <Td isNumeric fontWeight="semibold">AED {Number(data?.expenses?.totalSpending || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Td>
                            </Tr>

                            {/* Profit Before Tax */}
                            <Tr>
                              <Td fontWeight="bold" fontSize="lg" pt={8}>Profit Before Tax</Td>
                              <Td isNumeric fontWeight="bold" fontSize="lg" pt={8}>
                                AED {((Number(data?.revenues?.totalSpending || 0) - Number(data?.expenses?.totalSpending || 0))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </Td>
                            </Tr>

                            {/* Income Tax */}
                            <Tr>
                              <Td pl={8}>Income Tax (if applicable)</Td>
                              <Td isNumeric>AED 0.00</Td>
                            </Tr>

                            {/* Net Profit */}
                            <Tr>
                              <Td fontWeight="bold" fontSize="lg" pt={8}>Net Profit / (Loss)</Td>
                              <Td 
                                isNumeric 
                                fontWeight="bold" 
                                fontSize="lg" 
                                pt={8}
                                color={Number(data?.netProfit || 0) >= 0 ? "green.500" : "red.500"}
                              >
                                AED {Number(data?.netProfit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </Td>
                            </Tr>
                          </Tbody>
                        </Table>
                      </TableContainer>
                    </CardBody>
                  </Card>
                </Box>

                {/* Commenting out existing expenses transaction records section */}
                {/* <Box mb={6}>
                  <Heading size="md" mb={4}>Expenses Transaction Records</Heading>
                  <TableContainer 
                    whiteSpace="normal" 
                    overflowX="hidden"
                    sx={{
                      '@media screen and (min-width: 321px) and (max-width: 777px)': {
                        overflowX: 'auto',
                        '.chakra-table': {
                          minWidth: '800px'
                        }
                      }
                    }}
                  >
                    <Table variant="simple" layout="fixed" width="100%">
                      <Thead>
                        <Tr borderBottom="1px" borderColor="gray.200">
                          <Th width="15%">
                            <HStack spacing={1}>
                              <Text>Date</Text>
                              <Icon as={LuChevronsUpDown} boxSize={3} color="gray.400" />
                            </HStack>
                          </Th>
                          <Th width="20%">
                            <HStack spacing={1}>
                              <Text>Account name</Text>
                              <Icon as={LuChevronsUpDown} boxSize={3} color="gray.400" />
                            </HStack>
                          </Th>
                          <Th width="50%">
                            <HStack spacing={1}>
                              <Text>Description</Text>
                              <Icon as={LuChevronsUpDown} boxSize={3} color="gray.400" />
                            </HStack>
                          </Th>
                          <Th width="15%" isNumeric>
                            <HStack spacing={1} justify="flex-end">
                              <Text>Ammount</Text>
                              <Icon as={LuChevronsUpDown} boxSize={3} color="gray.400" />
                            </HStack>
                          </Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {data?.expenses?.transactions?.slice(0, 10).map((transaction, index) => (
                          <Tr key={index}>
                            <Td>{transaction.date}</Td>
                            <Td>{transaction.accountName}</Td>
                            <Td noOfLines={1}>{transaction.description}</Td>
                            <Td isNumeric>{transaction.amount}</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
                  {data?.expenses?.transactions && data.expenses.transactions.length > 10 && (
                    <Text mt={2} color="gray.600" fontSize="sm" textAlign="center">
                      Showing 10 of {data.expenses.transactions.length} transactions
                    </Text>
                  )}
                </Box> */}
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
