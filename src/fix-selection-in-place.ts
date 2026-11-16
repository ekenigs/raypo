import { Clipboard, showHUD } from "@raycast/api";

import { readSelection, runFix, showError } from "./lib/raycast";

export default async function Command() {
  const text = await readSelection();
  if (text === undefined) {
    await showError("Select some text first");
    return;
  }
  const fixed = await runFix(text);
  if (fixed === undefined) return;
  await Clipboard.copy(fixed);
  if (fixed === text) {
    await showHUD("No typos found");
    return;
  }
  await Clipboard.paste(fixed);
  await showHUD("Typos fixed");
}
