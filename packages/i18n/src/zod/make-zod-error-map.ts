import { FormatDateOptions, IntlShape } from '@formatjs/intl'
import { z } from 'zod'

import { errorMessages } from './error-messages'

// Docs https://zod.dev/ERROR_HANDLING?id=error-map-priority
export function makeZodErrorMap<T>(
  issue: z.ZodIssueOptionalMessage,
  intl: IntlShape<T>,
) {
  const descriptorItem = getDescriptorItem<T>(issue, intl)

  return descriptorItem.key in errorMessages
    ? {
        message: intl.formatMessage(
          errorMessages[descriptorItem.key as keyof typeof errorMessages],
          descriptorItem.values,
        ),
      }
    : { message: intl.formatMessage(errorMessages['default']) }
}

export function getDescriptorItem<T>(
  issue: z.ZodIssueOptionalMessage,
  intl: IntlShape<T>,
): {
  key: string
  values?: Record<string, string | number>
} {
  if (issue.code === z.ZodIssueCode.invalid_string) {
    return {
      key: `string.invalid.${issue.validation}`,
    }
  }

  if (issue.code === z.ZodIssueCode.not_multiple_of) {
    return {
      key: `number.${issue.code}`,
    }
  }

  if (issue.code === z.ZodIssueCode.invalid_date) {
    return { key: `date.${issue.code}` }
  }

  if (
    issue.code === z.ZodIssueCode.too_small &&
    issue.type === 'string' &&
    issue.minimum === 1
  ) {
    return { key: 'string.required' }
  }

  if (
    issue.code === z.ZodIssueCode.too_small ||
    issue.code === z.ZodIssueCode.too_big
  ) {
    let value =
      issue.code === z.ZodIssueCode.too_small
        ? issue.minimum
        : issue.code === z.ZodIssueCode.too_big
          ? issue.maximum
          : '-'

    /**
     * The intl.formatMessage function does not support bigint values to be passed as values. That's why we have to
     * handle these values and format them already here.
     */
    if (typeof value === 'bigint') {
      value = intl.formatNumber(value)
    }

    if (issue.type === 'date') {
      const date = new Date(value)

      if (isNaN(date.getTime())) {
        value = '-'
      } else {
        const dateOptions: FormatDateOptions = {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }

        const timeOptions: FormatDateOptions | null =
          date.getHours() === 0 && date.getMinutes() === 0
            ? null
            : {
                hour: '2-digit',
                minute: '2-digit',
              }

        value = intl.formatDate(value, {
          ...dateOptions,
          ...timeOptions,
        })
      }
    }

    return {
      key: issue.exact
        ? `${issue.type}.exact`
        : `${issue.type}.${issue.code}.${
            issue.inclusive ? 'inclusive' : 'exclusive'
          }`,
      values: {
        value,
      },
    }
  }

  return { key: 'default' }
}
