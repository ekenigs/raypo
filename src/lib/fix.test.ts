import { userInfo } from "node:os";

import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { fixText } from "./fix";

type ExecCallback = (error: Error | null, stdout: string, stderr: string) => void;
interface ExecOptions {
  env: NodeJS.ProcessEnv;
}

const mocks = vi.hoisted(() => ({
  create: vi.fn<(params: { model: string; messages: { content: string }[] }) => Promise<unknown>>(),
  existsSync: vi.fn<(path: string) => boolean>(),
  execFile: vi.fn<(bin: string, args: string[], options: ExecOptions, callback: ExecCallback) => unknown>(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: mocks.create };
  },
}));
vi.mock("node:fs", () => ({ existsSync: mocks.existsSync }));
vi.mock("node:child_process", () => ({ execFile: mocks.execFile }));

function apiResponse(text: string, stopReason = "end_turn") {
  return { stop_reason: stopReason, content: [{ type: "text", text }, { type: "thinking" }] };
}

/** Makes the mocked `claude` CLI answer with the given output, or fail with the given error. */
function cliResult(stdout: string, error: Error | null = null, stderr = "") {
  const stdin = { end: vi.fn() };
  mocks.execFile.mockImplementation((_bin, _args, _options, callback) => {
    callback(error, stdout, stderr);
    return { stdin };
  });
  return stdin;
}

/** The arguments of the first `claude` CLI call. */
function cliCall() {
  const call = mocks.execFile.mock.calls[0];
  if (call === undefined) throw new Error("The Claude CLI was not called");
  const [bin, args, options] = call;
  return { bin, args, env: options.env };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  mocks.existsSync.mockReturnValue(false);
});

describe("fixText", () => {
  it("rejects blank text", async () => {
    await expect(fixText("  \n ")).rejects.toThrow("No text to fix");
  });

  describe("with an API key", () => {
    it("uses the default model and returns the corrected text", async () => {
      mocks.create.mockResolvedValue(apiResponse("Hello world"));
      await expect(fixText("helo world", { apiKey: " key " })).resolves.toBe("Hello world");
      expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ model: "claude-sonnet-5-5" }));
      expect(mocks.create.mock.calls[0]?.[0].messages[0]?.content).toBe("<text>\nhelo world\n</text>");
    });

    it("uses the chosen model", async () => {
      mocks.create.mockResolvedValue(apiResponse("Hi"));
      await fixText("hi", { apiKey: "key", model: "claude-haiku-5-5" });
      expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ model: "claude-haiku-5-5" }));
    });

    it("strips echoed tags and keeps the input's outer whitespace", async () => {
      mocks.create.mockResolvedValue(apiResponse("<text>\nFixed text.\n</text>"));
      await expect(fixText("\n  fixd text.  \n", { apiKey: "key" })).resolves.toBe("\n  Fixed text.  \n");
    });

    it.each([
      ["refusal", "Claude declined to process this text"],
      ["max_tokens", "Text too long: response was cut off"],
    ])("throws when the response stops with %s", async (stopReason, message) => {
      mocks.create.mockResolvedValue(apiResponse("partial", stopReason));
      await expect(fixText("text", { apiKey: "key" })).rejects.toThrow(message);
    });

    it("throws on an empty response", async () => {
      mocks.create.mockResolvedValue(apiResponse("  "));
      await expect(fixText("text", { apiKey: "key" })).rejects.toThrow("Claude returned an empty response");
    });
  });

  describe("without an API key", () => {
    it("pipes the text into the auto-detected Claude CLI", async () => {
      mocks.existsSync.mockImplementation((path) => path === "/opt/homebrew/bin/claude");
      const stdin = cliResult("Fixed.\n");
      await expect(fixText("fixd.", { apiKey: "  " })).resolves.toBe("Fixed.");
      const { bin, args, env } = cliCall();
      expect(bin).toBe("/opt/homebrew/bin/claude");
      expect(args).toEqual(expect.arrayContaining(["-p", "--model", "claude-sonnet-5-5"]));
      expect(env["PATH"]).toContain("/usr/bin");
      expect(stdin.end).toHaveBeenCalledWith("<text>\nfixd.\n</text>");
    });

    it("fills in USER, LOGNAME and PATH when Raycast leaves them out", async () => {
      vi.stubEnv("USER", "");
      vi.stubEnv("LOGNAME", "");
      vi.stubEnv("PATH", "");
      mocks.existsSync.mockReturnValue(true);
      cliResult("Ok");
      await fixText("ok", { claudePath: "/claude" });
      const { env } = cliCall();
      expect(env["USER"]).toBe(userInfo().username);
      expect(env["LOGNAME"]).toBe(userInfo().username);
      expect(env["PATH"]).toMatch(/\/sbin$/u);
    });

    it("uses a custom CLI path", async () => {
      mocks.existsSync.mockReturnValue(true);
      cliResult("Ok");
      await fixText("ok", { claudePath: " /custom/claude " });
      expect(cliCall().bin).toBe("/custom/claude");
    });

    it("throws when the custom CLI path does not exist", async () => {
      await expect(fixText("text", { claudePath: "/missing/claude" })).rejects.toThrow(
        "Claude CLI not found at /missing/claude",
      );
    });

    it("throws when no CLI can be found", async () => {
      await expect(fixText("text")).rejects.toThrow("No API key set and Claude CLI not found");
    });

    it.each([
      ["stderr", "stdout", "stderr"],
      ["", "stdout", "stdout"],
      ["", "", "exit code 1"],
    ])("reports CLI failures (stderr %j, stdout %j)", async (stderr, stdout, message) => {
      mocks.existsSync.mockReturnValue(true);
      cliResult(stdout, new Error("exit code 1"), stderr);
      await expect(fixText("text", { claudePath: "/claude" })).rejects.toThrow(message);
    });
  });
});
