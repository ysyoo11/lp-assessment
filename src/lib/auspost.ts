import 'server-only';

import { Locality } from '@/types/locality';
import { ENV } from '@/utils/env';
import { ValidateAddressSchema } from '@/validation/validate-address';

export type AusPostResponse = {
  localities?: {
    locality: Locality | Locality[];
  };
};

export async function fetchAusPostData(
  postcode: ValidateAddressSchema['postcode'],
  state: ValidateAddressSchema['state']
): Promise<Locality[]> {
  const res = await fetch(
    `${ENV.AUS_POST_API_URL}?q=${postcode}&state=${state}`,
    {
      headers: {
        Authorization: `Bearer ${ENV.AUS_POST_API_KEY}`
      }
    }
  );

  const data = (await res.json()) as AusPostResponse;

  // NOTE: Handle different response formats:
  // - No results: localities is undefined/null
  // - Single result: locality is a single object
  // - Multiple results: locality is an array
  if (!data.localities?.locality) {
    return [];
  }

  const locality = data.localities.locality;
  return Array.isArray(locality) ? locality : [locality];
}
