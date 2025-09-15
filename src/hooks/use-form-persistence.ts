import { useEffect } from 'react';

import { Path, PathValue, UseFormReturn, useWatch } from 'react-hook-form';

export function useFormPersistence<
  T extends Record<string, PathValue<T, Path<T>>>
>(form: UseFormReturn<T>, storageKey: string) {
  const watchedValues = useWatch({
    control: form.control
  });

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const data = JSON.parse(saved) as T;
        Object.keys(data).forEach((key) => {
          form.setValue(key as Path<T>, data[key], {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true
          });
        });
      } catch (error) {
        console.error('Failed to parse saved form data:', error);
        localStorage.removeItem(storageKey);
      }
    }
  }, [form, storageKey]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem(storageKey, JSON.stringify(watchedValues));
    }, 300);

    return () => clearTimeout(timeout);
  }, [watchedValues, storageKey]);

  const clearPersistedData = () => {
    localStorage.removeItem(storageKey);
  };

  return {
    clearPersistedData
  };
}
