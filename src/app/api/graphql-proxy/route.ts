import { NextRequest, NextResponse } from 'next/server';

import { logVerificationAttempt } from '@/data/log';
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
    const message =
      validation.error.fieldErrors['postcode']?.[0] ||
      validation.error.fieldErrors['suburb']?.[0] ||
      validation.error.fieldErrors['state']?.[0] ||
      'Invalid input';

    await logVerificationAttempt({
      userId: sessionUser.id,
      postcode: variables.postcode,
      suburb: variables.suburb,
      state: variables.state,
      timestamp: new Date().toISOString(),
      success: false,
      errorMessage: message
    });

    return NextResponse.json<ValidateAddressResponse>(
      {
        data: {
          validateAddress: {
            success: false,
            message
          }
        }
      },
      { status: 400 }
    );
  }

  const { postcode, suburb, state } = validation.data;

  let success = false;
  let message = '';
  let status = 200;

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
    const localities = data.localities?.locality ?? [];

    // No results found for postcode in state
    if (!Array.isArray(localities) || localities.length === 0) {
      message = `No results found for postcode ${postcode} in state ${state}.`;
    } else {
      // Find matched suburb
      const matchedSuburb = localities.find((locality) => {
        const localityName =
          'location' in locality ? locality.location : locality.suburb;
        return localityName.toLowerCase() === suburb.toLowerCase();
      });

      // No results found for suburb in postcode
      if (!matchedSuburb) {
        message = `The postcode ${postcode} does not match the suburb ${suburb}.`;
      } else if (matchedSuburb?.state.toLowerCase() !== state.toLowerCase()) {
        // Suburb does not exist in state
        message = `The suburb ${suburb} does not exist in the state (${state}).`;
      } else {
        // All checks passed
        success = true;
        message = 'The postcode, suburb, and state input are valid.';
      }
    }
  } catch (error) {
    console.error(error);
    message = 'Internal server error. Please try again later.';
    status = 500;
  }

  await logVerificationAttempt({
    userId: sessionUser.id,
    postcode,
    suburb,
    state,
    timestamp: new Date().toISOString(),
    success,
    errorMessage: success ? undefined : message
  });

  return NextResponse.json<ValidateAddressResponse>(
    {
      data: {
        validateAddress: {
          success,
          message
        }
      }
    },
    { status }
  );
}
