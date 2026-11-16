import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { deliverFix, readSelection, runFix, showError } from "./raycast";

const mocks = vi.hoisted(() => ({
  environment: { launchType: "userInitiated" },
  toast: { hide: vi.fn() },
  showToast: vi.fn(),
  showHUD: vi.fn(),
  getSelectedText: vi.fn<() => Promise<string>>(),
  copy: vi.fn(),
  paste: vi.fn(),
  closeMainWindow: vi.fn(),
  fixText: vi.fn<(text: string) => Promise<string>>(),
}));

vi.mock("@raycast/api", () => ({
  environment: mocks.environment,
  LaunchType: { Background: "background", UserInitiated: "userInitiated" },
  PopToRootType: { Immediate: "immediate" },
  Toast: { Style: { Animated: "animated", Failure: "failure" } },
  Clipboard: { copy: mocks.copy, paste: mocks.paste },
  closeMainWindow: mocks.closeMainWindow,
  getPreferenceValues: () => ({ apiKey: "key" }),
  getSelectedText: mocks.getSelectedText,
  showHUD: mocks.showHUD,
  showToast: mocks.showToast,
}));
vi.mock("./fix", () => ({ fixText: mocks.fixText }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.environment.launchType = "userInitiated";
  mocks.showToast.mockResolvedValue(mocks.toast);
});

describe("showError", () => {
  it("shows a failure toast", async () => {
    await showError("Failed", "details");
    expect(mocks.showToast).toHaveBeenCalledWith({ style: "failure", title: "Failed", message: "details" });
  });

  it("omits a missing message from the toast", async () => {
    await showError("Failed");
    expect(mocks.showToast).toHaveBeenCalledWith({ style: "failure", title: "Failed" });
  });

  it.each([
    ["details", "Failed: details"],
    ["", "Failed"],
    [undefined, "Failed"],
  ])("falls back to a HUD in background launches (message %j)", async (message, hud) => {
    mocks.environment.launchType = "background";
    await showError("Failed", message);
    expect(mocks.showHUD).toHaveBeenCalledWith(hud);
    expect(mocks.showToast).not.toHaveBeenCalled();
  });
});

describe("readSelection", () => {
  it("returns the selected text", async () => {
    mocks.getSelectedText.mockResolvedValue(" text ");
    await expect(readSelection()).resolves.toBe(" text ");
  });

  it("returns undefined for a blank selection", async () => {
    mocks.getSelectedText.mockResolvedValue("  ");
    await expect(readSelection()).resolves.toBeUndefined();
  });

  it("returns undefined when there is no selection", async () => {
    mocks.getSelectedText.mockRejectedValue(new Error("No selection"));
    await expect(readSelection()).resolves.toBeUndefined();
  });
});

describe("runFix", () => {
  it("returns the fixed text and hides the progress toast", async () => {
    mocks.fixText.mockResolvedValue("Fixed");
    await expect(runFix("fixd")).resolves.toBe("Fixed");
    expect(mocks.fixText).toHaveBeenCalledWith("fixd", { apiKey: "key" });
    expect(mocks.toast.hide).toHaveBeenCalled();
  });

  it("skips the progress toast in background launches", async () => {
    mocks.environment.launchType = "background";
    mocks.fixText.mockResolvedValue("Fixed");
    await expect(runFix("fixd")).resolves.toBe("Fixed");
    expect(mocks.showToast).not.toHaveBeenCalled();
  });

  it.each([
    [new Error("API down"), "API down"],
    ["boom", "boom"],
  ])("reports failures and returns undefined (%j)", async (error, message) => {
    mocks.fixText.mockRejectedValue(error);
    await expect(runFix("text")).resolves.toBeUndefined();
    expect(mocks.showToast).toHaveBeenLastCalledWith({ style: "failure", title: "Could not fix text", message });
  });
});

describe("deliverFix", () => {
  it("copies and pastes into the frontmost app", async () => {
    await deliverFix("fixd", "Fixed", "paste");
    expect(mocks.copy).toHaveBeenCalledWith("Fixed");
    expect(mocks.closeMainWindow).toHaveBeenCalledWith({ popToRootType: "immediate" });
    expect(mocks.paste).toHaveBeenCalledWith("Fixed");
    expect(mocks.showHUD).not.toHaveBeenCalled();
  });

  it.each([
    ["fixd", "Fixed", "Fixed text copied to clipboard"],
    ["Fine", "Fine", "No typos found — copied to clipboard"],
  ])("copies and confirms with a HUD (%j → %j)", async (original, fixed, hud) => {
    await deliverFix(original, fixed, "copy");
    expect(mocks.copy).toHaveBeenCalledWith(fixed);
    expect(mocks.paste).not.toHaveBeenCalled();
    expect(mocks.showHUD).toHaveBeenCalledWith(hud, { popToRootType: "immediate" });
  });
});
