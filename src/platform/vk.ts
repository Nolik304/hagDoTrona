import bridge from "@vkontakte/vk-bridge";

export const VK_APP_URL = "https://vk.ru/app54071751";

let initialized = false;

export async function initVK(): Promise<boolean> {
  if (initialized) return true;
  try {
    await bridge.send("VKWebAppInit");
    initialized = true;
    await bridge.send("VKWebAppSetViewSettings", {
      status_bar_style: "light",
      action_bar_color: "#0b0e13",
    });
    return true;
  } catch {
    return false;
  }
}

export async function shareVK(title: string, text: string): Promise<boolean> {
  try {
    void title;
    void text;
    await bridge.send("VKWebAppShare", { link: VK_APP_URL });
    return true;
  } catch {
    return false;
  }
}