import { convertText, detectScheme } from "./transliteration";

/**
 * State of the two pane convertor. Both panes can be typed into; the pane
 * that was edited last ("active") is the source of truth and the other one
 * is always derived from it, so repeated edits never compound rounding
 * errors of a lossy script.
 */
export type ConverterSide = "from" | "to";

export interface ConverterState {
  from: string;
  to: string;
  fromText: string;
  toText: string;
  active: ConverterSide;
}

const other = (side: ConverterSide): ConverterSide =>
  side === "from" ? "to" : "from";
const textKey = (side: ConverterSide) =>
  side === "from" ? "fromText" : "toText";

export function swapSides(state: ConverterState): ConverterState {
  return {
    from: state.to,
    to: state.from,
    fromText: state.toText,
    toText: state.fromText,
    active: other(state.active),
  };
}

/**
 * Scheme a pane should switch to for the text it now holds, if any.
 * Only switches on clear evidence (a script, or roman diacritics).
 */
function detectedSchemeFor(text: string, current: string): string | undefined {
  const detected = detectScheme(text);
  if (!detected || detected === current) return undefined;
  // Text without ISO-only letters is valid ISO as well: leave the pane alone
  if (detected === "IAST" && current === "ISO") return undefined;
  return detected;
}

/** The user typed or pasted into one pane */
export function editSide(
  state: ConverterState,
  side: ConverterSide,
  text: string,
  options: { autoDetect?: boolean } = {},
): ConverterState {
  const next = { ...state, active: side };
  const otherSide = other(side);

  if (options.autoDetect) {
    const detected = detectedSchemeFor(text, state[side]);
    if (detected) {
      // keep the two panes on different schemes
      if (detected === state[otherSide]) next[otherSide] = state[side];
      next[side] = detected;
    }
  }

  next[textKey(side)] = text;
  next[textKey(otherSide)] = convertText(text, next[side], next[otherSide]);
  return next;
}

/**
 * The user picked another scheme for one pane.
 *  - convertOnSwitch (default): the pane keeps its meaning, its text is
 *    rewritten in the new scheme.
 *  - otherwise the pane keeps its text, which is re-read as the new scheme
 *    (for text that was pasted under the wrong scheme).
 */
export function changeScheme(
  state: ConverterState,
  side: ConverterSide,
  scheme: string,
  options: { convertOnSwitch?: boolean } = {},
): ConverterState {
  if (scheme === state[side]) return state;
  const otherSide = other(side);
  // Picking the other pane's scheme means "swap"
  if (scheme === state[otherSide]) return swapSides(state);

  const next = { ...state, [side]: scheme };
  if (options.convertOnSwitch ?? true) {
    const truth = state.active;
    next[textKey(side)] = convertText(
      state[textKey(truth)],
      state[truth],
      scheme,
    );
  } else {
    next.active = side;
    next[textKey(otherSide)] = convertText(
      state[textKey(side)],
      scheme,
      state[otherSide],
    );
  }
  return next;
}
