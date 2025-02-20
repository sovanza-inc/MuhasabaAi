'use client'

import { Box, HStack, Text, Flex, Input, InputGroup, InputLeftElement, Image } from '@chakra-ui/react'
import { LuArrowLeft, LuSearch, LuBell, LuUser } from 'react-icons/lu'

export const PageHeader = () => {
  return (
    <Box borderBottom="1px solid" borderColor="gray.100" bg="white" px={8} py={4}>
      <Flex justify="space-between" align="center">
        {/* Left: Restart
        <HStack spacing={2} color="#105157" cursor="pointer">
          <LuArrowLeft size={18} />
          <Text fontSize="md">Restart</Text>
        </HStack> */}

        {/* Center: Logo */}
        <Image 
          src="/img/onboarding/muhasaba-logo.png" 
          alt="Muhasaba Logo" 
          height="32px"
        />

        {/* Right: Search & Icons */}
        {/* <HStack spacing={4}>
          <InputGroup maxW="240px">
            <InputLeftElement>
              <LuSearch color="gray.400" />
            </InputLeftElement>
            <Input 
              placeholder="Search" 
              size="sm"
              rounded="md"
              borderColor="gray.200"
            />
          </InputGroup>
          <HStack spacing={3}>
            <Box as={LuBell} size={20} color="gray.600" cursor="pointer" />
            <Box as={LuUser} size={20} color="gray.600" cursor="pointer" />
          </HStack>
        </HStack> */}
      </Flex>
    </Box>
  )
} 