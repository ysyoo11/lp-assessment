import { Locality } from '@/types/locality';
import { ENV } from '@/utils/env';
import { ValidateAddressSchema } from '@/validation/validate-address';

export type AusPostResponse = {
  localities: {
    locality: Locality[];
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

  return data.localities?.locality ?? [];
}
