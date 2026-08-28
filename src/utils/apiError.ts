// The API returns field-level validation failures in the envelope's `data`
// array — e.g. VALIDATION_ERROR with
//   data: [{ property: "email", message: "must be a well-formed email address" }]
// The top-level `message` is only the generic "Validation Error", so surface the
// per-field detail instead; otherwise the user has no idea which input is wrong.
//
// Multiple failures are joined with " · " rather than newlines, because toasts
// render a plain string and "\n" would not break lines.
export function apiErrorMessage(err: any, fallback: string): string {
  const body = err?.response?.data;
  const details = Array.isArray(body?.data) ? body.data : null;
  if (details?.length) {
    const lines = details
      .map((d: any) => {
        const prop = typeof d?.property === "string" ? d.property : "";
        const msg = typeof d?.message === "string" ? d.message : "";
        if (!msg) return prop;
        return prop ? `${prop}: ${msg}` : msg;
      })
      .filter(Boolean);
    if (lines.length) return lines.join(" · ");
  }
  return body?.message || err?.message || fallback;
}
