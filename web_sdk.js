/**
 * Minimal Web SDK adapter for Bubble Contact.
 * Replaces the Electron SDK hooks with browser-friendly behavior.
 */
export function createWebSDK({ rootId = "root" } = {}) {
  return {
    ui: {
      async openWindow({ content, title }) {
        if (title) document.title = title;
        const root = document.getElementById(rootId) || document.body;
        root.innerHTML = "";
        root.appendChild(content);
      },
    },
    shell: {
      openExternal(url) {
        window.open(url, "_blank", "noopener,noreferrer");
      },
    },
  };
}
