'use client';

import { ApolloProvider } from '@apollo/client/react';
import { LoadScript } from '@react-google-maps/api';

import Header from '@/components/core/Header';
import Map from '@/components/verifier/Map';
import VerifierForm from '@/components/verifier/VerifierForm';
import { AddressValidationProvider } from '@/contexts';
import { apolloClient } from '@/lib/apollo';

export default function Home() {
  return (
    <ApolloProvider client={apolloClient}>
      <LoadScript
        googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
      >
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
      </LoadScript>
    </ApolloProvider>
  );
}
