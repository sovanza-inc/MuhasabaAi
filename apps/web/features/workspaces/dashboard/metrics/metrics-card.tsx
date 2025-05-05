import {
  Card,
  CardBody,
  CardHeader,
  CardProps,
  Heading,
  Text,
  Box,
} from '@chakra-ui/react'

export interface MetricsCard extends Omit<CardProps, 'title'> {
  title?: React.ReactNode
  noPadding?: boolean
  subtitle?: string
  gridColumn?: { [key: string]: string }
}

export const MetricsCard: React.FC<MetricsCard> = (props) => {
  const { title, noPadding, children, subtitle, gridColumn, ...rest } = props
  const bodyProps = noPadding ? { px: 0 } : {}
  return (
    <Card {...rest} gridColumn={gridColumn}>
      <CardHeader>
        <Heading as="h3" size="sm" fontWeight="medium">
          {title}
        </Heading>
      </CardHeader>
      <CardBody pt="0" {...bodyProps}>
        <Box mb={4}>
          {subtitle && (
            <Text fontSize="sm" color="gray.600">{subtitle}</Text>
          )}
        </Box>
        {children}
      </CardBody>
    </Card>
  )
}
