import React, { useState } from 'react'

import {
  Badge,
  IconButton,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Stack,
} from '@chakra-ui/react'
import { LuCheck } from 'react-icons/lu'

interface ColorControlProps {
  colors: string[]
  onChange(color: string): void
  value?: string
}

export function ColorControl({ colors, onChange, value }: ColorControlProps) {
  const [opened, setOpened] = useState(false)

  const swatches = colors.map((color) => (
    <IconButton
      aria-label={`Select color ${color}`}
      onClick={() => onChange(color)}
      isRound
      size="xs"
      key={color}
      bg={color}
      opacity="0.8"
      color="white"
      _selected={{
        opacity: '1',
        _hover: {
          bg: color,
        },
      }}
      _hover={{
        opacity: '1',
        outline: '2px solid',
        outlineOffset: '1px',
        outlineColor: color,
      }}
      data-selected={value === color ? '' : undefined}
    >
      {value === color && <LuCheck size="1.2em" />}
    </IconButton>
  ))

  return (
    <Popover
      isOpen={opened}
      onClose={() => setOpened(false)}
      placement="bottom"
      isLazy
    >
      <PopoverTrigger>
        <IconButton
          aria-label="Change primary color"
          icon={<Badge rounded="full" boxSize="2.5" bg={value} />}
          variant="secondary"
          bg="chakra-body-bg"
          onClick={() => setOpened((o) => !o)}
        />
      </PopoverTrigger>
      <PopoverContent width="auto">
        <Stack gap="2" flexDirection="row" p="2">
          {swatches}
        </Stack>
      </PopoverContent>
    </Popover>
  )
}
