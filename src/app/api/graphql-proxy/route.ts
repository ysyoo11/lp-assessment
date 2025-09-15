import { Ratelimit } from '@upstash/ratelimit';
import { NextRequest, NextResponse } from 'next/server';

import { VALIDATION_ERROR_MESSAGES } from '@/constants/validate-address';
import { logVerificationAttempt } from '@/data/log';
import { fetchAusPostData } from '@/lib/auspost';
import { ensureLogIndexExists } from '@/lib/elastic';
import { rateLimitByIp } from '@/lib/rate-limit';
import { redisClient as redis } from '@/lib/redis';
import { getCurrentUser } from '@/utils/current-user';
import { isCI, isTest } from '@/utils/env';
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

const isTestEnvironment = isTest || isCI;

const getRateLimitConfig = () => {
  if (isTestEnvironment) {
    return { requests: 100, duration: '60s' as const };
  } else {
    return { requests: 30, duration: '60s' as const };
  }
};

const { requests, duration } = getRateLimitConfig();
const rateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(requests, duration)
});

export async function POST(req: NextRequest) {
  try {
    const { success } = await rateLimitByIp(rateLimit);
    if (!success) {
      return NextResponse.json(
        {
          data: {
            validateAddress: {
              success: false,
              message: 'Too many requests. Please try again later.'
            }
          }
        },
        { status: 400 }
      );
    }

    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return createResponse({
        success: false,
        message: VALIDATION_ERROR_MESSAGES.UNAUTHORIZED,
        status: 401
      });
    }

    await ensureLogIndexExists();

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
