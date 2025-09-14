export const states = [
  'NSW',
  'VIC',
  'QLD',
  'SA',
  'WA',
  'TAS',
  'NT',
  'ACT'
] as const;
export type State = (typeof states)[number];

type BaseLocality = {
  category: string;
  id: number;
  latitude: number;
  longitude: number;
  postcode: string;
  state: State;
};
type LocalityWithLocation = BaseLocality & {
  location: string;
};
type LocalityWithSuburb = BaseLocality & {
  suburb: string;
};
export type Locality = LocalityWithLocation | LocalityWithSuburb;
