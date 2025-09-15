import { gql } from '@apollo/client';

export const VALIDATE_ADDRESS = gql`
  query ValidateAddress($postcode: String!, $suburb: String!, $state: String!) {
    validateAddress(postcode: $postcode, suburb: $suburb, state: $state) {
      success
      message
      latitude
      longitude
    }
  }
`;
