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
import React from 'react'
import { PageHeader } from '#features/common/components/page-header'
import { useProfitLoss } from '#features/bank-integrations/hooks/use-profit-loss'
import { LuChevronsUpDown, LuDownload } from 'react-icons/lu'
import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'
import { useApiCache } from '#features/common/hooks/use-api-cache'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

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

  const handleExportPDF = async () => {
    if (!contentRef.current) return;

    try {
      // Create a temporary container to hold all content
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.width = '1024px'; // Fixed width for consistent rendering

      // Add logo image to the container
      const logoImg = document.createElement('img');
      logoImg.src = logoRef.current?.src || '';
      logoImg.style.display = 'none';
      tempContainer.appendChild(logoImg);

      document.body.appendChild(tempContainer);

      // Clone the content
      const contentClone = contentRef.current.cloneNode(true) as HTMLElement;
      
      // Remove the summary footer from the cloned content before PDF generation
      const summaryFooterInClone = contentClone.querySelector('[data-summary-footer]');
      if (summaryFooterInClone) {
        summaryFooterInClone.remove();
      }
      
      tempContainer.appendChild(contentClone);

      // Generate PDF
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        logging: false,
        useCORS: true,
        width: 1024,
        height: tempContainer.offsetHeight,
        windowWidth: 1024,
        windowHeight: tempContainer.offsetHeight
      });

      // Clean up
      document.body.removeChild(tempContainer);

      const imgWidth = 190; // Reduced from 210 to add margins
      const pageHeight = 297; // A4 height in mm
      const marginX = 10; // Left and right margins in mm
      const marginY = 20; // Top margin
      const footerMargin = 15; // Bottom margin for page numbers
      const headerHeight = 15; // Height for header
      const pageNumberHeight = 15; // Height reserved for page numbers
      const contentStartY = marginY + headerHeight; // Y position where content starts
      
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', 'a4');

      // Function to add header to each page
      async function addHeader(pageNum: number): Promise<void> {
        pdf.setPage(pageNum);

        try {
          if (logoImg.complete && logoImg.naturalWidth > 0) {
            // Convert logo to data URL
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = logoImg.naturalWidth;
            tempCanvas.height = logoImg.naturalHeight;
            const tempCtx = tempCanvas.getContext('2d');
            
            if (tempCtx) {
              tempCtx.drawImage(logoImg, 0, 0);
              const logoData = tempCanvas.toDataURL('image/png');
              
              // Add logo at the top center with proper aspect ratio
              const logoWidth = 34; // Width in mm
              const aspectRatio = logoImg.naturalWidth / logoImg.naturalHeight;
              const logoHeight = logoWidth / aspectRatio; // Height adjusted by aspect ratio
              const logoX = (pdf.internal.pageSize.width - logoWidth) / 2;
              pdf.addImage(logoData, 'PNG', logoX, 5, logoWidth, logoHeight);
            }
          }
        } catch (error) {
          console.error('Error adding logo:', error);
          // Continue without logo if there's an error
        }

        // Add title and date below logo position regardless of logo loading success
        pdf.setFontSize(16);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Profit & Loss Report', pdf.internal.pageSize.width / 2, marginY + 5, { align: 'center' });
        
        pdf.setFontSize(10);
        pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, pdf.internal.pageSize.width / 2, marginY + 10, { align: 'center' });
      }

      // Function to add footer to each page
      function addFooter(pageNum: number, totalPages: number): void {
        pdf.setPage(pageNum);
        pdf.setFontSize(10);
        pdf.setTextColor(100);
        pdf.text(`Page ${pageNum} of ${totalPages}`, pdf.internal.pageSize.width / 2, pdf.internal.pageSize.height - (footerMargin / 2), { align: 'center' });
      }

      // Split content into pages
      let pageNum = 1;
      let currentY = contentStartY;
      let remainingHeight = imgHeight;

      while (remainingHeight > 0) {
        if (pageNum > 1) {
          pdf.addPage();
          currentY = contentStartY;
        }

        await addHeader(pageNum);

        // Calculate available height for content on this page
        const availableHeight = pageHeight - currentY - footerMargin - pageNumberHeight;
        const heightToDraw = Math.min(remainingHeight, availableHeight);

        // Calculate the portion of the image to draw
        const sourceY = ((imgHeight - remainingHeight) / imgHeight) * canvas.height;
        const sourceHeight = (heightToDraw / imgHeight) * canvas.height;

        // Create a temporary canvas for the portion we want to draw
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = sourceHeight;
        const tempCtx = tempCanvas.getContext('2d');
        
        if (tempCtx) {
          tempCtx.drawImage(
            canvas, 
            0, sourceY, canvas.width, sourceHeight, 
            0, 0, canvas.width, sourceHeight
          );
          
          // Draw portion of content
          const portionImgData = tempCanvas.toDataURL('image/png');
          pdf.addImage(
            portionImgData,
            'PNG',
            marginX,
            currentY,
            imgWidth,
            heightToDraw
          );
        }

        remainingHeight -= heightToDraw;
        if (remainingHeight > 0) {
          pageNum++;
        }
      }

      // Add page numbers to all pages
      for (let i = 1; i <= pageNum; i++) {
        addFooter(i, pageNum);
      }

      pdf.save('profit-loss-report.pdf');

      toast({
        title: "Export successful",
        description: "Your profit and loss report has been downloaded",
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
          alt="Muhasaba Logo"
          style={{ display: 'none' }}
          crossOrigin="anonymous"
          width="120px"
          height="auto"
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
                  onClick={handleExportPDF}
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
                <Box mb={8}>
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
                </Box>

                <Box mb={6}>
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
                </Box>
              </>
            ) : null}
          </Box>
        </Box>
      </Box>
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
