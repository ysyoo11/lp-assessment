'use client';

import { ApolloProvider } from '@apollo/client/react';

import Header from '@/components/core/Header';
import VerifierForm from '@/components/verifier/VerifierForm';
import { apolloClient } from '@/lib/apollo';

export default function Home() {
  return (
    <ApolloProvider client={apolloClient}>
      <Header />
      <main className='mx-auto mt-6 max-w-2xl px-4'>
        <h1 className='mb-6 text-lg font-bold sm:mb-8 sm:text-xl'>
          Address Verification
        </h1>

        <VerifierForm />
      </main>
    </ApolloProvider>
  );
}
