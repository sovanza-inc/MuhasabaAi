import { NextResponse } from 'next/server'

import { auth } from '@acme/better-auth/middleware'

const publicRoutes = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
]

export default auth((req) => {
  if (!req.auth && !publicRoutes.includes(req.nextUrl.pathname)) {
    const redirectTo = new URL(req.nextUrl.pathname, req.nextUrl.origin)
    const newUrl = new URL('/login', req.nextUrl.origin)
    newUrl.searchParams.set('redirectTo', redirectTo.toString())
    return NextResponse.redirect(newUrl)
  }

  return NextResponse.next()
})

export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  matcher: [
    '/((?!api|_next/static|_next/image|static|img|favicons|favicon.ico|sitemap.xml|robots.txt$).*)',
  ],
}
