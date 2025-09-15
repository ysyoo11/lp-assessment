import { useEffect } from 'react';

import { Path, UseFormReturn, useWatch } from 'react-hook-form';

export function useFormPersistence<T extends Record<string, any>>(
  form: UseFormReturn<T>,
  storageKey: string
) {
  const watchedValues = useWatch({
    control: form.control
  });

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const data = JSON.parse(saved) as T;
      Object.keys(data).forEach((key) => {
        form.setValue(key as Path<T>, data[key]);
      });
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
