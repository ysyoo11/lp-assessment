'use server';

import { redirect } from 'next/navigation';

import { LoginState } from '@/components/auth/LoginForm';
import { getUserByEmail } from '@/data/user';
import { comparePasswords } from '@/utils/auth';
import { getCurrentUser } from '@/utils/current-user';
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

    if (!existingUser) {
      return {
        data,
        error: {
          formErrors: ['Invalid credentials'],
          fieldErrors: {}
        }
      };
    }

    const isPasswordValid = await comparePasswords(
      validation.data.password,
      existingUser.password
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

    await createUserSession({ id: existingUser.id, name: existingUser.name });
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
