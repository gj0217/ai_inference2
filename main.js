const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true, 
      contextIsolation: true,
      disableBlinkFeatures: 'CodeCache',
    }
  });

  mainWindow.loadFile('index.html');
}

ipcMain.on('open-page', (event, pagePath) => {
  // 添加日志：确认进入事件处理函数，并打印接收到的 pagePath
  console.log('触发 open-page 事件，pagePath:', pagePath);
  
  const newWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      // preload: path.join(path.dirname(pagePath), 'preload.js'), // 加载与 pagePath 同级的 preload.js
      nodeIntegration: true,
      contextIsolation: true,
      disableBlinkFeatures: 'CodeCache'
    }
  });
  
  newWindow.loadFile(pagePath);
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('get-file-path', (event, filePath) => {
  return path.resolve(filePath);
});

// 处理文件选择
ipcMain.handle('select-file', async (event, options) => {
  const result = await dialog.showOpenDialog(options);
  return result.filePaths;
});

// 处理onnx文件选择
ipcMain.handle('select-file-only', async (event, options) => {
  const filters = [];
  // 支持extension为数组或字符串
  const extensions = Array.isArray(options.extension) ? options.extension : [options.extension];
  filters.push({ name: 'Model', extensions });
  const result = await dialog.showOpenDialog({
    filters,
    properties: ['openFile']
  });
  return result.filePaths;
});

// page_1处理文件选择
ipcMain.handle('select-file1', async (event, options) => {
  console.log('select-file1 接收到的 options:', options);
  const framework = options.framework; // 从渲染进程获取框架类型
  const filters = [];
  
  // 根据框架类型设置文件过滤器
  switch(framework) {
    case 'pytorch':
      filters.push({ name: 'PyTorch Model', extensions: ['pth'] });
      break;
    case 'tensorflow':
      filters.push({ name: 'TensorFlow Model', extensions: ['h5'] });
      break;
    case 'mindspore':
      filters.push({ name: 'MindSpore Model', extensions: ['ckpt'] });
      break;
    case 'paddle':
      filters.push({ name: 'PaddlePaddle Model', extensions: ['pdparams'] });
      break;
  }

  const result = await dialog.showOpenDialog({
    filters,
    properties: ['openFile']
  });
  return result.filePaths;
});
// ... existing code ...

// 处理文件保存
ipcMain.handle('save-file', async (event, { content, defaultPath }) => {
  const result = await dialog.showSaveDialog({
      defaultPath,
      filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  
  if (!result.canceled && result.filePath) {
      await fs.writeFile(result.filePath, content);
      return result.filePath;
  }
  return null;
});

// 修改文件读取的 IPC 处理
ipcMain.handle('read-file', async (event, filePath) => {
  console.log('主进程读取文件:', filePath);
  const content = await fs.readFile(filePath, 'utf8');
  console.log('主进程读取到内容长度:', content.length);
  return content;
});

// 处理文件夹选择
ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    return result.filePaths;
});

// 在 main.js 中添加新的 IPC 处理
ipcMain.handle('save-json', async (event, { content, fileName }) => {
  console.log('收到保存请求:', fileName);
  try {
      const configPath = path.join(__dirname, 'configs');
      console.log('配置文件夹路径:', configPath);
      
      if (!await fs.access(configPath)) {
          console.log('configs 文件夹不存在，创建中...');
          await fs.mkdir(configPath, { recursive: true });
          console.log('已创建 configs 文件夹');
      }
      
      const filePath = path.join(configPath, fileName);
      console.log('准备写入文件:', filePath);
      await fs.writeFile(filePath, JSON.stringify(content, null, 2));
      console.log('文件写入成功');
      return filePath;
  } catch (error) {
      console.error('保存文件失败:', error);
      throw error;
  }
});

// 简化后的命令执行处理函数
ipcMain.handle('execute-command', async (event, command) => {
  console.log('Executing command:', command);

  try {
      // 使用 exec 执行命令
      const execPromise = new Promise((resolve, reject) => {
          exec(command, { shell: '/bin/bash' }, (error, stdout, stderr) => {
              if (error) {
                  console.error(`Command execution failed: ${error.message}`);
                  reject(error);
              } else {
                  console.log(`stdout: ${stdout}`);
                  console.error(`stderr: ${stderr}`);
                  resolve({ stdout, stderr });
              }
          });
      });
      return {
          success: true,
          message: 'Command executed successfully',
          error: ''
      }
      // const { stdout, stderr } = await execPromise;

      // return { 
      //     success: true,
      //     message: stdout,
      //     error: stderr
      // };
  } catch (error) {
      console.error('Command execution failed:', error);
      return { success: false, message: error.message };
  }
});

// 在主进程中
ipcMain.handle('loadLocalService', async (event, url) => {
try {
  // 配置 webContents 允许访问本地服务
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
    callback({ requestHeaders: { ...details.requestHeaders, Origin: '*' } });
  });
  
  // 允许访问本地服务
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });
  
  return true;
} catch (error) {
  console.error('Failed to load local service:', error);
  throw error;
}
});

ipcMain.handle('delete-file', async (event, filePath) => {
  try {
    await fs.unlink(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 添加对话框引用存储
let dialogWindow = null;

ipcMain.handle('show-dialog', async (event, options) => {
    
    if (options.type === 'create') {
        if (dialogWindow && !dialogWindow.isDestroyed()) {
            dialogWindow.close();
        }
        
        dialogWindow = new BrowserWindow({
            width: options.width || 800,
            height: options.height || 600,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            },
            show: false
        });
        
        dialogWindow.on('closed', () => {
            dialogWindow = null;
        });
        
        await dialogWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${options.title || 'Dialog'}</title>
                <style>
                    body { 
                        padding: 20px; 
                        white-space: pre-wrap;
                        overflow: auto;
                        font-family: monospace;
                        background-color: white;
                        color: black;
                    }
                </style>
            </head>
            <body>${options.message || ''}</body>
            </html>
        `)}`);
        
        dialogWindow.show();
    } 
    else if (options.type === 'update' && dialogWindow && !dialogWindow.isDestroyed()) {
        await dialogWindow.webContents.executeJavaScript(`
            document.body.innerHTML = ${JSON.stringify(options.message || '')};
            document.title = ${JSON.stringify(options.title || 'Dialog')};
            window.scrollTo(0, document.body.scrollHeight);
        `);
    }
    
    return true;
});
