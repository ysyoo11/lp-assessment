'use server';

import { Ratelimit } from '@upstash/ratelimit';
import crypto from 'crypto';
import { redirect } from 'next/navigation';

import { SignupState } from '@/components/auth/SignupForm';
import { createUser, getUserByEmail } from '@/data/user';
import { rateLimitByIp } from '@/lib/rate-limit';
import { redisClient as redis } from '@/lib/redis';
import { hashPassword } from '@/utils/auth';
import { getCurrentUser } from '@/utils/current-user';
import { createUserSession } from '@/utils/session';
import { validateSignup } from '@/validation/signup';

const rateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1m')
});

export async function signUp(
  prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  const data: SignupState['data'] = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    passwordConfirm: formData.get('passwordConfirm') as string
  };

  const validation = validateSignup(data);
  if (!validation.success) {
    return {
      data,
      error: validation.error
    };
  }

  // TODO: Google ReCAPTCHA

  try {
    const { success } = await rateLimitByIp(rateLimit);
    if (!success) {
      return {
        data,
        error: {
          formErrors: ['Too many requests. Please try again later.'],
          fieldErrors: {}
        }
      };
    }

    const currentUser = await getCurrentUser();
    if (currentUser) {
      return {
        data,
        error: {
          formErrors: ['You are already logged in'],
          fieldErrors: {}
        }
      };
    }

    const existingUser = await getUserByEmail(validation.data.email);

    if (existingUser) {
      return {
        data,
        error: {
          formErrors: ['User already exists'],
          fieldErrors: {}
        }
      };
    }

    const hashedPassword = await hashPassword(data.password);

    const userId = crypto.randomUUID();

    await createUser({
      id: userId,
      name: validation.data.name,
      email: validation.data.email,
      password: hashedPassword
    });

    await createUserSession({ id: userId, name: validation.data.name });
  } catch (error) {
    console.error(error);
    return {
      data,
      error: {
        formErrors: ['Internal server error. Please try again later.'],
        fieldErrors: {}
      }
    };
  }

  return redirect('/');
}
