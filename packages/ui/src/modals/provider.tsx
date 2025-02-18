import { createModals } from '@saas-ui/modals'

import { FormDialog } from '../form'

export const { ModalsProvider, useModals } = createModals({
  modals: {
    form: FormDialog,
  },
})
