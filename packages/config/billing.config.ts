import type { BillingPlan } from '@saas-ui-pro/billing'

// Extend the BillingFeature type to include the 'included' property
type CustomBillingFeature = BillingPlan['features'][number] & {
  included?: boolean
}

// Update the BillingPlan type to use our custom feature type
type CustomBillingPlan = Omit<BillingPlan, 'features'> & {
  features: CustomBillingFeature[]
}

export const plans: CustomBillingPlan[] = [
  {
    id: 'premium',
    active: true,
    name: 'Premium Plan',
    description: 'Full access to all features for 499 AED per month.',
    currency: 'AED',
    interval: 'month',
    features: [
      {
        id: 'users',
        priceId: 'price_1RSDvmB7S6nOH9harkSZJrQY',
        type: 'per_unit',
        price: 499,
        label: 'Unlimited users',
        included: true
      },
      {
        id: 'inbox',
        included: true
      },
      {
        id: 'contacts',
        included: true
      },
      {
        id: 'monthly_active_contacts',
        label: 'Unlimited MACs',
        included: true
      },
      {
        id: 'api',
        included: true
      },
      {
        id: 'automations',
        included: true
      },
    ],
    metadata: {
      price: '499',
      priceLabel: 'AED per month',
      productId: 'prod_SMxr61ySaXc0h9',
    },
  },
]

export const features = [
  {
    id: 'users',
    label: 'Users',
    description: 'Number of users.',
  },
  {
    id: 'inbox',
    label: 'Shared inbox',
    description: 'Collaborate with your team.',
  },
  {
    id: 'contacts',
    label: 'Contacts',
    description: 'Manage your customers.',
  },
  {
    id: 'monthly_active_contacts',
    label: 'Monthly active contacts',
    description: 'The number of contacts that have activity.',
  },
  {
    id: 'api',
    label: 'API access',
    description: 'Build custom integrations.',
  },
  {
    id: 'automations',
    label: 'Automations',
    description: 'Automate your workflows.',
  },
]
