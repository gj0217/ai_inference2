// 全局变量
const selectedFiles = {
    task: "classification",
    model_path: "",
    input_path: "",
    result_path: "",
};

var randomId = "";
const aiResult = document.getElementById('ai-result');
const groundResult = document.getElementById('ground-result');

// 添加历史记录管理
const history = {
    records: [], // 存储历史记录
    currentIndex: -1, // 当前显示的记录索引
    maxSize: 10, // 最大历史记录数量
};

// 获取选中的任务类型
function getSelectedTask() {
    const taskRadios = document.getElementsByName('task');
    for (const radio of taskRadios) {
        if (radio.checked) {
            selectedFiles.task = radio.value;
            return radio.value;
        }
    }
    return 'classification';
}

// 生成随机ID
function getRandomId() {
    return Math.random().toString(36).substring(2, 12);
}

// 显示加载状态
function showLoading() {
    const serverResult = document.getElementById('server-result');
    const deviceResult = document.getElementById('device-result');
    if (serverResult) serverResult.textContent = 'Loading...';
    if (deviceResult) deviceResult.textContent = 'Loading...';
}

// 检查是否所有必选项都已选择
function checkAllSelected() {
    const isModelSelected = selectedFiles.model_path !== undefined;
    const isInputSelected = selectedFiles.input_path !== undefined;
    const isOutputSelected = selectedFiles.result_path !== undefined;
    const isTaskSelected = getSelectedTask() !== null;

    console.log('检查选择状态:', {
        model: isModelSelected,
        input: isInputSelected,
        output: isOutputSelected,
        task: isTaskSelected
    });
}

// 添加显示选中图片的函数
function displaySelectedImage(filePath) {
    const displayImage = document.getElementById('display-image');
    const placeholder = document.querySelector('.image-placeholder');
    
    if (displayImage) {
        displayImage.src = filePath;
        displayImage.style.display = 'block';
        if (placeholder) {
            placeholder.style.display = 'none';
        }
    }
}

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
window.selectFolder = async function() {
    try {
        const paths = await window.parent.electron.selectFolder();
        if (paths && paths.length > 0) {
            const folderPath = paths[0];
            document.getElementById('result_path').value = folderPath;
            selectedFiles.result_path = folderPath;
            checkAllSelected();
        }
    } catch (error) {
        console.error('选择文件夹失败:', error);
    }
};

// 添加更新显示标题的函数
function updateDisplayTitle() {
    const taskType = document.querySelector('input[name="task"]:checked').value;
    const displayTitle = document.getElementById('stimulus-display-title');
    if (displayTitle) {
        displayTitle.textContent = `激励数据显示（${taskType === 'classification' ? '图像分类' : '目标检测'}）：`;
    }
}

// 在 DOMContentLoaded 事件监听器中添加任务选择的事件处理
document.addEventListener('DOMContentLoaded', () => {
    console.log('页面加载完成');
    
    // 绑定单选按钮事件
    document.querySelectorAll('input[name="task"]').forEach(radio => {
        radio.addEventListener('change', () => {
            checkAllSelected();
            // 如果是任务类型的单选按钮，更新显示标题
            if (radio.name === 'task') {
                updateDisplayTitle();
            }
        });
    });

    // 初始化显示标题
    updateDisplayTitle();
});

window.serverInference = async function() {
    console.log('开始执行 serverInference');
    
    // 清空三个展示框，删除之前生成的内容
    resetDisplay();
    
    if (!selectedFiles.model_path) {
        alert('请先选择模型文件');
        return;
    }
    if (!selectedFiles.input_path) {
        alert('请先选择数据文件');
        return;
    }
    if (!selectedFiles.result_path) {
        alert('请先选择输出文件夹');
        return;
    }

    groundResult.className = 'result-content loading';
    groundResult.textContent = '正在进行地面平台推理...';
    randomId = getRandomId();

    try {
        const config = {
            id: "11",
            func:"1",
            task: selectedFiles.task,
            model_path: selectedFiles.model_path,
            input_path: selectedFiles.input_path,
            result_path: selectedFiles.result_path
        };

        // 保存配置文件
        const savedPath = await window.parent.electron.saveJson(config, `${randomId}.json`);
        console.log('配置文件已保存到:', savedPath);

        // 执行命令行命令
        const command = `conda run -n env python /home/lenovo/桌面/proj/backend/main.py -c ./configs/${randomId}.json -i ${randomId} -p 8080`;
        console.log('执行命令:', command);
        await window.parent.electron.executeCommand(command);
        // sleep 5s
        await new Promise(resolve => setTimeout(resolve, 5000));
        // 展示randomId.log文件内容
        var logPath = "";
        if (selectedFiles.task === 'classification') {
            logPath = window.parent.electron.joinPath('logs', `${randomId}.log`);
            const logContent = await window.parent.electron.readFile(logPath);
            const lines = logContent.split('\n');
            if (lines.length > 1) {
                const generalSpeedResult = document.getElementById('general-speed-result');
                if (generalSpeedResult) {
                    // 取第二行，并且舍弃前面的时间戳
                    generalSpeedResult.textContent = `${lines[1]}`;
                }
            }
            if (lines.length > 2) {
                groundResult.textContent = lines.slice(2).join('\n');
                groundResult.className = 'result-content';
            }
        }else{
            logPath = window.parent.electron.joinPath(selectedFiles.result_path, `${randomId}_server_output.jpg`);
            groundResult.innerHTML = `<img src="file://${logPath}" class="result-image" alt="检测结果">`;
        }
        

        // 现在才显示激励图片
        displaySelectedImage(selectedFiles.input_path);

    } catch (error) {
        groundResult.className = 'result-content';
        groundResult.textContent = '推理失败:\n' + error.message;
    }
};

window.deviceInference = async function() {
    console.log('开始执行 deviceInference');
    if (!selectedFiles.model_path) {
        alert('请先选择模型文件');
        return;
    }
    if (!selectedFiles.input_path) {
        alert('请先选择数据文件');
        return;
    }
    if (!selectedFiles.result_path) {
        alert('请先选择输出文件夹');
        return;
    }
    aiResult.className = 'result-content loading';
    aiResult.textContent = '正在进行机载AI芯片平台推理...';

    try {
        const content = await window.parent.electron.readFile(`./configs/${randomId}.json`);
        const config = JSON.parse(content);
        config.func = "2";  // 修改func字段
        await window.parent.electron.saveJson(config, `${randomId}.json`);
        console.log('配置文件已更新');
        // 执行命令行命令
        const command = `conda run -n env python3 /home/lenovo/proj/demo/python_scripts/run_tasks.py --json ./configs/${randomId}.json --mapping`;
        console.log('执行命令:', command);
        await window.parent.electron.executeCommand(command);

        aiResult.className = 'result-content';
        if (selectedFiles.task === 'classification') {
            const endTime = Date.now() + 10 * 60 * 1000; // 10分钟超时
            while (Date.now() <= endTime) {
                try {
                    const logContent = await window.parent.electron.readFile(selectedFiles.result_path+'/result.txt');
                    if (logContent && logContent.trim()) {
                        aiResult.textContent = logContent;
                        break;
                    }
                } catch (error) {
                    console.error('获取结果失败:', error);
                }
                await new Promise(resolve => setTimeout(resolve, 5000)); // 等待5秒
            }
        } else {
            const endTime = Date.now() + 10 * 60 * 1000; // 10分钟超时
            while (Date.now() <= endTime) {
                try {
                    const logPath = window.parent.electron.joinPath(selectedFiles.result_path, `result.jpg`);
                    const exists = await window.parent.electron.fileExists(logPath);
                    if (exists) {
                        aiResult.innerHTML = `<img src="file://${logPath}?t=${Date.now()}" class="result-image" alt="检测结果">`;
                        break;
                    }
                } catch (error) {
                    console.error('获取图片失败:', error);
                }
                await new Promise(resolve => setTimeout(resolve, 5000)); // 等待5秒
            }
        }
        const delayPath = window.parent.electron.joinPath(selectedFiles.result_path, `delay.txt`);
        // 在embedded-speed-result显示delayPath的内容
        const delayContent = await window.parent.electron.readFile(delayPath);
        embeddedSpeedResult = document.getElementById('embedded-speed-result');
        embeddedSpeedResult.textContent = delayContent;
        
        // 并加入历史记录
        addHistoryRecord({
            inputImage: selectedFiles.input_path,
            leftResult: groundResult.textContent || groundResult.innerHTML,
            rightResult: aiResult.textContent|| aiResult.innerHTML,
            timestamp: new Date().toISOString(),
            taskType: selectedFiles.task,   
        });
        updateNavigationButtons();  
        

    } catch (error) {
        aiResult.className = 'result-content';
        aiResult.textContent = '推理失败:\n' + error.message;
    }
};

function resetDisplay() {    
    // 清空结果显示区域
    document.getElementById('ground-result').textContent = '';
    document.getElementById('ai-result').textContent = '';
    
    // 重置图片显示
    document.getElementById('display-image').style.display = 'none';
    document.querySelector('.image-placeholder').style.display = 'block';

    // 删掉之前生成的result.txt/jpg
    const resultPath = window.parent.electron.joinPath(selectedFiles.result_path, `result.txt`);
    window.parent.electron.executeCommand(`rm ${resultPath}`); 
    const resultPath1 = window.parent.electron.joinPath(selectedFiles.result_path, `result.jpg`);
    window.parent.electron.executeCommand(`rm ${resultPath1}`);
}

// 添加历史记录
function addHistoryRecord(record) {
    // 存储实际内容而不是HTML元素
    const processedRecord = {
        inputImage: record.inputImage,
        leftResult: record.leftResult.textContent || record.leftResult,
        rightResult: record.rightResult.textContent || record.rightResult,
        timestamp: record.timestamp,
        taskType: record.taskType
    };

    if (history.records.length >= history.maxSize) {
        history.records.shift();
    }
    history.records.push(processedRecord);
    history.currentIndex = history.records.length - 1;
    updateNavigationButtons();
}

// 更新导航按钮状态
function updateNavigationButtons() {
    const prevButton = document.querySelector('.nav-button.prev');
    const nextButton = document.querySelector('.nav-button.next');
    if (prevButton && nextButton) {
        prevButton.style.display = history.currentIndex > 0 ? 'block' : 'none';
        nextButton.style.display = history.currentIndex < history.records.length - 1 ? 'block' : 'none';
    }
}

// 显示指定索引的历史记录
function showHistoryRecord(index) {
    if (index >= 0 && index < history.records.length) {
        const record = history.records[index];
        history.currentIndex = index;
        
        // 显示激励数据图片
        const displayImage = document.getElementById('display-image');
        if (displayImage && record.inputImage) {
            displayImage.src = record.inputImage;
            displayImage.style.display = 'block';
            const placeholder = document.querySelector('.image-placeholder');
            if (placeholder) {
                placeholder.style.display = 'none';
            }
        }
        
        // 显示结果
        const groundResult = document.getElementById('ground-result');
        if (groundResult && record.leftResult) {
            groundResult.className = 'result-content';
            if (record.taskType === 'classification') {
                groundResult.textContent = record.leftResult.textContent;
            } else {
                groundResult.innerHTML = record.leftResult.innerHTML;
            }
        }

        const aiResult = document.getElementById('ai-result');
        if (aiResult && record.rightResult) {
            aiResult.className ='result-content';
            if (record.taskType === 'classification') {
                aiResult.textContent = record.rightResult.textContent;
            }else{
                aiResult.innerHTML = record.rightResult.innerHTML;
            }
        }
        
        updateNavigationButtons();
    }
}

// 导航按钮点击处理
window.navigateHistory = function(direction) {
    const newIndex = direction === 'prev' ? history.currentIndex - 1 : history.currentIndex + 1;
    showHistoryRecord(newIndex);
};

// 添加清空显示区域的函数
function clearDisplayAreas() {
    document.getElementById('display-image').style.display = 'none';
    document.querySelector('.image-placeholder').style.display = 'block';
    document.getElementById('ground-result').textContent = '';
    document.getElementById('ai-result').textContent = '';
    // 清空历史记录
    imageHistory = [];
    currentImageIndex = -1;
}

// 为所有radio按钮添加事件监听
document.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', clearDisplayAreas);
});
