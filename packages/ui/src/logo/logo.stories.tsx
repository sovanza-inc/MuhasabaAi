import { Meta } from '@storybook/react'

import { Logo, LogoIcon } from './'

export default {
  title: 'Components/Logo',
  component: Logo,
} as Meta

export const Default = {
  args: {},
}

export const Icon = {
  render: () => <LogoIcon />,
}
