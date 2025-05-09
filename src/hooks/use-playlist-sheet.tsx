import React, { createContext, useContext, useState } from 'react';

interface PlaylistSheetContextType {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const PlaylistSheetContext = createContext<PlaylistSheetContextType | undefined>( undefined );

export function PlaylistSheetProvider( { children }: { children: React.ReactNode } ) {
  const [ isOpen, setIsOpen ] = useState( false );

  return (
    <PlaylistSheetContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </PlaylistSheetContext.Provider>
  );
}

export function usePlaylistSheet() {
  const context = useContext( PlaylistSheetContext );
  if ( context === undefined ) {
    throw new Error( 'usePlaylistSheet must be used within a PlaylistSheetProvider' );
  }
  return context;
}