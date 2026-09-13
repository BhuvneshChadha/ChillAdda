'use client'
import React from 'react'
import {SessionProvider} from 'next-auth/react'

const AuthProvider = ({children}) => {
  return (
    <SessionProvider basePath={`${process.env.NEXT_PUBLIC_BACKEND_URL || ""}/api/auth`}>
        {children}
    </SessionProvider>
  )
}

export default AuthProvider