'use client';

import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

import { useAddressValidation } from '@/contexts';

export default function Map() {
  const { coordinates, successMessage } = useAddressValidation();
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!
  });

  if (successMessage && coordinates === null) {
    return (
      <div
        className='flex h-[300px] w-full items-center justify-center rounded-lg border p-4 text-sm'
        data-testid='map-no-coordinates'
      >
        <p className='text-center'>No coordinates found for this address 🫥</p>
      </div>
    );
  }

  if (coordinates === null) return null;

  const containerStyle = {
    width: '100%',
    height: '300px'
  };
  const center = {
    lat: coordinates.latitude,
    lng: coordinates.longitude
  };

  return isLoaded ? (
    <div data-testid='map-with-coordinates' style={containerStyle}>
      <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={15}>
        <Marker position={center} />
      </GoogleMap>
    </div>
  ) : null;
}
