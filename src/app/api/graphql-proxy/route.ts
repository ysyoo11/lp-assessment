import { NextRequest, NextResponse } from 'next/server';

import { VALIDATION_ERROR_MESSAGES } from '@/constants/validate-address';
import { logVerificationAttempt } from '@/data/log';
import { fetchAusPostData } from '@/lib/auspost';
import { getCurrentUser } from '@/utils/current-user';
import { ValidationResult, validateAddressData } from '@/utils/verifier';
import { validateValidateAddress } from '@/validation/validate-address';

export type ValidateAddressResponse = {
  data: {
    validateAddress: {
      success: boolean;
      message: string;
      latitude: number | null;
      longitude: number | null;
    };
  };
};

// TODO: Rate limit
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return createResponse({
        success: false,
        message: VALIDATION_ERROR_MESSAGES.UNAUTHORIZED,
        status: 401
      });
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

      return createResponse({
        success: false,
        message,
        status: 400
      });
    }

    const { postcode, suburb, state } = validation.data;

    let result: ValidationResult;

    try {
      const localities = await fetchAusPostData(postcode, state);

      result = validateAddressData(localities, validation.data);
    } catch (error) {
      console.error('Australia Post API error:', error);
      result = {
        success: false,
        message: VALIDATION_ERROR_MESSAGES.SERVER_ERROR,
        status: 500
      };
    }

    await logVerificationAttempt({
      userId: sessionUser.id,
      postcode,
      suburb,
      state,
      timestamp: new Date().toISOString(),
      success: result.success,
      errorMessage: result.success ? undefined : result.message
    });

    return createResponse(result);
  } catch (error) {
    console.error(error);
    return createResponse({
      success: false,
      message: VALIDATION_ERROR_MESSAGES.SERVER_ERROR,
      status: 500
    });
  }
}

function createResponse({
  success,
  message,
  status,
  latitude,
  longitude
}: ValidationResult): NextResponse<ValidateAddressResponse> {
  if (success) {
    return NextResponse.json<ValidateAddressResponse>(
      {
        data: {
          validateAddress: {
            success,
            message,
            latitude: latitude ? Number(latitude) : null,
            longitude: longitude ? Number(longitude) : null
          }
        }
      },
      { status }
    );
  } else {
    return NextResponse.json<ValidateAddressResponse>(
      {
        data: {
          validateAddress: {
            success,
            message,
            latitude: null,
            longitude: null
          }
        }
      },
      { status }
    );
  }
}
