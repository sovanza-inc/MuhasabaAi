import {
  Modal,
  ModalOverlay,
  ModalContent,
  Box,
  HStack,
  IconButton,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  ButtonGroup,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';

interface CashFlowItem {
  description: string;
  note?: string;
  amount2024: number;
  amount2023: number;
  indent?: number;
  isTotal?: boolean;
  isSubTotal?: boolean;
}

export interface FilteredCashFlowData {
  operatingActivities: CashFlowItem[];
  investingActivities: CashFlowItem[];
  financingActivities: CashFlowItem[];
  period: {
    startDate: Date;
    endDate: Date;
  };
}

interface EditablePdfPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (filteredData: FilteredCashFlowData) => void;
  data: {
    operatingActivities: CashFlowItem[];
    investingActivities: CashFlowItem[];
    financingActivities: CashFlowItem[];
  };
}

export const EditablePdfPreview: React.FC<EditablePdfPreviewProps> = ({
  isOpen,
  onClose,
  onExport,
  data
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'3mo' | '6mo' | '12mo'>('6mo');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Format date as "MMM DD" (e.g., "May 25")
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
  };

  const handlePrevMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  // Get the months for display based on selected period
  const getMonthsData = () => {
    const months = [];
    const periodMonths = selectedPeriod === '3mo' ? 3 : selectedPeriod === '6mo' ? 6 : 12;
    
    for (let i = 0; i < periodMonths; i++) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);
      months.unshift({
        month: date.toLocaleString('default', { month: 'short' }),
        year: date.getFullYear(),
        date: date
      });
    }
    return months;
  };

  const handleExport = () => {
    const monthsData = getMonthsData();
    onExport({
      ...data,
      period: {
        startDate: monthsData[0].date,
        endDate: monthsData[monthsData.length - 1].date
      }
    });
  };

  const calculateDelta = (current: number, previous: number) => {
    if (previous === 0) return current === 0 ? 0 : 100;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const renderSection = (title: string, items: CashFlowItem[]) => (
    <>
      <Tr>
        <Td 
          py="4" 
          pl="6" 
          fontWeight="semibold" 
          color="gray.700" 
          bg="gray.50"
          colSpan={4}
        >
          {title}
        </Td>
      </Tr>
      {items.map((item, index) => (
        <Tr key={index}>
          <Td 
            py="3" 
            pl={item.indent ? "14" : "6"} 
            color="gray.700"
            fontWeight={item.isSubTotal || item.isTotal ? "semibold" : "normal"}
          >
            {item.description}
          </Td>
          <Td 
            isNumeric 
            py="3"
            fontWeight={item.isSubTotal || item.isTotal ? "semibold" : "normal"}
          >
            {formatAmount(item.amount2024)}
          </Td>
          <Td 
            isNumeric 
            py="3"
            fontWeight={item.isSubTotal || item.isTotal ? "semibold" : "normal"}
          >
            {formatAmount(item.amount2023)}
          </Td>
          <Td 
            isNumeric 
            py="3" 
            pr="6"
            fontWeight={item.isSubTotal || item.isTotal ? "semibold" : "normal"}
          >
            {calculateDelta(item.amount2024, item.amount2023).toFixed(1)}%
          </Td>
        </Tr>
      ))}
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <ModalOverlay bg="whiteAlpha.800" backdropFilter="blur(2px)" />
      <ModalContent maxW="95vw" mx="4" rounded="lg" overflow="hidden">
        <Box bg="white" px="6" py="4" borderBottom="1px" borderColor="gray.100">
          <HStack justify="space-between">
            <HStack spacing="4">
              <IconButton
                aria-label="Previous month"
                icon={<LuChevronLeft />}
                variant="ghost"
                size="sm"
                onClick={handlePrevMonth}
                color="gray.600"
              />
              <Text fontSize="md" fontWeight="medium" color="gray.700">
                {formatDate(currentDate)}
              </Text>
              <IconButton
                aria-label="Next month"
                icon={<LuChevronRight />}
                variant="ghost"
                size="sm"
                onClick={handleNextMonth}
                color="gray.600"
              />
            </HStack>
            <HStack spacing="2">
              <ButtonGroup size="sm" isAttached variant="outline">
                <Button
                  onClick={() => setSelectedPeriod('3mo')}
                  isActive={selectedPeriod === '3mo'}
                >
                  3mo
                </Button>
                <Button
                  onClick={() => setSelectedPeriod('6mo')}
                  isActive={selectedPeriod === '6mo'}
                >
                  6mo
                </Button>
                <Button
                  onClick={() => setSelectedPeriod('12mo')}
                  isActive={selectedPeriod === '12mo'}
                >
                  12mo
                </Button>
              </ButtonGroup>
              <Button
                colorScheme="blue"
                size="sm"
                onClick={handleExport}
              >
                Export PDF
              </Button>
            </HStack>
          </HStack>
        </Box>

        <Box p="6" overflowX="auto" maxW="100%">
          <Box minW="fit-content">
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th 
                    py="4" 
                    pl="6" 
                    color="gray.600" 
                    fontSize="xs" 
                    textTransform="uppercase" 
                    fontWeight="medium"
                    borderBottom="1px"
                    borderColor="gray.200"
                  >
                    Description
                  </Th>
                  <Th
                    isNumeric
                    py="4"
                    color="gray.600"
                    fontSize="xs"
                    textTransform="uppercase"
                    fontWeight="medium"
                    borderBottom="1px"
                    borderColor="gray.200"
                  >
                    {currentDate.getFullYear()}
                  </Th>
                  <Th
                    isNumeric
                    py="4"
                    color="gray.600"
                    fontSize="xs"
                    textTransform="uppercase"
                    fontWeight="medium"
                    borderBottom="1px"
                    borderColor="gray.200"
                  >
                    {currentDate.getFullYear() - 1}
                  </Th>
                  <Th
                    isNumeric
                    py="4"
                    pr="6"
                    color="gray.600"
                    fontSize="xs"
                    textTransform="uppercase"
                    fontWeight="medium"
                    borderBottom="1px"
                    borderColor="gray.200"
                  >
                    Δ YoY (%)
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {renderSection('Operating Activities', data.operatingActivities)}
                {renderSection('Investing Activities', data.investingActivities)}
                {renderSection('Financing Activities', data.financingActivities)}
              </Tbody>
            </Table>
          </Box>
        </Box>
        <Text p="4" color="gray.600" fontSize="sm">Don&apos;t forget to review before exporting</Text>
      </ModalContent>
    </Modal>
  );
};
