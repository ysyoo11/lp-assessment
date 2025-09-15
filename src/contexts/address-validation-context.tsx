'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer
} from 'react';

import { useLazyQuery } from '@apollo/client/react';
import { toast } from 'sonner';

import { ValidateAddressResponse } from '@/app/api/graphql-proxy/route';
import { VALIDATE_ADDRESS } from '@/lib/graphql/query';
import { ValidateAddressSchema } from '@/validation/validate-address';

type AddressValidationState = {
  errorMessage: string | null;
  successMessage: string | null;
  coordinates: {
    latitude: number;
    longitude: number;
  } | null;
};

type AddressValidationAction =
  | { type: 'RESET' }
  | { type: 'SET_ERROR'; payload: string }
  | {
      type: 'SET_SUCCESS';
      payload: {
        message: string;
        coordinates: { latitude: number; longitude: number } | null;
      };
    };

const initialState: AddressValidationState = {
  errorMessage: null,
  successMessage: null,
  coordinates: null
};

function addressValidationReducer(
  state: AddressValidationState,
  action: AddressValidationAction
): AddressValidationState {
  switch (action.type) {
    case 'RESET':
      return initialState;
    case 'SET_ERROR':
      return {
        ...state,
        errorMessage: action.payload,
        successMessage: null,
        coordinates: null
      };
    case 'SET_SUCCESS':
      return {
        ...state,
        errorMessage: null,
        successMessage: action.payload.message,
        coordinates: action.payload.coordinates
      };
    default:
      return state;
  }
}

type AddressValidationContextType = {
  validateAddress: (variables: ValidateAddressSchema) => void;
  loading: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  coordinates: {
    latitude: number;
    longitude: number;
  } | null;
};

const AddressValidationContext = createContext<
  AddressValidationContextType | undefined
>(undefined);

export function AddressValidationProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(addressValidationReducer, initialState);
  const [runQuery, { loading, data, error }] =
    useLazyQuery<ValidateAddressResponse['data']>(VALIDATE_ADDRESS);

  const validateAddress = useCallback(
    (variables: ValidateAddressSchema) => {
      dispatch({ type: 'RESET' });
      runQuery({ variables });
    },
    [runQuery]
  );

  useEffect(() => {
    if (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: 'Network error. Please try again later.'
      });
      return;
    }

    if (!data?.validateAddress) return;

    const result = data.validateAddress;

    if (!result.success) {
      dispatch({ type: 'SET_ERROR', payload: result.message });
      toast.error(result.message);
    } else {
      const coordinates =
        result.latitude != null && result.longitude != null
          ? { latitude: result.latitude, longitude: result.longitude }
          : null;

      dispatch({
        type: 'SET_SUCCESS',
        payload: {
          message: result.message,
          coordinates
        }
      });
      toast.success(result.message);
    }
  }, [data, error]);

  const value = useMemo(
    () => ({
      validateAddress,
      loading,
      errorMessage: state.errorMessage,
      successMessage: state.successMessage,
      coordinates: state.coordinates
    }),
    [
      validateAddress,
      loading,
      state.errorMessage,
      state.successMessage,
      state.coordinates
    ]
  );

  return (
    <AddressValidationContext.Provider value={value}>
      {children}
    </AddressValidationContext.Provider>
  );
}

export function useAddressValidation() {
  const context = useContext(AddressValidationContext);
  if (context === undefined) {
    throw new Error(
      'useAddressValidation must be used within an AddressValidationProvider'
    );
  }
  return context;
}
