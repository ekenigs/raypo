import { Action, ActionPanel, Clipboard, closeMainWindow, Form, Icon, PopToRootType, showHUD } from "@raycast/api";
import { useState } from "react";

import { runFix, summary } from "./lib/raycast";

export default function Command() {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function fix(output: "copy" | "paste") {
    if (text.trim() === "" || isLoading) return;
    setIsLoading(true);
    const fixed = await runFix(text);
    setIsLoading(false);
    if (fixed === undefined) return;
    await Clipboard.copy(fixed);
    if (output === "paste") {
      await closeMainWindow({ popToRootType: PopToRootType.Immediate });
      await Clipboard.paste(fixed);
    } else {
      await showHUD(summary(text, fixed), { popToRootType: PopToRootType.Immediate });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Fix and Copy" icon={Icon.Clipboard} onAction={() => void fix("copy")} />
          <Action
            title="Fix and Paste"
            icon={Icon.Text}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
            onAction={() => void fix("paste")}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        placeholder="Type or paste text with typos… (⌘↵ to fix and copy)"
        value={text}
        onChange={setText}
        autoFocus
      />
      <Form.Description text="⌘↵ fix and copy  ·  ⌘⇧↵ fix and paste into the frontmost app" />
    </Form>
  );
}
