'use client';

import { Button, Input } from '@/components/ui';

import PasswordRulesGuide from './PasswordRulesGuide';

export default function SignupForm() {
  return (
    <form className='space-y-4'>
      <Input
        type='text'
        id='name'
        name='name'
        label='Name'
        placeholder='John Doe'
      />
      <Input
        type='email'
        id='email'
        name='email'
        label='Email'
        placeholder='john@example.com'
      />
      <div className='space-y-2'>
        <Input
          type='password'
          id='password'
          name='password'
          label='Password'
          placeholder='********'
        />
        <PasswordRulesGuide />
      </div>
      <Input
        type='password'
        id='confirm-password'
        name='passwordConfirm'
        label='Confirm Password'
        placeholder='********'
      />
      <div className='flex justify-center'>
        <Button type='submit' className='self-center'>
          Sign up
        </Button>
      </div>
    </form>
  );
}
