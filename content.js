let clickInterval = null;
let isSelectingPosition = false;
let highlightElement = null;
let currentPositionIndex = 0;
let positions = [];

// 메시지 수신 리스너
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'startClicking') {
        startClicking(message.position, message.interval, message.clickType);
    } else if (message.action === 'startMultiClicking') {
        startMultiClicking(message.positions, message.interval, message.clickType);
    } else if (message.action === 'stopClicking') {
        stopClicking();
    } else if (message.action === 'recordPosition') {
        startPositionRecording('single');
    } else if (message.action === 'addPosition') {
        startPositionRecording('multi');
    }
});

// 확장 프로그램 로드 시 활성 상태 확인
chrome.storage.local.get([
    'position', 'interval', 'clickType', 'isActive',
    'multiPositions', 'multiInterval', 'multiClickType', 'isMultiActive'
], function(data) {
    if (data.isActive && data.position) {
        startClicking(data.position, data.interval || 1000, data.clickType || 'click');
    } else if (data.isMultiActive && data.multiPositions && data.multiPositions.length > 0) {
        startMultiClicking(data.multiPositions, data.multiInterval || 1000, data.multiClickType || 'click');
    }
});

// 단일 위치 클릭 시작 함수
function startClicking(position, interval, clickType) {
    // 기존 클릭 중지
    stopClicking();

    // 새로운 클릭 시작
    clickInterval = setInterval(function() {
        simulateClick(position.x, position.y, clickType);
    }, interval);
}

// 다중 위치 순차 클릭 시작 함수
function startMultiClicking(positionsList, interval, clickType) {
    // 기존 클릭 중지
    stopClicking();

    // 위치 목록 저장
    positions = positionsList;
    currentPositionIndex = 0;

    // 새로운 순차 클릭 시작
    clickInterval = setInterval(function() {
        if (positions.length === 0) return;

        // 현재 위치에서 클릭 수행
        const position = positions[currentPositionIndex];
        simulateClick(position.x, position.y, clickType);

        // 다음 위치로 이동
        currentPositionIndex = (currentPositionIndex + 1) % positions.length;
    }, interval);
}

// 클릭 중지 함수
function stopClicking() {
    if (clickInterval) {
        clearInterval(clickInterval);
        clickInterval = null;
    }
}

// 클릭 시뮬레이션 함수
function simulateClick(x, y, clickType) {
    const element = document.elementFromPoint(x, y);
    if (!element) return;

    // 클릭 이벤트 생성
    const eventOptions = {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y
    };

    // 이벤트 발생
    element.focus();

    // 마우스 이벤트 순서 (mousedown -> mouseup -> click)
    element.dispatchEvent(new MouseEvent('mousedown', eventOptions));
    element.dispatchEvent(new MouseEvent('mouseup', eventOptions));

    if (clickType === 'dblclick') {
        element.dispatchEvent(new MouseEvent('click', eventOptions));
        element.dispatchEvent(new MouseEvent('click', eventOptions));
        element.dispatchEvent(new MouseEvent('dblclick', eventOptions));
    } else {
        element.dispatchEvent(new MouseEvent('click', eventOptions));
    }
}

// 위치 기록 시작 함수
function startPositionRecording(mode) {
    isSelectingPosition = true;

    // 이전 하이라이트 요소 제거
    if (highlightElement) {
        document.body.removeChild(highlightElement);
    }

    // 하이라이트 요소 생성
    highlightElement = document.createElement('div');
    highlightElement.style.position = 'absolute';
    highlightElement.style.width = '20px';
    highlightElement.style.height = '20px';
    highlightElement.style.borderRadius = '50%';
    highlightElement.style.backgroundColor = 'rgba(66, 133, 244, 0.5)';
    highlightElement.style.border = '2px solid #4285f4';
    highlightElement.style.transform = 'translate(-50%, -50%)';
    highlightElement.style.pointerEvents = 'none';
    highlightElement.style.zIndex = '10000';
    document.body.appendChild(highlightElement);

    // 마우스 이동 이벤트
    document.addEventListener('mousemove', handleMouseMove);

    // 클릭 이벤트
    document.addEventListener('click', function handlePositionSelection(e) {
        if (!isSelectingPosition) return;

        e.preventDefault();
        e.stopPropagation();

        const position = {
            x: e.clientX,
            y: e.clientY
        };

        // 모드에 따라 위치 저장
        if (mode === 'single') {
            // 단일 위치 모드
            chrome.storage.local.set({position: position});

            // 팝업에 위치 기록 완료 메시지 전송
            chrome.runtime.sendMessage({
                action: 'positionRecorded',
                position: position
            });
        } else {
            // 다중 위치 모드
            chrome.storage.local.get(['multiPositions'], function(data) {
                const positions = data.multiPositions || [];
                positions.push(position);
                chrome.storage.local.set({multiPositions: positions});

                // 팝업에 위치 추가 완료 메시지 전송
                chrome.runtime.sendMessage({
                    action: 'positionAdded',
                    position: position
                });
            });
        }

        // 위치 선택 모드 종료
        isSelectingPosition = false;
        document.body.style.cursor = 'default';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('click', handlePositionSelection);

        if (highlightElement) {
            document.body.removeChild(highlightElement);
            highlightElement = null;
        }
    });

    // 커서 스타일 변경
    document.body.style.cursor = 'crosshair';
}

// 마우스 이동 핸들러
function handleMouseMove(e) {
    if (!isSelectingPosition || !highlightElement) return;

    highlightElement.style.left = e.clientX + 'px';
    highlightElement.style.top = e.clientY + 'px';
}// 자동 클릭 크롬 확장 프로그램을 만들기 위한 파일들

