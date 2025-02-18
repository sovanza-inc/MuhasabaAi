import { useCallback } from 'react'

import {
  AspectRatio,
  Flex,
  Img,
  Stack,
  StackProps,
  Text,
  useColorMode,
} from '@chakra-ui/react'
import { useStepperContext } from '@saas-ui/react'

import { OnboardingStep } from './onboarding-step'
import { appearanceSchema } from './schema/appearance.schema'

// Define theme mode type to avoid repetition
type ThemeMode = 'light' | 'dark'

interface ThemeOptionProps extends Omit<StackProps, 'onSelect'> {
  mode: ThemeMode
  isSelected: boolean
  onSelect: (mode: ThemeMode) => void
}

const themeStyles = {
  light: {
    bg: 'gray.50',
    hoverBg: 'blackAlpha.50',
  },
  dark: {
    bg: 'gray.800',
    hoverBg: 'whiteAlpha.50',
  },
} as const

function ThemeOption({
  mode,
  isSelected,
  onSelect,
  ...stackProps
}: ThemeOptionProps) {
  return (
    <Stack
      flex="1"
      p="8"
      role="radio"
      aria-checked={isSelected}
      cursor="pointer"
      _hover={{ bg: themeStyles[mode].hoverBg }}
      onClick={() => onSelect(mode)}
      {...stackProps}
    >
      <AspectRatio
        ratio={16 / 9}
        height="100px"
        borderRadius="md"
        overflow="hidden"
        borderWidth="1px"
        bg={themeStyles[mode].bg}
        data-selected={isSelected ? '' : undefined}
        _selected={{
          borderColor: 'primary.500',
          shadow: 'outline',
        }}
      >
        <Img
          src={`/img/onboarding/${mode}.svg`}
          alt={`${mode} theme preview`}
          loading="lazy"
        />
      </AspectRatio>
      <Text textTransform="capitalize">{mode}</Text>
    </Stack>
  )
}

export function AppearanceStep() {
  const stepper = useStepperContext()
  const { colorMode, setColorMode } = useColorMode()

  const handleSubmit = useCallback(async () => {
    stepper.nextStep()
  }, [stepper])

  return (
    <OnboardingStep
      schema={appearanceSchema}
      title="Choose your style"
      description="You can change the color mode at any time in your profile settings."
      defaultValues={{}}
      onSubmit={handleSubmit}
      submitLabel="Continue"
    >
      <Flex m="-6" role="radiogroup" aria-label="Select colour theme">
        <ThemeOption
          mode="light"
          isSelected={colorMode === 'light'}
          onSelect={setColorMode}
        />
        <ThemeOption
          mode="dark"
          isSelected={colorMode === 'dark'}
          onSelect={setColorMode}
        />
      </Flex>
    </OnboardingStep>
  )
}
