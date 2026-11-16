import {
  Clipboard,
  closeMainWindow,
  environment,
  getPreferenceValues,
  getSelectedText,
  LaunchType,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";

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

/** Copies the fixed text, then either pastes it into the frontmost app or confirms with a HUD. */
export async function deliverFix(original: string, fixed: string, output: "copy" | "paste"): Promise<void> {
  await Clipboard.copy(fixed);
  if (output === "paste") {
    await closeMainWindow({ popToRootType: PopToRootType.Immediate });
    await Clipboard.paste(fixed);
    return;
  }
  const summary = original === fixed ? "No typos found — copied to clipboard" : "Fixed text copied to clipboard";
  await showHUD(summary, { popToRootType: PopToRootType.Immediate });
}
