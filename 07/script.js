// 存储选择的文件路径
const selectedFiles = {
    model_path: ".././sys2/exported/resnet50.onnx",
    export_path: ".././exported/"
};

// 选择文件夹
window.selectFolder = async function(type) {
    try {
        const paths = await window.parent.electron.selectFolder();
        if (paths && paths.length > 0) {
            const folderPath = paths[0];
            document.getElementById(`${type}`).value = folderPath;
            selectedFiles[type] = folderPath;
        }
    } catch (error) {
        console.error('选择文件夹失败:', error);
    }
};

// 修改文件选择函数
window.selectFileOnly = async function(type,extension) {
    const paths = await window.parent.electron.selectFileOnly({ extension });
    const pathInput = document.getElementById(`${type}`);
    if (paths && paths.length > 0) {
        const filePath = paths[0];
        pathInput.value = filePath;
        selectedFiles[type] = filePath;
    }
};

// 检查服务是否可用的函数
async function checkServiceAvailability(url, maxAttempts = 10, interval = 1000) {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                return true;
            }
        } catch (error) {
            console.log(`尝试 ${i + 1}/${maxAttempts} 连接服务...`);
            await new Promise(resolve => setTimeout(resolve, interval));
        }
    }
    return false;
}

// 显示错误信息的函数
function showError(message, modelDisplay) {
    modelDisplay.innerHTML = `
        <div style="padding: 20px; color: #dc3545;">
            <h3>服务启动失败</h3>
            <p>${message}</p>
            <p>请检查：</p>
            <ul>
                <li>Python 服务是否正常运行</li>
                <li>端口 8085 是否被占用</li>
                <li>配置文件是否正确</li>
                <li>Python 环境是否正确配置</li>
            </ul>
            <div style="margin-top: 20px; padding: 10px; background: #f8d7da; border-radius: 4px;">
                <p style="margin: 0;">调试信息：</p>
                <pre style="margin: 10px 0 0 0; white-space: pre-wrap;">${message}</pre>
            </div>
        </div>
    `;
}

window.parseModelFunction = async function() {
    console.log('parseModelFunction');
    const modelResult = document.getElementById('model-function-display');
    const modelDisplay = document.querySelector('.model-display');
    try {
        const randomId = getRandomId();
        const config = {
            id: "7",
            func: "1",
            model_path: selectedFiles.model_path,
            export_path: selectedFiles.export_path,
        };

        // 保存配置文件
        const savedPath = await window.parent.electron.saveJson(config, `${randomId}.json`);
        console.log('配置文件已保存到:', savedPath);
        
        // 显示正在启动服务的提示
        modelDisplay.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <h3>正在启动服务...</h3>
                <p>请稍候，这可能需要几秒钟时间</p>
                <div style="margin-top: 20px;">
                    <div style="display: inline-block; width: 50px; height: 50px; border: 5px solid #f3f3f3; border-top: 5px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            </div>
        `;

        // 执行命令行命令
        const command = `python /home/lenovo/桌面/proj/backend/main.py -c ./configs/${randomId}.json -i ${randomId} -p 8085`;
        console.log('执行命令:', command);
        
        // 执行命令并等待结果
        const result = await window.parent.electron.executeCommand(command);
        console.log('命令执行结果:', result);
        
        if (result.error) {
            throw new Error(`Python 服务启动失败: ${result.error}`);
        }
        
        // 等待并检查服务是否可用
        const isServiceAvailable = await checkServiceAvailability('http://localhost:8085');
        if (!isServiceAvailable) {
            throw new Error('服务启动失败，请检查 Python 服务是否正常运行');
        }
        
        // 更新模型显示区域为iframe
        modelDisplay.innerHTML = `
            <div style="position: relative;">
                <iframe 
                    src="http://localhost:8085" 
                    style="width: 100%; height: 300px; border: none;"
                    title="Model Visualization"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                ></iframe>
                <button 
                    style="position: absolute; top: 10px; right: 10px; padding: 5px 10px; background-color: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;"
                    onclick="window.open('http://localhost:8085', '_blank', 'width=1200,height=800')"
                >
                    全屏查看
                </button>
            </div>
        `;

        const logPath = window.parent.electron.joinPath('logs', `${randomId}.log`);
        const logContent = await window.parent.electron.readFile(logPath);
        modelResult.textContent = logContent;
        modelResult.className = 'result-content';

    } catch (error) {
        console.error('服务启动错误:', error);
        modelResult.className = 'result-content';
        modelResult.textContent = '解析失败:\n' + error.message;
        showError(error.message, modelDisplay);
    }
}

window.parseBasicOperations = async function() {
    console.log('parseBasicOperations');
    const operationResult = document.getElementById('basic-operations-display');
    const modelDisplay = document.querySelector('.model-display');
    try {
        const randomId = getRandomId();
        const config = {
            id: "7",
            func: "2",
            model_path: selectedFiles.model_path,
            export_path: selectedFiles.export_path,
        };

        // 保存配置文件
        const savedPath = await window.parent.electron.saveJson(config, `${randomId}.json`);
        console.log('配置文件已保存到:', savedPath);

        // 执行命令行命令
        const command = `python /home/lenovo/桌面/proj/backend/main.py -c ./configs/${randomId}.json -i ${randomId} -p 8085`;
        console.log('执行命令:', command);
        
        // 显示正在启动服务的提示
        modelDisplay.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <h3>正在启动服务...</h3>
                <p>请稍候，这可能需要几秒钟时间</p>
                <div style="margin-top: 20px;">
                    <div style="display: inline-block; width: 50px; height: 50px; border: 5px solid #f3f3f3; border-top: 5px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            </div>
        `;

        // 执行命令并等待结果
        const result = await window.parent.electron.executeCommand(command);
        console.log('命令执行结果:', result);
        
        if (result.error) {
            throw new Error(`Python 服务启动失败: ${result.error}`);
        }
        
        // 等待并检查服务是否可用
        const isServiceAvailable = await checkServiceAvailability('http://localhost:8085');
        if (!isServiceAvailable) {
            throw new Error('服务启动失败，请检查 Python 服务是否正常运行');
        }
        
        // 更新模型显示区域为iframe
        modelDisplay.innerHTML = `
        <div style="position: relative;">
            <iframe 
                src="http://localhost:8085" 
                style="width: 100%; height: 300px; border: none;"
                title="Model Visualization"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            ></iframe>
            <button 
                style="position: absolute; top: 10px; right: 10px; padding: 5px 10px; background-color: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;"
                onclick="window.open('http://localhost:8085', '_blank', 'width=1200,height=800')"
            >
                全屏查看
            </button>
        </div>
    `;
        // 持续尝试读取日志文件，直到成功
        // 设置1分钟内定期获取日志
        const endTime = Date.now() + 10 * 60 * 100; // 1分钟
        const fetchData = async () => {
            if (Date.now() > endTime) return;
            try {
                const logPath = window.parent.electron.joinPath('logs', `${randomId}.log`);
                const logContent = await window.parent.electron.readFile(logPath);
                operationResult.textContent = logContent;
                operationResult.className = 'result-content';
            } catch (error) {
                console.error('获取日志失败:', error);
            }
            setTimeout(fetchData, 5000); // 每5秒获取一次
        };
        
        fetchData(); // 开始获取日志

    } catch (error) {
        console.error('服务启动错误:', error);
        operationResult.className = 'result-content';
        operationResult.textContent = '解析失败:\n' + error.message;
        showError(error.message, operationResult);
    }
}

// 生成随机ID
function getRandomId() {
    return Math.random().toString(36).substring(2, 12);
}