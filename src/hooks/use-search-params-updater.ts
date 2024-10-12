// hooks/useSearchParamsUpdater.ts

import { useRouter, useSearchParams } from 'next/navigation';

export function useSearchParamsUpdater() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Helper function to convert URLSearchParams to an object
  const getSearchParamsObject = () => {
    const paramsObj: Record<string, string> = {};
    searchParams.forEach( ( value, key ) => {
      paramsObj[ key ] = value;
    } );
    return paramsObj;
  };

  /**
   * Update searchParams either partially or fully
   * @param newParams Object with new key-value pairs for search params
   * @param replace If true, replaces all searchParams. If false, merges newParams with existing ones.
   */
  const updateSearchParams = (
    newParams: Record<string, string | undefined>, // Pass undefined to remove a param
    options: { replace: boolean, navigateReplace: boolean } = { replace: false, navigateReplace: true }
  ) => {
    const currentParams = getSearchParamsObject();

    // Merge or replace search params
    const updatedParams = options.replace ? newParams : { ...currentParams, ...newParams };

    // Remove undefined keys (to delete params)
    const cleanedParams = Object.entries( updatedParams ).reduce( ( acc, [ key, value ] ) => {
      if ( value !== undefined ) {
        acc[ key ] = value;
      }
      return acc;
    }, {} as Record<string, string> );

    // Build query string from updated params
    const queryString = new URLSearchParams( cleanedParams ).toString();

    // Navigate to the updated URL
    options.navigateReplace ? router.replace( `?${queryString}` ) :
      router.push( `?${queryString}` );
  };

  return {
    searchParams: getSearchParamsObject(),
    updateSearchParams,
  };
}
