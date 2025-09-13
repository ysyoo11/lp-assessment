'use server';

import crypto from 'crypto';
import { redirect } from 'next/navigation';

import { SignupState } from '@/components/auth/SignupForm';
import { esClient } from '@/lib/elastic';
import { hashPassword } from '@/utils/auth';
import { createUserSession } from '@/utils/session';
import { validateSignup } from '@/validation/signup';

export async function signUp(
  prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  // TODO: rate limit

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
    const existingUser = await esClient.search({
      index: 'users',
      query: {
        term: {
          'email.keyword': validation.data.email
        }
      }
    });

    if (existingUser.hits.hits.length > 0) {
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

    await esClient.index({
      index: 'users',
      id: userId,
      document: {
        id: userId,
        name: validation.data.name,
        email: validation.data.email,
        password: hashedPassword,
        createdAt: new Date().toISOString()
      }
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
