/*
=========================================================
MANUAL ENTRY FIELD META
=========================================================
Small display helpers for the Contribute form. The actual
field lists come from the backend (/manual-entries/schemas)
so there is exactly one source of truth for column order —
this file only controls how fields are *presented*.
=========================================================
*/

// Fields rendered as a <textarea> instead of a single-line input.
export const LONG_TEXT_FIELDS = new Set([
  "Abstract",
  "Field_Of_Invention",
  "Keywords",
]);

// Fields rendered as type="number".
export const NUMBER_FIELDS = new Set([
  "Year",
  "Sanction_Year",
  "Amount_INR",
  "Amount_Lakhs",
  "Citations",
]);

// Fields rendered as type="date" (expects YYYY-MM-DD).
export const DATE_FIELDS = new Set([
  "Application_Filing_Date",
  "Publication_Date",
]);

// Fields rendered as type="url".
export const URL_FIELDS = new Set(["Source_URL"]);

export function fieldLabel(field) {
  return field.replace(/_/g, " ");
}

export function inputTypeFor(field) {
  if (NUMBER_FIELDS.has(field)) return "number";
  if (DATE_FIELDS.has(field)) return "date";
  if (URL_FIELDS.has(field)) return "url";
  return "text";
}
