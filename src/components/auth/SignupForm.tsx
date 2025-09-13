'use client';

import { useActionState } from 'react';

import { Button, Input } from '@/components/ui';
import { signUp } from '@/server-actions/sign-up';
import { SignupSchema, SignupSchemaError } from '@/validation/signup';

import ErrorMessage from '../ui/error-message';
import PasswordRulesGuide from './PasswordRulesGuide';

export type SignupState = {
  data: SignupSchema;
  error?: SignupSchemaError;
};

const initialState: SignupState = {
  data: {
    name: '',
    email: '',
    password: '',
    passwordConfirm: ''
  }
};

// TODO: Google ReCAPTCHA
export default function SignupForm() {
  const [state, signupAction, isPending] = useActionState(signUp, initialState);

  return (
    <form action={signupAction} className='space-y-4' data-testid='signup-form'>
      {state.error?.formErrors[0] && (
        <ErrorMessage
          message={state.error.formErrors[0]}
          data-testid='signup-error'
        />
      )}
      <Input
        type='text'
        id='name'
        name='name'
        label='Name'
        placeholder='John Doe'
        defaultValue={state.data.name}
        error={state.error?.fieldErrors?.name?.[0]}
        data-testid='name-input'
      />
      <Input
        type='email'
        id='email'
        name='email'
        label='Email'
        placeholder='john@example.com'
        defaultValue={state.data.email}
        error={state.error?.fieldErrors?.email?.[0]}
        data-testid='email-input'
      />
      <div className='space-y-2'>
        <Input
          type='password'
          id='password'
          name='password'
          label='Password'
          placeholder='********'
          defaultValue={state.data.password}
          error={state.error?.fieldErrors?.password?.[0]}
          data-testid='password-input'
        />
        <PasswordRulesGuide />
      </div>
      <Input
        type='password'
        id='confirm-password'
        name='passwordConfirm'
        label='Confirm Password'
        placeholder='********'
        defaultValue={state.data.passwordConfirm}
        error={state.error?.fieldErrors?.passwordConfirm?.[0]}
        data-testid='password-confirm-input'
      />
      <div className='flex justify-center'>
        <Button
          type='submit'
          className='self-center'
          disabled={isPending}
          data-testid='signup-button'
        >
          {isPending ? 'Signing up...' : 'Sign up'}
        </Button>
      </div>
    </form>
  );
}
