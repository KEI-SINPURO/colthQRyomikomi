// DOM要素の取得
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const result = document.getElementById('result');
const errorOverlay = document.getElementById('errorOverlay');
const errorMessage = document.getElementById('errorMessage');
const retryBtn = document.getElementById('retryBtn');
const loadingOverlay = document.getElementById('loadingOverlay');

let scanning = false;
let lastScanTime = 0;
const SCAN_COOLDOWN = 3000; // 3秒のクールダウン

// カメラの起動
async function startCamera() {
    try {
        status.textContent = 'カメラを起動しています...';
        
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment', // 背面カメラを優先
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        
        video.srcObject = stream;
        video.setAttribute('playsinline', true);
        
        video.addEventListener('loadedmetadata', () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            loadingOverlay.classList.add('hidden');
            status.textContent = 'QRコードをスキャン中...';
            scanning = true;
            requestAnimationFrame(scanQRCode);
        });
        
    } catch (err) {
        console.error('カメラエラー:', err);
        handleCameraError(err);
    }
}

// カメラエラーの処理
function handleCameraError(err) {
    loadingOverlay.classList.add('hidden');
    
    let message = 'カメラへのアクセスが許可されていません。';
    
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'カメラの使用を許可してください。ブラウザの設定から許可できます。';
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'カメラが見つかりませんでした。デバイスにカメラが接続されているか確認してください。';
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        message = 'カメラが他のアプリケーションで使用中の可能性があります。';
    }
    
    errorMessage.textContent = message;
    errorOverlay.classList.remove('hidden');
}

// QRコードのスキャン
function scanQRCode() {
    if (!scanning) return;
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
        });
        
        if (code) {
            handleQRCode(code.data);
        }
    }
    
    requestAnimationFrame(scanQRCode);
}

// QRコードの処理
function handleQRCode(data) {
    const now = Date.now();
    
    // クールダウン中は処理しない
    if (now - lastScanTime < SCAN_COOLDOWN) {
        return;
    }
    
    lastScanTime = now;
    
    console.log('QRコード検出:', data);
    
    // 成功時の視覚フィードバック
    result.textContent = '✓ QRコードを検出しました！';
    result.classList.add('active', 'success');
    status.textContent = '音声ガイドを起動しています...';
    
    // バイブレーション（対応デバイスのみ）
    if (navigator.vibrate) {
        navigator.vibrate(200);
    }
    
    // 音声再生ページへ遷移（自動再生パラメータ付き）
    setTimeout(() => {
        // URLの場合はそのまま遷移
        if (data.startsWith('http://') || data.startsWith('https://')) {
            // 自動再生パラメータを追加
            const url = new URL(data);
            url.searchParams.set('autoplay', 'true');
            window.location.href = url.toString();
        } 
        // 相対パスの場合
        else {
            window.location.href = data + '?autoplay=true';
        }
    }, 1000);
}

// 再試行ボタンのイベント
retryBtn.addEventListener('click', () => {
    errorOverlay.classList.add('hidden');
    loadingOverlay.classList.remove('hidden');
    startCamera();
});

// ページ読み込み時にカメラを起動
window.addEventListener('load', () => {
    // jsQRライブラリの読み込みを確認
    if (typeof jsQR === 'undefined') {
        errorMessage.textContent = 'QRコードスキャナーの初期化に失敗しました。ページを再読み込みしてください。';
        errorOverlay.classList.remove('hidden');
        loadingOverlay.classList.add('hidden');
        return;
    }
    
    startCamera();
});

// ページを離れる時にカメラを停止
window.addEventListener('beforeunload', () => {
    scanning = false;
    if (video.srcObject) {
        const tracks = video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
    }
});

// iOS Safariでの自動再生対策
// ユーザーのタップを検出して音声コンテキストを初期化
let userInteracted = false;
document.addEventListener('touchstart', () => {
    userInteracted = true;
}, { once: true });

// エラーハンドリング
window.addEventListener('error', (e) => {
    console.error('グローバルエラー:', e);
});

// デバッグ用：QRコード読み取りのテスト
// コンソールで testQR('your-url') を実行してテスト可能
window.testQR = function(url) {
    handleQRCode(url);
};
