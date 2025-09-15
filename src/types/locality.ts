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
  latitude?: number | string; // Australia Post API sometimes returns string for latitude (e.g. "33.8688")
  longitude?: number | string; // Australia Post API sometimes returns string for longitude (e.g. "151.2093")
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
