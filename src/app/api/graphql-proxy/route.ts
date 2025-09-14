import { NextRequest, NextResponse } from 'next/server';

import { Locality } from '@/types/locality';
import { getCurrentUser } from '@/utils/current-user';
import { ENV } from '@/utils/env';
import { validateValidateAddress } from '@/validation/validate-address';

export type AusPostResponse = {
  localities: {
    locality: Locality[];
  };
};

export type ValidateAddressResponse = {
  data: {
    validateAddress: {
      success: boolean;
      message: string;
    };
  };
};

// TODO: Rate limit
export async function POST(req: NextRequest) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    return NextResponse.json<ValidateAddressResponse>(
      {
        data: {
          validateAddress: { success: false, message: 'Unauthorized' }
        }
      },
      { status: 401 }
    );
  }

  const { variables } = await req.json();

  const validation = validateValidateAddress(variables);
  if (!validation.success) {
    return NextResponse.json<ValidateAddressResponse>(
      {
        data: {
          validateAddress: {
            success: false,
            message:
              validation.error.fieldErrors['postcode']?.[0] ||
              validation.error.fieldErrors['suburb']?.[0] ||
              validation.error.fieldErrors['state']?.[0] ||
              'Invalid input'
          }
        }
      },
      { status: 400 }
    );
  }

  const { postcode, suburb, state } = validation.data;

  try {
    const res = await fetch(
      `${ENV.AUS_POST_API_URL}?q=${postcode}&state=${state}`,
      {
        headers: {
          Authorization: `Bearer ${ENV.AUS_POST_API_KEY}`
        }
      }
    );

    const data = (await res.json()) as AusPostResponse;
    const localities = data.localities.locality;

    // No results found for postcode in state
    if (!Array.isArray(localities) || localities.length === 0) {
      return NextResponse.json<ValidateAddressResponse>(
        {
          data: {
            validateAddress: {
              success: false,
              message: `No results found for postcode ${postcode} in state ${state}.`
            }
          }
        },
        { status: 200 }
      );
    }

    // Find matched suburb
    const matchedSuburb = localities.find((locality) => {
      const localityName =
        'location' in locality ? locality.location : locality.suburb;
      return localityName.toLowerCase() === suburb.toLowerCase();
    });

    // No results found for suburb in postcode
    if (!matchedSuburb) {
      return NextResponse.json<ValidateAddressResponse>(
        {
          data: {
            validateAddress: {
              success: false,
              message: `The postcode ${postcode} does not match the suburb ${suburb}.`
            }
          }
        },
        { status: 200 }
      );
    }

    // Suburb does not exist in state
    if (matchedSuburb?.state.toLowerCase() !== state.toLowerCase()) {
      return NextResponse.json<ValidateAddressResponse>(
        {
          data: {
            validateAddress: {
              success: false,
              message: `The suburb ${suburb} does not exist in the state (${state}).`
            }
          }
        },
        { status: 200 }
      );
    }

    // All checks passed
    return NextResponse.json<ValidateAddressResponse>(
      {
        data: {
          validateAddress: {
            success: true,
            message: 'The postcode, suburb, and state input are valid.'
          }
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json<ValidateAddressResponse>(
      {
        data: {
          validateAddress: {
            success: false,
            message: 'Internal server error. Please try again later.'
          }
        }
      },
      { status: 500 }
    );
  }
}
