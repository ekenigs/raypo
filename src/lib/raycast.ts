import { environment, getPreferenceValues, getSelectedText, LaunchType, showHUD, showToast, Toast } from "@raycast/api";

import { fixText } from "./fix";

// Toasts are unavailable for background launches (e.g. deeplinks), so fall back to a HUD there.
const canToast = () => environment.launchType !== LaunchType.Background;

export async function showError(title: string, message?: string) {
  if (canToast()) await showToast({ style: Toast.Style.Failure, title, ...(message === undefined ? {} : { message }) });
  else await showHUD(message !== undefined && message !== "" ? `${title}: ${message}` : title);
}

export async function readSelection(): Promise<string | undefined> {
  try {
    const text = await getSelectedText();
    return text.trim() === "" ? undefined : text;
  } catch {
    return undefined;
  }
}

/** Runs the fix with a progress toast and returns the corrected text, or undefined on failure. */
export async function runFix(text: string): Promise<string | undefined> {
  const toast = canToast() ? await showToast({ style: Toast.Style.Animated, title: "Fixing typos…" }) : undefined;
  try {
    const fixed = await fixText(text, getPreferenceValues<Preferences>());
    await toast?.hide();
    return fixed;
  } catch (error) {
    await toast?.hide();
    await showError("Could not fix text", error instanceof Error ? error.message : String(error));
    return undefined;
  }
}

export function summary(original: string, fixed: string): string {
  return original === fixed ? "No typos found — copied to clipboard" : "Fixed text copied to clipboard";
}
