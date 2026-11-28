"use client";

import React, { createContext, useContext, type ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";

type GetTokenFn = () => Promise<string | null>;

const defaultGetToken: GetTokenFn = async () => null;

const AuthTokenContext = createContext<GetTokenFn>(defaultGetToken);

export const ClerkAuthTokenProvider = ({
  children
}: {
  children: ReactNode;
}) => {
  const { getToken } = useAuth();

  return (
    <AuthTokenContext.Provider value={getToken}>
      {children}
    </AuthTokenContext.Provider>
  );
};

export const useOptionalAuthToken = (): GetTokenFn =>
  useContext(AuthTokenContext);
