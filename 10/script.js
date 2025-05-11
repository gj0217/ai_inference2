

// 获取DOM元素
const frameworkRadios = document.querySelectorAll('input[name="framework"]');
const inputShapeSelect = document.getElementById('inputShape');
const logOutput = document.getElementById('logOutput');
const modelDisplay = document.getElementById('model-display');
const modelPathInput = document.getElementById('modelPath');
const exportPathInput = document.getElementById('exportPath');

// 存储选择的选项
const selectedFiles = {
    model_path: "",
    result_dir_path: "",
    fusion_switch_file: "",
    buffer_optimize: "",
    algorithm: "",
};

// 新增：芯片类型动态渲染配置区
const chipRadios = document.querySelectorAll('input[name="chipType"]');

function renderChipConfigArea() {
    const selected = document.querySelector('input[name="chipType"]:checked').value;
    selectedFiles.type = selected; // 将选中的芯片类型更新到selectedFiles中
    const area = document.getElementById('chip-config-area');
    // 修改后的下拉框内容
    const selectHtml = '<select><option value="" selected></option><option value="fusion_on_on.config">fusion_on_on.config</option><option value="fusion_off_off.config">fusion_off_off.config</option></select>';
    const cacheSelectHtml = '<select><option value="" selected></option><option value="off_optimize">off_optimize</option><option value="l2_optimize">l2_optimize</option></select>';
    if (selected === 'atlas') {
        area.innerHTML = `
            <div class="config-grid">
                <div class="config-item">
                    <label>模型精度：</label>
                    ${selectHtml.replace('<select>', '<select id="optimize310b" onchange="selectedFiles.fusion_switch_file = this.value">')}
                </div>
                <div class="config-item">
                    <label>接口优化：</label>
                    ${cacheSelectHtml.replace('<select>', '<select id="cache310b" onchange="selectedFiles.buffer_optimize = this.value">')}
                </div>
            </div>
        `;
    }
}

chipRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        renderChipConfigArea();
    });
});

// 页面加载时初始化一次
renderChipConfigArea();

// 重置显示内容
function resetDisplay() {
    modelDisplay.innerHTML = '<div class="empty-content">点击"模型解析"按钮查看模型结构图</div>';
    logOutput.textContent = '点击"模型解析"按钮查看日志输出';
    logOutput.classList.add('empty-content');
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
        const selectedFramework = e.target.value;
        const defaultShape = frameworkInputShapes[selectedFramework];
        inputShapeSelect.value = defaultShape;
        resetDisplay();
    });
});

// 修改文件选择函数
window.selectFile = function(type) {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = e => {
        const file = e.target.files[0];
        if (file) {
            const pathInput = document.getElementById('modelPath'); // Fixed: added quotes around modelPath
            pathInput.value = file.path;
            selectedFiles.model_path = file.path;
        }
    };
    input.click();
};

// 选择文件夹
window.selectFolder = async function() {
    try {
        const paths = await window.parent.electron.selectFolder();
        if (paths && paths.length > 0) {
            const folderPath = paths[0];
            document.getElementById('exportPath').value = folderPath;
            selectedFiles.result_dir_path = folderPath;
        }
    } catch (error) {
        console.error('选择文件夹失败:', error);
    }
};

window.deployModel = async function() {
    console.log('deployModel');
    try {
        const config1 = {
            task_type : "convert",
            device : "atlas",
            log : "/home/lenovo/proj/demo/log.txt",
            model_path: selectedFiles.model_path,
            result_dir_path : selectedFiles.result_dir_path,
            netron_display: 1,
            port: 8090,
            timeout: 20
        };

        // 添加非空参数
        if (selectedFiles.fusion_switch_file) {
            config1.fusion_switch_file = selectedFiles.fusion_switch_file;
        }
        if (selectedFiles.buffer_optimize) {
            config1.buffer_optimize = selectedFiles.buffer_optimize;
        }

        // 保存配置文件
        const savedPath = await window.parent.electron.saveJson(config1, `convert_${selectedFiles.algorithm}.json`);
        console.log('配置文件已保存到:', savedPath);
        const config2 = {
            task_jsons: [
                savedPath
            ]
        };

        // 保存配置文件
        const savePath2 = await window.parent.electron.saveJson(config2, `page10_convert_${selectedFiles.algorithm}.json`);
        console.log('配置文件已保存到:', savePath2);

        // 启动服务
        const command0 = 'rm /home/lenovo/proj/demo/log.txt';
        await window.parent.electron.executeCommand(command0);
        // 执行命令行命令
        const command = `python3 ../python_scripts/run_tasks.py --json ${savePath2}`;
        console.log('执行命令:', command);
        
        // 执行命令并等待结果
        const result = await window.parent.electron.executeCommand(command);
        console.log('命令执行结果:', result);
        
        if (result.error) {
            throw new Error(`Python 服务启动失败: ${result.error}`);
        }

        // 等待并检查服务是否可用
        const isServiceAvailable = await checkServiceAvailability('http://localhost:8090');
        if (!isServiceAvailable) {
            throw new Error('服务启动失败，请检查 Python 服务是否正常运行');
        }
        // 更新模型显示区域为iframe
        modelDisplay.innerHTML = `
            <div style="position: relative;">
                <iframe 
                    src="http://localhost:8090" 
                    style="width: 100%; height: 300px; border: none;"
                    title="Model Visualization"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                ></iframe>
                <button 
                    style="position: absolute; top: 10px; right: 10px; padding: 5px 10px; background-color: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;"
                    onclick="window.open('http://localhost:8090', '_blank', 'width=1200,height=800')"
                >
                    全屏查看
                </button>
            </div>
        `;
        // 持续尝试读取日志文件，直到成功
        let logContent = '';
        while (!logContent) {
            try {
                logContent = await window.parent.electron.readFile(config1.log);
                if (!logContent) {
                    await new Promise(resolve => setTimeout(resolve, 5000)); // 等待5秒
                }
            } catch (error) {
                await new Promise(resolve => setTimeout(resolve, 5000)); // 等待5秒
            }
        }

        logOutput.textContent = logContent;
        logOutput.className = 'result-content';


    } catch (error) {
        console.error('服务启动错误:', error);
        modelResult.className = 'result-content';
        modelResult.textContent = '解析失败:\n' + error.message;
        showError(error.message, modelDisplay);
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

function toggleAlgorithmDropdown() {
    const dropdown = document.getElementById('algorithmDropdown');
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
}

function selectAlgorithm(algorithm) {
    document.getElementById('algorithmDisplay').value = algorithm;
    selectedFiles.algorithm = algorithm;  // 将选择的算法记录到selectedFiles中
    toggleAlgorithmDropdown();
}