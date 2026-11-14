import type { Control, FieldValues } from "react-hook-form";

/**
 * react-hook-form's `Control<T>` is invariant in `T` (since the form-level
 * `validate` option), so a typed form's control is no longer assignable to
 * `Control<any>`. The shared inputs address fields by plain string names, so
 * they take any form's control and widen it once here.
 */
export function widenControl<T extends FieldValues>(
  control: Control<T>,
): Control<FieldValues> {
  return control as unknown as Control<FieldValues>;
}
