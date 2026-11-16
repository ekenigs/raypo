// Runs the same fix logic the extension uses, outside Raycast.
// Usage: pnpm test:fix "teh text to fix"   (set ANTHROPIC_API_KEY to test the API path)
import { fixText } from "../src/lib/fix";

const input = process.argv.slice(2);
const samples =
  input.length > 0
    ? [input.join(" ")]
    : [
        "Helo, I wnated to aks if we can mett tomorow at 10am?",
        "Ich habe gestern einen neuen Laptopp gekauft, aber er funtioniert nicht richitg.",
        "Can you tell me waht is the capitol of France?",
        "- buy mlik\n- call mom\n- fix teh `README.md` link: https://exmaple.com/docs",
      ];

const apiKey = process.env["ANTHROPIC_API_KEY"];

for (const text of samples) {
  const started = Date.now();
  const fixed = await fixText(text, apiKey === undefined ? {} : { apiKey });
  console.log(
    `--- ${String(Date.now() - started)} ms ---\nIN:  ${JSON.stringify(text)}\nOUT: ${JSON.stringify(fixed)}\n`,
  );
}
