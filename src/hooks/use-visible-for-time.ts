import { useState, useEffect, useRef, MutableRefObject } from 'react';

type UseVisibleForTimeHook = {
  componentRef: MutableRefObject<HTMLDivElement | null>;
  apiCalled: boolean;
};

const useVisibleForTime = ( callback: () => void, delay: number = 60000 ): UseVisibleForTimeHook => {
  const [ visible, setVisible ] = useState( false );
  const [ apiCalled, setApiCalled ] = useState( false );
  const componentRef = useRef<HTMLDivElement | null>( null );
  const visibilityTimeout = useRef<NodeJS.Timeout | null>( null );

  useEffect( () => {
    const observer = new IntersectionObserver(
      ( [ entry ] ) => {
        if ( entry.isIntersecting ) {
          setVisible( true );
        } else {
          setVisible( false );
          if ( visibilityTimeout.current ) {
            clearTimeout( visibilityTimeout.current ); // Clear timeout if component becomes hidden
          }
        }
      },
      { threshold: 0.1 } // Trigger when at least 10% is visible
    );

    if ( componentRef.current ) {
      observer.observe( componentRef.current );
    }

    return () => {
      if ( componentRef.current ) {
        observer.unobserve( componentRef.current );
      }
      if ( visibilityTimeout.current ) {
        clearTimeout( visibilityTimeout.current ); // Cleanup on unmount
      }
    };
  }, [] );

  useEffect( () => {
    if ( visible && !apiCalled ) {
      // Start the timer when the component becomes visible
      visibilityTimeout.current = setTimeout( () => {
        callback(); // Invoke the callback after specified delay
        setApiCalled( true ); // Ensure API is called only once
      }, delay ); // Default delay is 60 seconds (60000 ms)
    }

    return () => {
      if ( !visible && visibilityTimeout.current ) {
        clearTimeout( visibilityTimeout.current ); // Clear timeout if visibility changes
      }
    };
  }, [ visible, apiCalled, callback, delay ] );

  return { componentRef, apiCalled }; // Return the ref to be attached to the component
};

export default useVisibleForTime;

/*
Type Definitions:

  The hook returns an object with componentRef (a MutableRefObject for the element being observed) and apiCalled (a boolean indicating if the action has been executed).
  callback is a function with no parameters and no return value (() => void).
  The optional delay is typed as number, with a default value of 60,000 milliseconds (1 minute).

Ref Types:

  componentRef is typed as MutableRefObject<HTMLDivElement | null>, meaning it references a div element or is null initially.
  visibilityTimeout uses the NodeJS.Timeout type, which is returned by setTimeout.

Hook Usage:

import React, { useState } from 'react';
import useVisibleForTime from './useVisibleForTime';
import axios from 'axios';

const ApiPollingComponent: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invokeApi = async () => {
    setLoading(true);
    try {
      const response = await axios.get('https://api.example.com/data');
      setData(response.data);
      setError(null); // Clear any previous errors
    } catch (err) {
      setError('Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  // Use the hook to trigger the API call after the component is visible for 1 minute
  const { componentRef, apiCalled } = useVisibleForTime(invokeApi, 60000);

  return (
    <div>
      <h1>API Call on Visibility for 1 Minute</h1>
      <div
        ref={componentRef}
        style={{
          height: '200px',
          margin: '20px 0',
          backgroundColor: 'lightblue',
          textAlign: 'center',
          padding: '20px',
        }}
      >
        {loading && <p>Loading...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {data && (
          <div>
            <h2>Data from API:</h2>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </div>
        )}
        {!apiCalled && !loading && <p>Stay on screen for 1 minute to trigger the API call.</p>}
      </div>
    </div>
  );
};

export default ApiPollingComponent;
*/