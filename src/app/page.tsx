'use client';

import { ApolloProvider } from '@apollo/client/react';

import Header from '@/components/core/Header';
import Map from '@/components/verifier/Map';
import VerifierForm from '@/components/verifier/VerifierForm';
import { AddressValidationProvider } from '@/contexts';
import { apolloClient } from '@/lib/apollo';

export default function Home() {
  return (
    <ApolloProvider client={apolloClient}>
      <AddressValidationProvider>
        <Header />
        <main className='mx-auto mt-6 max-w-2xl px-4'>
          <h1 className='mb-6 text-lg font-bold sm:mb-8 sm:text-xl'>
            Address Verification
          </h1>

          <div className='flex flex-col gap-4 pb-10 sm:flex-row'>
            <VerifierForm />
            <Map />
          </div>
        </main>
      </AddressValidationProvider>
    </ApolloProvider>
  );
}
