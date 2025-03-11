import type { BillingPlan } from '@saas-ui-pro/billing'

export const plans: BillingPlan[] = [
  {
    id: 'free@1',
    active: true,
    name: 'Free',
    description: 'For individuals.',
    currency: 'AED',
    interval: 'month',
    trialDays: 0,
    features: [
      {
        id: 'users',
        type: 'per_unit',
        price: 0,
        limit: 1,
      },
      {
        id: 'inbox',
      },
      {
        id: 'contacts',
      },
      {
        id: 'monthly_active_contacts',
        label: 'Max 1000 MACs',
        price: 0,
        limit: 1000,
      },
    ],
    metadata: {
      price: 'AED 0',
      priceLabel: 'per user/month',
    },
  },
  {
    id: 'basic@1',
    active: true,
    name: 'Professional',
    description: 'For small teams.',
    currency: 'AED',
    interval: 'month',
    trialDays: 14,
    features: [
      {
        id: 'users',
        label: 'Max 3',
        priceId: 'price_1R1ZEKB7S6nOH9halTjxq2Jk',
        type: 'per_unit',
        price: 999,
        limit: 3,
      },
      {
        id: 'inbox',
      },
      {
        id: 'contacts',
      },
      {
        id: 'monthly_active_contacts',
        label: '10000 MACs included',
        price: 0,
        tiers: [
          {
            upTo: 10000,
            price: 0,
          },
          {
            upTo: 100000,
            price: 0.0001,
          },
          {
            upTo: 'inf',
            price: 0.00005,
          },
        ],
      },
    ],
    metadata: {
      price: 'AED 999',
      priceLabel: 'per user/month',
      productId: 'prod_RvQ4JGk6XGfhch',
    },
  },
  {
    id: 'premium@1',
    active: true,
    name: 'Enterprise',
    description: 'For growing teams.',
    currency: 'AED',
    interval: 'month',
    trialDays: 14,
    features: [
      {
        id: 'users',
        priceId: 'price_1R1ZGjB7S6nOH9haSPomIis9',
        type: 'per_unit',
        price: 4000,
      },
      {
        id: 'inbox',
      },
      {
        id: 'contacts',
      },
      {
        id: 'monthly_active_contacts',
        label: '10000 MACs included',
        price: 0,
        tiers: [
          {
            upTo: 10000,
            price: 0,
          },
          {
            upTo: 100000,
            price: 0.0001,
          },
          {
            upTo: 'inf',
            price: 0.00005,
          },
        ],
      },
      {
        id: 'api',
      },
      {
        id: 'automations',
      },
    ],
    metadata: {
      price: 'AED 4000',
      priceLabel: 'per user/month',
      productId: 'prod_RvQ6aOWR2I6IzV',
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
