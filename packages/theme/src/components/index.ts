import { cardTheme } from './card'
import { pageTheme } from './page'
import { toolbarTheme } from './toolbar'

export const components = {
  Card: cardTheme,
  SuiToolbar: toolbarTheme,
  SuiPage: pageTheme,
  Button: {
    defaultProps: {
      colorScheme: 'green',
    },
  },
  SubmitButton: {
    defaultProps: {
      colorScheme: 'green',
    },
  },
}
