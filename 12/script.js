

// 获取DOM元素
const frameworkRadios = document.querySelectorAll('input[name="framework"]');
const modelDisplay = document.getElementById('model-display');
const modelPathInput = document.getElementById('modelPath');
const exportPathInput = document.getElementById('exportPath');
const dataDisplay = document.getElementById('dataDisplay');
const compareDisplay = document.getElementById('compareDisplay');
const AIDisplay = document.getElementById('AIDisplay');
const highResultDisplay = document.getElementById('highResultDisplay');
const embeddedSpeedResult = document.getElementById('embedded-speed-result');
const playButton = document.getElementById('playButton');

var randomId = "";

// 存储选择的选项
const selectedFiles = {
    granularity: "operator",
    model_path: "",
    export_path: "",
    input_path: "",
    result_path: "",
    eval_type: "",
};

// 新增：芯片类型动态渲染配置区
const chipRadios = document.querySelectorAll('input[name="granularity"]');

// 监听芯片类型变化
chipRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        selectedFiles.granularity = e.target.value;  // 将选择的芯片类型存入granularity字段
    });
});

// 重置显示内容
function resetDisplay() {
    modelPathInput.value = '';
    exportPathInput.value = '';
}

// 显示错误信息
function showError(message) {
    modelDisplay.innerHTML = `<div class="empty-content">${message}</div>`;
    logOutput.textContent = message;
    logOutput.classList.add('empty-content');
}

// 监听框架类型变化
frameworkRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        selectedFiles.granularity = e.target.value;
        resetDisplay();
    });
});

// 修改文件选择函数
window.selectFile = async function(type) {
    const paths = await window.parent.electron.selectFile();
    
    const pathInput = document.getElementById(`${type}`);
    if (paths && paths.length > 0) {
        const filePath = paths[0];
        pathInput.value = filePath;
        selectedFiles[type] = filePath;
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

window.supportList = async function() {
    console.log('supportList');
    // 检查必填项
    const requiredFields = [
        {id: 'model_path', name: '智能计算框架路径'},
        {id: 'export_path', name: '计算框架转换结果存储路径'},
        {id: 'input_path', name: '数据激励读取路径'},
        {id: 'result_path', name: '计算结果存储路径'},
        {id: 'evaluationTypeDisplay', name: '评估类型'}
    ];
    
    const missingFields = [];
    requiredFields.forEach(field => {
        const value = document.getElementById(field.id).value.trim();
        if (!value) {
            missingFields.push(field.name);
        }
    });
    if (missingFields.length > 0) {
        alert(`请先填写以下必填项：\n${missingFields.join('\n')}`);
        return;
    }

    try {
        const config = {
            id: "12",
            func:"1",
            granularity : selectedFiles.granularity,
            model_path: selectedFiles.model_path,
            input_path: selectedFiles.input_path,
            export_path: selectedFiles.export_path,
            result_path: selectedFiles.result_path,
            eval_type: selectedFiles.eval_type,
        };
        randomId = getRandomId();
        // 保存配置文件
        const savedPath = await window.parent.electron.saveJson(config, `${randomId}.json`);
        console.log('配置文件已保存到:', savedPath);

         // 执行命令行命令
         const command = `python /home/lenovo/桌面/proj/backend/main.py -c ./configs/${randomId}.json -i ${randomId} -p 8092`;
         console.log('执行命令:', command);
         const result = await window.parent.electron.executeCommand(command);
         console.log('命令执行结果:', result);
         
         if (result.error) {
             throw new Error(`Python 服务启动失败: ${result.error}`);
         }

    
        // 持续尝试读取日志文件，直到成功
        // 设置1分钟内定期获取日志
        const endTime = Date.now() + 10 * 60 * 100; // 1分钟
        const fetchData = async () => {
            if (Date.now() > endTime) return;
            try {
                logPath = window.parent.electron.joinPath('logs', `${randomId}.log`);
                const logContent = await window.parent.electron.readFile(logPath);                // 弹出一个对话框，显示日志内容
                window.parent.electron.showDialog({
                    title: '算子/算法支持清单',
                    message: logContent
                });
                return
            } catch (error) {
                console.error('获取日志失败:', error);
                setTimeout(fetchData, 5000); // 每5秒获取一次
            }
        };
        
        fetchData(); // 开始获取日志
    } catch (error) {
        console.error('服务启动错误:', error);
        modelResult.className = 'result-content';
        modelResult.textContent = '解析失败:\n' + error.message;
        showError(error.message, modelDisplay);
    }
}

window.AIInference = async function() {
    console.log('AIInference');
    const content = await window.parent.electron.readFile(`./configs/${randomId}.json`);
    const config = JSON.parse(content);
    config.func = "2";  // 修改func字段
    await window.parent.electron.saveJson(config, `${randomId}.json`);
    // 显示正在启动服务的提示
    modelDisplay.innerHTML = `
    <div style="padding: 20px; text-align: center;">
        <h3>正在启动服务...</h3>
        <p>请稍候，这可能需要几秒钟时间</p>
        <div style="margin-top: 20px; display: flex; justify-content: center;">
            <div style="width: 50px; height: 50px; border: 5px solid #f3f3f3; border-top: 5px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
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
    const command = `python /home/lenovo/桌面/proj/backend/main.py -c ./configs/${randomId}.json -i ${randomId} -p 8092`;
    console.log('执行命令:', command);
    const result = await window.parent.electron.executeCommand(command);
    console.log('命令执行结果:', result);
     
     if (result.error) {
         throw new Error(`Python 服务启动失败: ${result.error}`);
     }

    // 等待并检查服务是否可用
    const isServiceAvailable = await checkServiceAvailability('http://localhost:8092');
    if (!isServiceAvailable) {
        throw new Error('服务启动失败，请检查 Python 服务是否正常运行');
    }
    // 更新模型显示区域为iframe
    modelDisplay.innerHTML = `
        <div style="position: relative;">
            <iframe 
                src="http://localhost:8092" 
                style="width: 100%; height: 300px; border: none;"
                title="Model Visualization"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            ></iframe>
            <button 
                style="position: absolute; top: 10px; right: 10px; padding: 5px 10px; background-color: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;"
                onclick="window.open('http://localhost:8092', '_blank', 'width=1200,height=800')"
            >
                全屏查看
            </button>
        </div>
    `;

    try {
        // 持续尝试读取日志文件，直到成功
        // 设置1分钟内定期获取日志
        const endTime = Date.now() + 10 * 60 * 1000; // 10分钟
        const fetchAI = async () => {
            if (Date.now() > endTime) return;
            try {
                var logContent = ""
                if (selectedFiles.granularity === "operator") {
                    logContent = await window.parent.electron.readFile(`${selectedFiles.result_path}/${randomId}_inp.txt`);
                }else{
                    // 取selectedFiles.result_path除了最后一个/前面的部分，作为文件夹路径
                    const folderPath = selectedFiles.result_path.split('/').slice(0, -1).join('/');
                    logContent = await window.parent.electron.readFile(`${folderPath}/${randomId}_inp.txt`);
                }
                dataDisplay.textContent = logContent;
                dataDisplay.className = 'result-content';
                return; // 成功获取后直接返回，停止继续获取
            } catch (error) {
                console.error('获取日志失败:', error);
                setTimeout(fetchAI, 5000); // 每5秒获取一次
            }
            
        };
        fetchAI(); // 开始获取日志
    } catch (error) {
        console.error('服务启动错误:', error);
        dataDisplay.className = 'result-content';
        dataDisplay.textContent = '解析失败:\n' + error.message;
        showError(error.message, modelDisplay);
    }
    try {
        // 持续尝试读取日志文件，直到成功
        // 设置1分钟内定期获取日志
        const endTime = Date.now() + 10 * 60 * 1000; // 10分钟
        const fetchAI = async () => {
            if (Date.now() > endTime) return;
            try {
                const logContent = await window.parent.electron.readFile(`${selectedFiles.result_path}/${randomId}_server_out.txt`);
                highResultDisplay.textContent = logContent;
                highResultDisplay.className = 'result-content';
                return; // 成功获取后直接返回，停止继续获取
            } catch (error) {
                console.error('获取日志失败:', error);
                setTimeout(fetchAI, 5000); // 每5秒获取一次
            }
            
        };
        fetchAI(); // 开始获取日志
    } catch (error) {
        console.error('服务启动错误:', error);
        highResultDisplay.className = 'result-content';
        highResultDisplay.textContent = '解析失败:\n' + error.message;
        showError(error.message, modelDisplay);
    }
}

window.dataVerify = async function() {
    console.log('dataVerify');
    const content = await window.parent.electron.readFile(`./configs/${randomId}.json`);
    const config = JSON.parse(content);
    config.func = "3";  // 修改func字段
    await window.parent.electron.saveJson(config, `${randomId}.json`);
    // 执行命令行命令
    const command = `python3 /home/lenovo/proj/demo/python_scripts/run_tasks.py --json ./configs/${randomId}.json --mapping`;
    console.log('执行命令:', command);
    const result = await window.parent.electron.executeCommand(command);
    console.log('命令执行结果:', result);
    await window.parent.electron.deleteFile(`${selectedFiles.result_path}/infer_result.txt`);
    await window.parent.electron.deleteFile(`${selectedFiles.result_path}/cmp_result.txt`);
    await window.parent.electron.deleteFile(`${selectedFiles.result_path}/delay.txt`);

    try {
        // 持续尝试读取日志文件，直到成功
        // 设置1分钟内定期获取日志
        // 删掉infer_result.txt
        const endTime = Date.now() + 10 * 60 * 1000; // 10分钟
        const fetchCompare = async () => {
            if (Date.now() > endTime) return;
            try {
                const logContent = await window.parent.electron.readFile(`${selectedFiles.result_path}/infer_result.txt`);
                AIDisplay.textContent = logContent;
                AIDisplay.className = 'result-content';
                return; // 成功获取后直接返回，停止继续获取
            } catch (error) {
                console.error('获取日志失败:', error);
                setTimeout(fetchCompare, 5000); // 失败时继续获取
            }
        };
        fetchCompare(); // 开始获取日志
    } catch (error) {
        console.error('服务启动错误:', error);
        AIDisplay.className = 'result-content';
        AIDisplay.textContent = '解析失败:\n' + error.message;
        showError(error.message, modelDisplay);
    }
    try {
        // 持续尝试读取日志文件，直到成功
        // 设置1分钟内定期获取日志
        const endTime = Date.now() + 10 * 60 * 1000; // 10分钟
        const fetchCompare = async () => {
            if (Date.now() > endTime) return;
            try {
                const logContent = await window.parent.electron.readFile(`${selectedFiles.result_path}/cmp_result.txt`);
                compareDisplay.textContent = logContent;
                compareDisplay.className = 'result-content';
                return; // 成功获取后直接返回，停止继续获取
            } catch (error) {
                console.error('获取日志失败:', error);
                setTimeout(fetchCompare, 5000); // 失败时继续获取
            }
        };
        fetchCompare(); // 开始获取日志
    } catch (error) {
        console.error('服务启动错误:', error);
        compareDisplay.className = 'result-content';
        compareDisplay.textContent = '解析失败:\n' + error.message;
        showError(error.message, modelDisplay);
    }
    try {
        // 持续尝试读取日志文件，直到成功
        // 设置1分钟内定期获取日志
        const endTime = Date.now() + 10 * 60 * 1000; // 10分钟
        const fetchEmbedded = async () => {
            if (Date.now() > endTime) return;
            try {
                const logContent = await window.parent.electron.readFile(`${selectedFiles.result_path}/delay.txt`);
                embeddedSpeedResult.textContent = logContent;
                embeddedSpeedResult.className = 'result-content';
                return; // 成功获取后直接返回，停止继续获取
            } catch (error) {
                console.error('获取日志失败:', error);
                setTimeout(fetchEmbedded, 5000); // 失败时继续获取
            }
        };
        fetchEmbedded(); // 开始获取日志
    } catch (error) {
        console.error('服务启动错误:', error);
        embeddedSpeedResult.className = 'result-content';
        embeddedSpeedResult.textContent = '解析失败:\n' + error.message;
        showError(error.message, modelDisplay);
    }
}

window.playVideo = async function() {
    console.log('playVideo');
    try {
        // 获取文件夹下所有txt文件
        const txtFiles = await window.parent.electron.getTxtFiles('/home/lenovo/proj/subcontract/backend/data/page12/test_cases/');
        let allContent = '算子一键测试结果:\n\n';
        console.log('txtFiles:', txtFiles);
        
        // 先打开一个对话框
        const dialog = await window.parent.electron.showDialog({
            title: '算子一键测试结果',
            message: allContent,
            width: 800,
            height: 600,
            scrollable: true
        });
        
        // 逐文件处理内容
        for (const file of txtFiles) {
            const content = await window.parent.electron.readFile(file.path);
            allContent += content + '\n\n';
            // 更新对话框内容
            await window.parent.electron.updateDialog({
                title: '算子一键测试结果',
                message: allContent
            });
            
            await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000)); // 随机等待0.5-1.5秒
        }
    } catch (error) {
        console.error('播放失败:', error);
    }
}

// 生成随机ID
function getRandomId() {
    return Math.random().toString(36).substring(2, 12);
}

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

function toggleEvaluationTypeDropdown() {
    const dropdown = document.getElementById('evaluationTypeDropdown');
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
}

function selectEvaluationType(algorithm) {
    document.getElementById('evaluationTypeDisplay').value = algorithm;
    selectedFiles.eval_type = algorithm;  // 确保评估类型存入eval_type字段
    toggleEvaluationTypeDropdown();
}


// 更新工具提示文本
// 在updateTooltipText函数中添加按钮显示控制逻辑
function updateTooltipText() {
    const granularity = document.querySelector('input[name="granularity"]:checked').value;
    const operatorTip = document.getElementById('operator-tip');
    const modelTip = document.getElementById('model-tip');
    const dataOperatorTip = document.getElementById('data-operator-tip');
    const dataModelTip = document.getElementById('data-model-tip');
    
    
    if (granularity === 'operator') {
        operatorTip.style.display = 'block';
        dataOperatorTip.style.display = 'block';
        modelTip.style.display = 'none';
        dataModelTip.style.display = 'none';
        playButton.style.display = 'inline-block';
    } else {
        operatorTip.style.display = 'none';
        dataOperatorTip.style.display = 'none';
        dataModelTip.style.display = 'block';
        modelTip.style.display = 'block';
        playButton.style.display = 'none';
    }
}

// 监听单选按钮变化
document.querySelectorAll('input[name="granularity"]').forEach(radio => {
    radio.addEventListener('change', updateTooltipText);
});

// 初始化时设置工具提示文本
document.addEventListener('DOMContentLoaded', updateTooltipText);

// 在现有代码中添加更新按钮文本的函数
function updateButtonTexts() {
    const granularity = document.querySelector('input[name="granularity"]:checked').value;
    const buttons = document.querySelectorAll('.button-group button');
    
    if (granularity === 'operator') {
        buttons[0].textContent = '算子支持清单';
        buttons[2].textContent = '标准算子验证';
        buttons[3].textContent = '机载算子验证';
    } else if (granularity === 'model') {
        buttons[0].textContent = '算法支持清单';
        buttons[2].textContent = '标准算法验证';
        buttons[3].textContent = '机载算法验证';
    }
}

// 监听单选按钮变化
document.querySelectorAll('input[name="granularity"]').forEach(radio => {
    radio.addEventListener('change', updateButtonTexts);
});

// 初始化时设置按钮文本
document.addEventListener('DOMContentLoaded', updateButtonTexts);

function handleInputPathSelection() {
    const granularity = document.querySelector('input[name="granularity"]:checked').value;
    if (granularity === 'operator') {
        selectFolder('input_path');
    } else {
        selectFileOnly('input_path', 'npy');
    }
}