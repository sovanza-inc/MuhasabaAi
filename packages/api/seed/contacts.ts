import { User, rand, randBetweenDate, randUser } from '@ngneat/falso'

import { type ContactModel, contacts, db } from '@acme/db'

const mapContact = (user: User) => {
  const { firstName, lastName, email } = user
  const name = [firstName, lastName].join(' ')
  return {
    firstName,
    lastName,
    name,
    email,
    status: rand(['new', 'active', 'inactive']),
    type: rand(['lead', 'customer']),
    tags: rand([[], [rand(['developer', 'designer', 'partner', 'prospect'])]]),
    avatar: `https://xsgames.co/randomusers/avatar.php?g=${rand([
      'male',
      'female',
      'pixel',
    ])}&name=${name}`,
    createdAt: randBetweenDate({
      from: new Date('01/01/2024'),
      to: new Date(),
    }),
    updatedAt: randBetweenDate({
      from: new Date('01/01/2024'),
      to: new Date(),
    }),
  } satisfies Partial<ContactModel>
}

export function seedContacts(workspaceId: string) {
  const data = randUser({ length: 100 }).map((user) => {
    return {
      workspaceId,
      ...mapContact(user),
    }
  })

  db.insert(contacts).values(data)
}
