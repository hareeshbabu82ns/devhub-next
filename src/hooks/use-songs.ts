import { atom, useAtom } from "jotai";
import { atomWithReducer } from "jotai/utils";

type Playlist = {
  songs: Song[];
  currentSongIndex: number;
  repeat: boolean;
  stream: boolean;
  seekInterval: number;
};

const defaultPlaylist: Playlist = {
  songs: [],
  currentSongIndex: -1,
  repeat: false,
  stream: true,
  seekInterval: 10,
};

const playlistReducer = (
  state: Playlist,
  action: {
    type:
      | "ADD_SONG"
      | "REMOVE_SONG"
      | "TOGGLE_REPEAT"
      | "NEXT_SONG"
      | "PREV_SONG"
      | "PLAY"
      | "PAUSE"
      | "SET_CURRENT_INDEX"
      | "CLEAR_PLAYLIST";
    payload?: any;
  },
) => {
  switch (action.type) {
    case "CLEAR_PLAYLIST":
      return {
        ...state,
        songs: [],
        currentSongIndex: -1,
      };
    case "SET_CURRENT_INDEX":
      return {
        ...state,
        currentSongIndex: action.payload,
      };
    case "ADD_SONG":
      // check if song is already available
      const index = state.songs.findIndex(
        (song) => song.src === action.payload.src,
      );
      if (index !== -1) {
        return {
          ...state,
          currentSongIndex: index,
        };
      }
      return {
        ...state,
        songs: [...state.songs, action.payload],
        currentSongIndex:
          state.currentSongIndex === -1
            ? state.songs.length
            : state.currentSongIndex,
      };
    case "REMOVE_SONG":
      return {
        ...state,
        songs: state.songs.filter((_, index) => index !== action.payload),
        currentSongIndex:
          state.currentSongIndex === action.payload
            ? -1
            : state.currentSongIndex,
      };
    case "TOGGLE_REPEAT":
      return {
        ...state,
        repeat: !state.repeat,
      };
    case "NEXT_SONG":
      state.songs[state.currentSongIndex].position = 0;
      return {
        ...state,
        currentSongIndex: state.repeat
          ? (state.currentSongIndex + 1) % state.songs.length
          : state.currentSongIndex === state.songs.length - 1
            ? -1
            : state.currentSongIndex + 1,
      };
    case "PREV_SONG":
      state.songs[state.currentSongIndex].position = 0;
      return {
        ...state,
        currentSongIndex: state.repeat
          ? (state.currentSongIndex - 1 + state.songs.length) %
            state.songs.length
          : state.currentSongIndex === 0
            ? -1
            : state.currentSongIndex - 1,
      };
    case "PLAY":
      return {
        ...state,
        currentSongIndex:
          action.payload || state.currentSongIndex === -1
            ? 0
            : state.currentSongIndex,
      };
    case "PAUSE":
      const currentSongPosition = parseInt(action?.payload || 0);
      const currentSong = state.songs[state.currentSongIndex];
      if (currentSongPosition) {
        currentSong.position = currentSongPosition;
      }
      return {
        ...state,
      };
    default:
      return state;
  }
};

const playlistAtom = atomWithReducer<Playlist, any>(
  defaultPlaylist,
  playlistReducer,
);

export function usePlaylistAtom() {
  return useAtom(playlistAtom);
}
