'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { useAddressValidation, useFormPersistence } from '@/hooks';
import { states } from '@/types/locality';
import {
  ValidateAddressSchema,
  validateAddressSchema
} from '@/validation/validate-address';

import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input
} from '../ui';
import ErrorMessage from '../ui/error-message';

export const VERIFIER_FORM_KEY = '@lp-assessment-verifier-form-data';

export default function VerifierForm() {
  const form = useForm<ValidateAddressSchema>({
    resolver: zodResolver(validateAddressSchema),
    defaultValues: {
      postcode: '',
      suburb: '',
      state: 'NSW'
    }
  });

  useFormPersistence(form, VERIFIER_FORM_KEY);

  const { validateAddress, loading, errorMessage, successMessage } =
    useAddressValidation();

  const isButtonDisabled = loading || !form.formState.isValid;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(validateAddress)}
        className='w-full shrink-0 space-y-8 sm:max-w-xs'
      >
        {errorMessage && (
          <ErrorMessage
            message={errorMessage}
            data-testid='address-verification-error-message'
          />
        )}
        {successMessage && (
          <div
            className='rounded-lg border border-green-500 bg-green-100 p-4 text-sm text-green-800'
            data-testid='address-verification-success-message'
          >
            {successMessage}
          </div>
        )}
        <div className='space-y-4'>
          <FormField
            control={form.control}
            name='postcode'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Postcode</FormLabel>
                <FormControl>
                  <Input
                    placeholder='2000'
                    maxLength={4}
                    disabled={loading}
                    data-testid='postcode-input'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='suburb'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Suburb</FormLabel>
                <FormControl>
                  <Input
                    placeholder='Sydney'
                    maxLength={100}
                    disabled={loading}
                    data-testid='suburb-input'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='state'
            render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <FormControl>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      disabled={loading}
                      data-testid='state-dropdown-trigger'
                    >
                      <div className='rounded-md border px-2 py-1'>
                        {field.value}
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className='w-40'>
                      {states.map((state) => (
                        <DropdownMenuCheckboxItem
                          key={state}
                          checked={field.value === state}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              field.onChange(state);
                            }
                          }}
                          data-testid={`state-dropdown-item-${state}`}
                        >
                          {state}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className='flex justify-center'>
          <Button
            type='submit'
            className='w-full sm:w-auto'
            disabled={isButtonDisabled}
            data-testid='verify-button'
          >
            Verify
          </Button>
        </div>
      </form>
    </Form>
  );
}
