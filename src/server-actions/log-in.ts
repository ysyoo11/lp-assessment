'use server';

import { redirect } from 'next/navigation';

import { LoginState } from '@/components/auth/LoginForm';
import { esClient } from '@/lib/elastic';
import { User } from '@/types/user';
import { comparePasswords } from '@/utils/auth';
import { createUserSession } from '@/utils/session';
import { validateLogin } from '@/validation/login';

export async function logIn(
  prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  // TODO: rate limit

  const data: LoginState['data'] = {
    email: formData.get('email') as string,
    password: formData.get('password') as string
  };

  const validation = validateLogin(data);
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

    if (existingUser.hits.hits.length === 0) {
      return {
        data,
        error: {
          formErrors: ['User not found'],
          fieldErrors: {}
        }
      };
    }

    const user = existingUser.hits.hits[0]._source as User;

    console.log('user', user);
    const isPasswordValid = await comparePasswords(
      validation.data.password,
      user.password
    );
    if (!isPasswordValid) {
      return {
        data,
        error: {
          formErrors: ['Invalid credentials'],
          fieldErrors: {}
        }
      };
    }

    await createUserSession({ id: user.id, name: user.name });
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
