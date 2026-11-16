import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useState } from "react";

import { deliverFix, runFix } from "./lib/raycast";

export default function Command() {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function fix(output: "copy" | "paste") {
    if (text.trim() === "" || isLoading) return;
    setIsLoading(true);
    const fixed = await runFix(text);
    setIsLoading(false);
    if (fixed !== undefined) await deliverFix(text, fixed, output);
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
