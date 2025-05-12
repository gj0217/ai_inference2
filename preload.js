const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs').promises;

window.addEventListener('DOMContentLoaded', () => {
  const links = document.querySelectorAll('a[data-page]');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const pagePath = link.getAttribute('data-page');
      ipcRenderer.send('open-page', pagePath);
    });
  });
});

try {
    contextBridge.exposeInMainWorld('electron', {
        selectFolder: async () => await ipcRenderer.invoke('select-folder'),
        selectFile: async (options) => {
            const defaultPath = '/home/lenovo/桌面/proj/backend/data'; // 设置默认路径
            return await ipcRenderer.invoke('select-file', { ...options, defaultPath });
        },
        selectFile1: async (options) => {
          const defaultPath = '/home/lenovo/桌面/proj/backend/data'; // 设置默认路径
          return await ipcRenderer.invoke('select-file1', { ...options, defaultPath });
        },
        selectFileOnly: async (options) => {
          const defaultPath = '/home/lenovo/桌面/proj/backend/data'; // 设置默认路径
          return await ipcRenderer.invoke('select-file-only', { ...options, defaultPath });
        },
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
        saveImg: async (imgPath, fileName) => await ipcRenderer.invoke('save-img', { imgPath, fileName }),
        deleteFile: async (filePath) => await ipcRenderer.invoke('delete-file', filePath),
        getTxtFiles: async (folderPath) => {
          try {
              const files = await fs.readdir(folderPath);  // 修改这里，移除.promises
              return files
                  .filter(file => file.endsWith('.txt'))
                  .map(file => ({
                      name: file,
                      path: path.join(folderPath, file)
                  }));
          } catch (error) {
              console.error('获取txt文件失败:', error);
              return [];
          }
        },
        showDialog: async (options) => {
            return await ipcRenderer.invoke('show-dialog', {
                ...options,
                type: 'create'
            });
        },
        updateDialog: async (options) => {
            return await ipcRenderer.invoke('show-dialog', {
                ...options,
                type: 'update'
            });
        }
    });
    console.log('APIs exposed successfully');
} catch (error) {
    console.error('Error in preload script:', error);
}