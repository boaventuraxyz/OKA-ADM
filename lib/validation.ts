import "server-only";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

export function formText(formData: FormData, ...names: string[]) {
  for (const name of names) {
    const value = formData.get(name);
    if (typeof value === "string") return value;
  }
  return "";
}

export function singleLine(value: string, maxLength: number) {
  const normalized = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  return normalized.length <= maxLength ? normalized : null;
}

export function multiline(value: string, maxLength: number) {
  const normalized = value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim();
  return normalized.length <= maxLength ? normalized : null;
}
