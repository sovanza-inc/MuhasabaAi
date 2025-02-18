import { Avatar, Box, Container, HStack, Text } from '@chakra-ui/react'
import { Link } from '@saas-ui/react'

export const Testimonial = () => {
  return (
    <Container>
      <HStack mb="4" spacing="4">
        <Avatar
          bg="white"
          src="https://avatars.githubusercontent.com/u/muhasabaai"
          name="Abdullah Rahman"
        />
        <Box>
          <Text color="white" fontSize="md" fontWeight="medium">
            Abdullah Rahman
          </Text>
          <Text color="whiteAlpha.700" fontSize="md">
            Islamic Finance Advisor at <Link href="https://muhasaba.ai">Muhasaba AI</Link>
          </Text>
        </Box>
      </HStack>
      <Text color="white" fontSize="lg">
        &ldquo;Muhasaba AI has transformed how we manage Islamic finance operations. The Shariah-compliant insights and automated Zakat calculations have been invaluable for our clients. A must-have tool for any Muslim business owner.&rdquo;
      </Text>
    </Container>
  )
}
