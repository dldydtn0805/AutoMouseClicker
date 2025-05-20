document.addEventListener('DOMContentLoaded', function() {
    // 단일 위치 탭 요소
    const intervalInput = document.getElementById('interval');
    const clickTypeSelect = document.getElementById('clickType');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const recordPositionBtn = document.getElementById('recordPositionBtn');
    const currentPositionSpan = document.getElementById('current-position');

    // 다중 위치 탭 요소
    const multiIntervalInput = document.getElementById('multiInterval');
    const multiClickTypeSelect = document.getElementById('multiClickType');
    const addPositionBtn = document.getElementById('addPositionBtn');
    const clearPositionsBtn = document.getElementById('clearPositionsBtn');
    const positionsList = document.getElementById('positions-list');
    const startMultiBtn = document.getElementById('startMultiBtn');
    const stopMultiBtn = document.getElementById('stopMultiBtn');

    // 공통 요소
    const statusDiv = document.getElementById('status');
    const tabs = document.querySelectorAll('.tab');
    const singleTab = document.getElementById('single-tab');
    const multiTab = document.getElementById('multi-tab');

    // 탭 전환 기능
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            const tabName = this.getAttribute('data-tab');
            if (tabName === 'single') {
                singleTab.style.display = 'block';
                multiTab.style.display = 'none';
            } else {
                singleTab.style.display = 'none';
                multiTab.style.display = 'block';
            }
        });
    });

    // 저장된 설정 불러오기
    chrome.storage.local.get([
        'position', 'interval', 'clickType', 'isActive',
        'multiPositions', 'multiInterval', 'multiClickType', 'isMultiActive'
    ], function(data) {
        // 단일 위치 설정
        if (data.position) {
            currentPositionSpan.textContent = `X: ${data.position.x}, Y: ${data.position.y}`;
        }
        if (data.interval) intervalInput.value = data.interval;
        if (data.clickType) clickTypeSelect.value = data.clickType;

        // 다중 위치 설정
        if (data.multiInterval) multiIntervalInput.value = data.multiInterval;
        if (data.multiClickType) multiClickTypeSelect.value = data.multiClickType;
        if (data.multiPositions && data.multiPositions.length > 0) {
            updatePositionsList(data.multiPositions);
        }

        // 상태 업데이트
        updateStatus(data.isActive || data.isMultiActive || false);
    });

    // 상태 업데이트 함수
    function updateStatus(isActive) {
        if (isActive) {
            statusDiv.textContent = '현재 상태: 활성화';
            statusDiv.className = 'status active';
        } else {
            statusDiv.textContent = '현재 상태: 비활성화';
            statusDiv.className = 'status inactive';
        }
    }

    // 위치 기록 버튼 클릭 이벤트
    recordPositionBtn.addEventListener('click', function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'recordPosition'});
            window.close(); // 팝업 닫기
        });
    });

    // 시작 버튼 클릭 이벤트 (단일 위치)
    startBtn.addEventListener('click', function() {
        const interval = parseInt(intervalInput.value) || 1000;
        const clickType = clickTypeSelect.value;

        chrome.storage.local.get(['position'], function(data) {
            if (!data.position) {
                alert('먼저 클릭할 위치를 기록해주세요.');
                return;
            }

            // 설정 저장
            chrome.storage.local.set({
                interval: interval,
                clickType: clickType,
                isActive: true
            });

            // content script에 클릭 시작 명령 전달
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'startClicking',
                    position: data.position,
                    interval: interval,
                    clickType: clickType
                });
            });

            updateStatus(true);
        });
    });

    // 중지 버튼 클릭 이벤트 (단일 위치)
    stopBtn.addEventListener('click', function() {
        chrome.storage.local.set({isActive: false});

        // content script에 클릭 중지 명령 전달
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'stopClicking'});
        });

        updateStatus(false);
    });

    // 위치 추가 버튼 클릭 이벤트
    addPositionBtn.addEventListener('click', function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'addPosition'});
            window.close(); // 팝업 닫기
        });
    });

    // 모든 위치 삭제 버튼 클릭 이벤트
    clearPositionsBtn.addEventListener('click', function() {
        chrome.storage.local.set({multiPositions: []});
        updatePositionsList([]);
    });

    // 순차 클릭 시작 버튼 클릭 이벤트
    startMultiBtn.addEventListener('click', function() {
        const interval = parseInt(multiIntervalInput.value) || 1000;
        const clickType = multiClickTypeSelect.value;

        chrome.storage.local.get(['multiPositions'], function(data) {
            if (!data.multiPositions || data.multiPositions.length === 0) {
                alert('먼저 클릭할 위치를 추가해주세요.');
                return;
            }

            // 설정 저장
            chrome.storage.local.set({
                multiInterval: interval,
                multiClickType: clickType,
                isMultiActive: true
            });

            // content script에 클릭 시작 명령 전달
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'startMultiClicking',
                    positions: data.multiPositions,
                    interval: interval,
                    clickType: clickType
                });
            });

            updateStatus(true);
        });
    });

    // 순차 클릭 중지 버튼 클릭 이벤트
    stopMultiBtn.addEventListener('click', function() {
        chrome.storage.local.set({isMultiActive: false});

        // content script에 클릭 중지 명령 전달
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'stopClicking'});
        });

        updateStatus(false);
    });

    // 다중 위치 목록 업데이트 함수
    function updatePositionsList(positions) {
        positionsList.innerHTML = '';

        if (positions.length === 0) {
            const item = document.createElement('div');
            item.className = 'position-item';
            item.textContent = '기록된 위치가 없습니다.';
            positionsList.appendChild(item);
            return;
        }

        positions.forEach((position, index) => {
            const item = document.createElement('div');
            item.className = 'position-item';

            const posText = document.createElement('span');
            posText.textContent = `${index + 1}. X: ${position.x}, Y: ${position.y}`;

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'stop';
            deleteBtn.textContent = '삭제';
            deleteBtn.addEventListener('click', function() {
                chrome.storage.local.get(['multiPositions'], function(data) {
                    const newPositions = [...data.multiPositions];
                    newPositions.splice(index, 1);
                    chrome.storage.local.set({multiPositions: newPositions});
                    updatePositionsList(newPositions);
                });
            });

            item.appendChild(posText);
            item.appendChild(deleteBtn);
            positionsList.appendChild(item);
        });
    }

    // 메시지 리스너 등록
    chrome.runtime.onMessage.addListener(function(message) {
        if (message.action === 'positionRecorded') {
            currentPositionSpan.textContent = `X: ${message.position.x}, Y: ${message.position.y}`;
        } else if (message.action === 'positionAdded') {
            chrome.storage.local.get(['multiPositions'], function(data) {
                const positions = data.multiPositions || [];
                positions.push(message.position);
                chrome.storage.local.set({multiPositions: positions});
                updatePositionsList(positions);
            });
        }
    });
});