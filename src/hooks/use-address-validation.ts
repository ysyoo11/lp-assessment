import { useEffect, useState } from 'react';

import { useLazyQuery } from '@apollo/client/react';
import { toast } from 'sonner';

import { ValidateAddressResponse } from '@/app/api/graphql-proxy/route';
import { VALIDATE_ADDRESS } from '@/lib/graphql/query';
import { ValidateAddressSchema } from '@/validation/validate-address';

export function useAddressValidation() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [runQuery, { loading, data, error }] =
    useLazyQuery<ValidateAddressResponse['data']>(VALIDATE_ADDRESS);

  const validateAddress = (variables: ValidateAddressSchema) => {
    setErrorMessage(null);
    runQuery({
      variables
    });
  };

  useEffect(() => {
    if (error) {
      setErrorMessage('Network error. Please try again later.');
      return;
    }

    if (!data?.validateAddress) return;

    const result = data.validateAddress;

    if (!result.success) {
      setErrorMessage(result.message);
      setSuccessMessage(null);
      toast.error(result.message);
    } else {
      setErrorMessage(null);
      setSuccessMessage(result.message);
      toast.success(result.message);
    }
  }, [data, error]);

  return {
    validateAddress,
    loading,
    errorMessage,
    successMessage
  };
}
