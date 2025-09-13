'use client';

import { useActionState } from 'react';

import { Button, Input } from '@/components/ui';
import { logIn } from '@/server-actions/log-in';
import { LoginSchema, LoginSchemaError } from '@/validation/login';

import ErrorMessage from '../ui/error-message';

export type LoginState = {
  data: LoginSchema;
  error?: LoginSchemaError;
};

const initialState: LoginState = {
  data: {
    email: '',
    password: ''
  }
};

// TODO: Google ReCAPTCHA
export default function LoginForm() {
  const [state, loginAction, isPending] = useActionState(logIn, initialState);

  return (
    <form action={loginAction} className='space-y-4'>
      {state.error?.formErrors[0] && (
        <ErrorMessage message={state.error.formErrors[0]} />
      )}
      <Input
        type='email'
        id='email'
        name='email'
        label='Email'
        placeholder='john@example.com'
        defaultValue={state.data.email}
        error={state.error?.fieldErrors?.email?.[0]}
      />
      <Input
        type='password'
        id='password'
        name='password'
        label='Password'
        placeholder='********'
        defaultValue={state.data.password}
        error={state.error?.fieldErrors?.password?.[0]}
      />
      <div className='flex justify-center'>
        <Button type='submit' className='self-center' disabled={isPending}>
          {isPending ? 'Logging in...' : 'Log in'}
        </Button>
      </div>
    </form>
  );
}
