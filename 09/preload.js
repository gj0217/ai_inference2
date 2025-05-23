const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs').promises;

try {
    contextBridge.exposeInMainWorld('electron', {
        selectFolder: async () => await ipcRenderer.invoke('select-folder'),
        selectFile: async (options) => await ipcRenderer.invoke('select-file', options),
        saveJson: async (content, fileName) => {
            console.log('preload: 调用 saveJson', fileName);
            return await ipcRenderer.invoke('save-json', { content, fileName });
        },
        saveLog: async (content, fileName) => await ipcRenderer.invoke('save-log', { content, fileName }),
        serverInference: async (config) => await ipcRenderer.invoke('server-inference', config),
        deviceInference: async (config) => await ipcRenderer.invoke('device-inference', config),
        executeCommand: async (command) => await ipcRenderer.invoke('execute-command', command),
        readFile: async (filePath) => await ipcRenderer.invoke('read-file', filePath),
        joinPath: (...args) => path.join(...args),
        getAppPath: () => __dirname,
        saveImg: async (imgPath, fileName) => await ipcRenderer.invoke('save-img', { imgPath, fileName })
    });
    console.log('APIs exposed successfully');
} catch (error) {
    console.error('Error in preload script:', error);
}