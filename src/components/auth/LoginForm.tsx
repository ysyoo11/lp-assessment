'use client';

import { Button, Input } from '@/components/ui';
import { LoginSchema, LoginSchemaError } from '@/validation/login';

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
  return (
    <form className='space-y-4'>
      <Input
        type='email'
        id='email'
        name='email'
        label='Email'
        placeholder='john@example.com'
      />
      <Input
        type='password'
        id='password'
        name='password'
        label='Password'
        placeholder='********'
      />
      <div className='flex justify-center'>
        <Button type='submit' className='self-center'>
          Log in
        </Button>
      </div>
    </form>
  );
}
