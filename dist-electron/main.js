import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
const IPC_CHANNELS = {
  DIALOG_OPEN_AUDIO: "dialog:openAudio",
  DIALOG_OPEN_LYRIC: "dialog:openLyric",
  DIALOG_OPEN_FOLDER: "dialog:openFolder",
  DIALOG_SAVE_LYRIC: "dialog:saveLyric",
  FILE_READ: "file:read",
  FILE_WRITE: "file:write"
};
const AUDIO_FORMATS = ["mp3", "wav", "flac", "ogg", "m4a", "aac", "wma"];
const LYRICAL_FILE_EXTENSIONS = ["krc", "lrc", "qrc", "txt"];
const require$1 = createRequire(import.meta.url);
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "KRC Maker Pro",
    webPreferences: {
      preload: path.join(__dirname$1, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_AUDIO, async () => {
    if (!win)
      return null;
    const result = await dialog.showOpenDialog(win, {
      title: "选择音频文件",
      properties: ["openFile"],
      filters: [
        { name: "音频文件", extensions: [...AUDIO_FORMATS] }
      ]
    });
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_LYRIC, async () => {
    if (!win)
      return null;
    const result = await dialog.showOpenDialog(win, {
      title: "选择歌词文件",
      properties: ["openFile"],
      filters: [
        { name: "歌词文件", extensions: [...LYRICAL_FILE_EXTENSIONS] }
      ]
    });
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_FOLDER, async () => {
    if (!win)
      return null;
    const result = await dialog.showOpenDialog(win, {
      title: "选择默认保存路径",
      properties: ["openDirectory"]
    });
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle(IPC_CHANNELS.DIALOG_SAVE_LYRIC, async (_e, args) => {
    if (!win)
      return null;
    const result = await dialog.showSaveDialog(win, {
      title: "保存歌词文件",
      defaultPath: args.defaultDir ? path.join(args.defaultDir, args.defaultName) : args.defaultName,
      filters: [
        { name: "KRC 格式", extensions: ["krc"] },
        { name: "LRC 格式", extensions: ["lrc"] },
        { name: "QRC 格式", extensions: ["qrc"] }
      ]
    });
    return result.canceled ? null : result.filePath;
  });
  ipcMain.handle(IPC_CHANNELS.FILE_READ, async (_e, filePath) => {
    const fs = require$1("node:fs/promises");
    const buffer = await fs.readFile(filePath);
    return new Uint8Array(buffer).buffer;
  });
  ipcMain.handle(
    IPC_CHANNELS.FILE_WRITE,
    async (_e, filePath, data) => {
      const fs = require$1("node:fs/promises");
      const uint8 = new Uint8Array(data);
      await fs.writeFile(filePath, uint8);
      return true;
    }
  );
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
