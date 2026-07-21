const scoreForm = document.querySelector("#scoreForm");
const queryButton = document.querySelector("#queryButton");
const accessCodeInput = document.querySelector("#accessCodeInput");
const scanButton = document.querySelector("#scanButton");
const cmdTypeInput = document.querySelector("#cmdTypeInput");
const languageSelect = document.querySelector("#languageSelect");
const statusText = document.querySelector("#statusText");
const scoreDialog = document.querySelector("#scoreDialog");
const scoreResult = document.querySelector("#scoreResult");
const scoreImage = document.querySelector("#scoreImage");
const closeDialogButton = document.querySelector("#closeDialogButton");
const downloadScoreButton = document.querySelector("#downloadScoreButton");
const scannerDialog = document.querySelector("#scannerDialog");
const closeScannerButton = document.querySelector("#closeScannerButton");
const captureScannerButton = document.querySelector("#captureScannerButton");
const scannerVideo = document.querySelector("#scannerVideo");
const scannerFreezeCanvas = document.querySelector("#scannerFreezeCanvas");
const scannerStatus = document.querySelector("#scannerStatus");
let availabilityTimer = null;
let scoreImageUrl = "";
let isBusy = false;
let isScanning = false;
let currentLanguage = "zh-Hans";
let resetViewportTimer = null;
let dialogCloseTimer = null;
let scannerCloseTimer = null;
let openCvPromise = null;
let tesseractPromise = null;
let ocrWorker = null;
let scannerStream = null;
let scannerCameraRequestId = 0;
const availabilityCacheKey = "maiscore-availability-cache";
const availabilityCacheTtlMs = 60 * 1000;
const codeCrops = [
  { x: 42, y: 77.7, width: 56.5, height: 10.4 },
  { x: 43, y: 82, width: 54.5, height: 9 },
];
const accessNumberCrop = { x: 1, y: 0, width: 98, height: 74 };
const canonicalCardWidth = 1280;
const canonicalCardHeight = 808;

const messages = {
  "zh-Hans": {
    navNote: "日服 maimai 成绩图",
    introLine1: "输入 Aime 卡号，",
    introLine2: "生成日服成绩图。",
    accessLabel: "Aime access code",
    queryButton: "查询",
    scannerCapture: "识别",
    scannerReady: "将 ACCESS CODE 对准黄色框。",
    scannerCameraStarting: "正在启动摄像头...",
    scannerCameraFailed: "无法访问摄像头，请检查浏览器权限。",
    scannerLoading: "加载识别内核...",
    scannerDetecting: "检测卡片和 ACCESS CODE...",
    scannerReading: "读取数字...",
    scannerSuccess: "已识别并填入。",
    scannerNoCode: "没有可靠识别到 20 位卡号，请换一张更清晰的照片。",
    scannerFailed: "识别失败，请重新对准后重试。",
    scoreTypeLabel: "成绩类型",
    waiting: "等待输入卡号。",
    queueCountdown: (seconds) => `等待 ${seconds}s。`,
    checking: "检查中...",
    checkFailed: "无法检查当前排队状态。",
    ready: "现在可以查询。",
    noSlot: "暂无空位。",
    unavailable: "可直接查询。",
    invalidCode: "卡号需要是 20 位数字。",
    invalidAimeCode: "卡号不正确。",
    unusedAime: "这张 Aime 还未使用，先在支持的游戏中游玩一次后再试。",
    working: "生成中...",
    queryFailed: "查询失败。",
    existingSlot: () => "已生成。",
    clearedExpired: () => "已替换过期卡槽。",
    generated: "已生成。",
    closeDialog: "关闭",
    downloadScore: "下载",
    footerPurpose: "本项目仅面向没有 SEGA ID 的赴日游客临时查分使用。",
    footerCopyright: "© 2026 maiscore. SEGA、Aime、maimai 为各自权利方商标；本项目与 SEGA 无关联。",
  },
  en: {
    navNote: "JP maimai score image",
    introLine1: "Enter your Aime code,",
    introLine2: "get a JP score card.",
    accessLabel: "Aime access code",
    queryButton: "Get score",
    scannerCapture: "Scan",
    scannerReady: "Place ACCESS CODE inside the yellow frame.",
    scannerCameraStarting: "Starting camera...",
    scannerCameraFailed: "Could not access the camera. Check browser permission.",
    scannerLoading: "Loading scanner...",
    scannerDetecting: "Detecting card and ACCESS CODE...",
    scannerReading: "Reading digits...",
    scannerSuccess: "Code filled.",
    scannerNoCode: "Could not read a reliable 20-digit code. Try a clearer photo.",
    scannerFailed: "Scan failed. Align the card and try again.",
    scoreTypeLabel: "Score type",
    waiting: "Waiting for an Aime code.",
    queueCountdown: (seconds) => `Wait ${seconds}s.`,
    checking: "Checking...",
    checkFailed: "Could not check queue status.",
    ready: "Ready to query.",
    noSlot: "No slot available.",
    unavailable: "Ready.",
    invalidCode: "The card code must be 20 digits.",
    invalidAimeCode: "The Aime code is incorrect.",
    unusedAime: "This Aime has not been used yet. Play a supported game once, then try again.",
    working: "Generating...",
    queryFailed: "Query failed.",
    existingSlot: () => "Done.",
    clearedExpired: () => "Replaced an expired slot.",
    generated: "Done.",
    closeDialog: "Close",
    downloadScore: "Download",
    footerPurpose: "For Japan visitors without a SEGA ID who need temporary score lookup.",
    footerCopyright: "© 2026 maiscore. SEGA, Aime, and maimai are trademarks of their respective owners. This project is not affiliated with SEGA.",
  },
  "zh-Hant": {
    navNote: "日服 maimai 成績圖",
    introLine1: "輸入 Aime 卡號，",
    introLine2: "生成日服成績圖。",
    accessLabel: "Aime access code",
    queryButton: "查詢",
    scannerCapture: "識別",
    scannerReady: "將 ACCESS CODE 對準黃色框。",
    scannerCameraStarting: "正在啟動攝影機...",
    scannerCameraFailed: "無法存取攝影機，請檢查瀏覽器權限。",
    scannerLoading: "載入識別核心...",
    scannerDetecting: "偵測卡片與 ACCESS CODE...",
    scannerReading: "讀取數字...",
    scannerSuccess: "已識別並填入。",
    scannerNoCode: "沒有可靠識別到 20 位卡號，請換一張更清晰的照片。",
    scannerFailed: "識別失敗，請重新對準後再試。",
    scoreTypeLabel: "成績類型",
    waiting: "等待輸入卡號。",
    queueCountdown: (seconds) => `等待 ${seconds}s。`,
    checking: "檢查中...",
    checkFailed: "無法檢查目前排隊狀態。",
    ready: "現在可以查詢。",
    noSlot: "暫無空位。",
    unavailable: "可直接查詢。",
    invalidCode: "卡號需要是 20 位數字。",
    invalidAimeCode: "卡號不正確。",
    unusedAime: "這張 Aime 尚未使用，請先在支援的遊戲中遊玩一次後再試。",
    working: "生成中...",
    queryFailed: "查詢失敗。",
    existingSlot: () => "已生成。",
    clearedExpired: () => "已替換過期卡槽。",
    generated: "已生成。",
    closeDialog: "關閉",
    downloadScore: "下載",
    footerPurpose: "本專案僅面向沒有 SEGA ID 的赴日旅客臨時查分使用。",
    footerCopyright: "© 2026 maiscore. SEGA、Aime、maimai 為各自權利方商標；本專案與 SEGA 無關聯。",
  },
  ko: {
    navNote: "일본 서버 maimai 스코어 이미지",
    introLine1: "Aime 카드 번호를 입력하고,",
    introLine2: "일본 서버 성과 이미지를 생성하세요.",
    accessLabel: "Aime access code",
    queryButton: "조회",
    scannerCapture: "스캔",
    scannerReady: "ACCESS CODE를 노란 프레임에 맞춰 주세요.",
    scannerCameraStarting: "카메라 시작 중...",
    scannerCameraFailed: "카메라에 접근할 수 없습니다. 브라우저 권한을 확인해 주세요.",
    scannerLoading: "스캐너 로딩 중...",
    scannerDetecting: "카드와 ACCESS CODE 감지 중...",
    scannerReading: "숫자 읽는 중...",
    scannerSuccess: "번호가 입력되었습니다.",
    scannerNoCode: "신뢰할 수 있는 20자리 번호를 읽지 못했습니다. 더 선명한 사진을 사용해 주세요.",
    scannerFailed: "스캔 실패. 카드를 다시 맞춘 뒤 재시도해 주세요.",
    scoreTypeLabel: "성과 유형",
    waiting: "카드 번호 입력을 기다리는 중입니다.",
    queueCountdown: (seconds) => `${seconds}초 대기.`,
    checking: "확인 중...",
    checkFailed: "대기 상태를 확인할 수 없습니다.",
    ready: "지금 조회할 수 있습니다.",
    noSlot: "빈 슬롯 없음.",
    unavailable: "바로 조회 가능.",
    invalidCode: "카드 번호는 숫자 20자리여야 합니다.",
    invalidAimeCode: "Aime 카드 번호가 올바르지 않습니다.",
    unusedAime: "이 Aime는 아직 사용되지 않았습니다. 지원 게임을 한 번 플레이한 뒤 다시 시도하세요.",
    working: "생성 중...",
    queryFailed: "조회에 실패했습니다.",
    existingSlot: () => "완료.",
    clearedExpired: () => "만료된 슬롯을 교체했습니다.",
    generated: "완료.",
    closeDialog: "닫기",
    downloadScore: "다운로드",
    footerPurpose: "SEGA ID가 없는 일본 방문객의 임시 성과 조회를 위한 프로젝트입니다.",
    footerCopyright: "© 2026 maiscore. SEGA, Aime, maimai는 각 권리자의 상표이며, 본 프로젝트는 SEGA와 관련이 없습니다.",
  },
};

function t(key, ...args) {
  const value = messages[currentLanguage]?.[key] || messages["zh-Hans"][key] || key;
  return typeof value === "function" ? value(...args) : value;
}

function setStatus(message) {
  statusText.textContent = message;
}

function setStatusKey(key, ...args) {
  statusText.dataset.statusKey = key;
  statusText.dataset.statusArgs = JSON.stringify(args);
  setStatus(t(key, ...args));
}

function setScannerStatusKey(key, ...args) {
  scannerStatus.dataset.scannerStatusKey = key;
  scannerStatus.dataset.scannerStatusArgs = JSON.stringify(args);
  scannerStatus.textContent = t(key, ...args);
}

function applyLanguage(language) {
  currentLanguage = messages[language] ? language : "zh-Hans";
  document.documentElement.lang = currentLanguage;
  languageSelect.value = currentLanguage;

  for (const element of document.querySelectorAll("[data-i18n]")) {
    element.textContent = t(element.dataset.i18n);
  }

  closeDialogButton.setAttribute("aria-label", t("closeDialog"));
  downloadScoreButton.setAttribute("aria-label", t("downloadScore"));
  closeScannerButton.setAttribute("aria-label", t("closeDialog"));
  scanButton.setAttribute("aria-label", t("scannerCapture"));

  if (statusText.dataset.statusKey) {
    const args = JSON.parse(statusText.dataset.statusArgs || "[]");
    setStatus(t(statusText.dataset.statusKey, ...args));
  }

  if (scannerStatus.dataset.scannerStatusKey) {
    const args = JSON.parse(scannerStatus.dataset.scannerStatusArgs || "[]");
    scannerStatus.textContent = t(scannerStatus.dataset.scannerStatusKey, ...args);
  }
}

function preferredLanguage() {
  const saved = localStorage.getItem("maiscore-language");

  if (messages[saved]) {
    return saved;
  }

  const language = navigator.language || "";

  if (language.startsWith("ko")) return "ko";
  if (language.toLowerCase().includes("hant") || ["zh-tw", "zh-hk", "zh-mo"].includes(language.toLowerCase())) {
    return "zh-Hant";
  }
  if (language.startsWith("en")) return "en";
  return "zh-Hans";
}

function setScoreImage(blob) {
  if (scoreImageUrl) {
    URL.revokeObjectURL(scoreImageUrl);
  }

  scoreImageUrl = URL.createObjectURL(blob);
  scoreImage.src = scoreImageUrl;
  downloadScoreButton.href = scoreImageUrl;
  downloadScoreButton.download = `maiscore-${Date.now()}.png`;

  if (!scoreDialog.open) {
    scoreDialog.showModal();
    scoreDialog.focus({ preventScroll: true });
  }
}

function clearScoreImage() {
  if (scoreImageUrl) {
    URL.revokeObjectURL(scoreImageUrl);
  }

  scoreImageUrl = "";
  scoreImage.removeAttribute("src");
  downloadScoreButton.removeAttribute("href");

  closeScoreDialog({ immediate: true });
}

function clearAvailabilityTimer() {
  if (availabilityTimer) {
    clearInterval(availabilityTimer);
  }

  availabilityTimer = null;
}

function normalizeAccessCode(value) {
  return value.replace(/\D/g, "");
}

function formatAccessCode(value) {
  return normalizeAccessCode(value)
    .slice(0, 20)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function orderPoints(points) {
  const bySum = [...points].sort((a, b) => a.x + a.y - (b.x + b.y));
  const byDiff = [...points].sort((a, b) => a.y - a.x - (b.y - b.x));
  return [bySum[0], byDiff[0], bySum[bySum.length - 1], byDiff[byDiff.length - 1]];
}

function rotateCanvas(source, degrees) {
  const swapsSides = degrees === 90 || degrees === 270;
  const canvas = document.createElement("canvas");
  canvas.width = swapsSides ? source.height : source.width;
  canvas.height = swapsSides ? source.width : source.height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas unavailable");
  }

  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((degrees * Math.PI) / 180);
  context.drawImage(source, -source.width / 2, -source.height / 2);
  return canvas;
}

function cloneCanvas(source) {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  canvas.getContext("2d")?.drawImage(source, 0, 0);
  return canvas;
}

function loadScript(src, marker) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-loader="${marker}"]`);

    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.loader = marker;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`${marker} load failed`));
    document.head.appendChild(script);
  });
}

async function loadOpenCv() {
  if (openCvPromise) return openCvPromise;

  openCvPromise = new Promise((resolve, reject) => {
    const finish = async () => {
      try {
        const candidate = await Promise.resolve(window.cv);

        if (!candidate) {
          throw new Error("OpenCV unavailable");
        }

        if (candidate.Mat) {
          resolve(candidate);
          return;
        }

        candidate.onRuntimeInitialized = () => resolve(candidate);
      } catch (error) {
        reject(error);
      }
    };

    if (window.cv) {
      finish();
      return;
    }

    loadScript(
      "https://cdn.jsdelivr.net/npm/@techstark/opencv-js@5.0.0-release.1/dist/opencv.js",
      "opencv",
    )
      .then(finish)
      .catch(reject);
  });

  return openCvPromise;
}

async function loadTesseract() {
  if (tesseractPromise) return tesseractPromise;

  tesseractPromise = loadScript(
    "https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js",
    "tesseract",
  ).then(() => {
    if (!window.Tesseract) {
      throw new Error("Tesseract unavailable");
    }

    return window.Tesseract;
  });

  return tesseractPromise;
}

function warpCard(sourceCanvas, cv, points) {
  const ordered = orderPoints(points);
  const topWidth = distance(ordered[0], ordered[1]);
  const bottomWidth = distance(ordered[3], ordered[2]);
  const leftHeight = distance(ordered[0], ordered[3]);
  const rightHeight = distance(ordered[1], ordered[2]);
  const measuredWidth = Math.max(topWidth, bottomWidth);
  const measuredHeight = Math.max(leftHeight, rightHeight);
  const portrait = measuredHeight > measuredWidth;
  const outputWidth = portrait ? canonicalCardHeight : canonicalCardWidth;
  const outputHeight = portrait ? canonicalCardWidth : canonicalCardHeight;
  const source = cv.imread(sourceCanvas);
  const destination = new cv.Mat();
  const opaqueDestination = new cv.Mat();
  const sourcePoints = cv.matFromArray(4, 1, cv.CV_32FC2, ordered.flatMap((point) => [point.x, point.y]));
  const destinationPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0,
    0,
    outputWidth - 1,
    0,
    outputWidth - 1,
    outputHeight - 1,
    0,
    outputHeight - 1,
  ]);
  const transform = cv.getPerspectiveTransform(sourcePoints, destinationPoints);

  cv.warpPerspective(
    source,
    destination,
    transform,
    new cv.Size(outputWidth, outputHeight),
    cv.INTER_LINEAR,
    cv.BORDER_REPLICATE,
  );
  cv.cvtColor(destination, opaqueDestination, cv.COLOR_RGBA2RGB);

  const canvas = document.createElement("canvas");
  cv.imshow(canvas, opaqueDestination);
  source.delete();
  destination.delete();
  opaqueDestination.delete();
  sourcePoints.delete();
  destinationPoints.delete();
  transform.delete();

  return portrait ? rotateCanvas(canvas, 90) : canvas;
}

function normalizeCardSize(source) {
  const landscape = source.width >= source.height ? source : rotateCanvas(source, 90);
  const canvas = document.createElement("canvas");
  canvas.width = canonicalCardWidth;
  canvas.height = canonicalCardHeight;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas unavailable");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(landscape, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function warpWideRegion(sourceCanvas, cv, points) {
  let ordered = orderPoints(points);
  let measuredWidth = Math.max(distance(ordered[0], ordered[1]), distance(ordered[3], ordered[2]));
  let measuredHeight = Math.max(distance(ordered[0], ordered[3]), distance(ordered[1], ordered[2]));

  if (measuredHeight > measuredWidth) {
    ordered = [ordered[3], ordered[0], ordered[1], ordered[2]];
    [measuredWidth, measuredHeight] = [measuredHeight, measuredWidth];
  }

  const outputWidth = clamp(Math.round(measuredWidth), 1000, 1600);
  const outputHeight = Math.max(100, Math.round((outputWidth * measuredHeight) / measuredWidth));
  const source = cv.imread(sourceCanvas);
  const destination = new cv.Mat();
  const opaqueDestination = new cv.Mat();
  const sourcePoints = cv.matFromArray(4, 1, cv.CV_32FC2, ordered.flatMap((point) => [point.x, point.y]));
  const destinationPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0,
    0,
    outputWidth - 1,
    0,
    outputWidth - 1,
    outputHeight - 1,
    0,
    outputHeight - 1,
  ]);
  const transform = cv.getPerspectiveTransform(sourcePoints, destinationPoints);

  cv.warpPerspective(
    source,
    destination,
    transform,
    new cv.Size(outputWidth, outputHeight),
    cv.INTER_LINEAR,
    cv.BORDER_REPLICATE,
  );
  cv.cvtColor(destination, opaqueDestination, cv.COLOR_RGBA2RGB);

  const canvas = document.createElement("canvas");
  cv.imshow(canvas, opaqueDestination);
  source.delete();
  destination.delete();
  opaqueDestination.delete();
  sourcePoints.delete();
  destinationPoints.delete();
  transform.delete();
  return canvas;
}

function scoreAccessCodeBoxes(warped, cv) {
  const grey = new cv.Mat();
  const binary = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  const boxes = [];

  try {
    cv.cvtColor(warped, grey, cv.COLOR_RGBA2GRAY);
    cv.adaptiveThreshold(grey, binary, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 31, 4);
    cv.findContours(binary, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    for (let index = 0; index < contours.size(); index += 1) {
      const contour = contours.get(index);
      const rect = cv.boundingRect(contour);
      const area = Math.abs(cv.contourArea(contour));
      const widthRatio = rect.width / warped.cols;
      const heightRatio = rect.height / warped.rows;
      const aspect = rect.width / Math.max(1, rect.height);
      const fill = area / Math.max(1, rect.width * rect.height);

      if (
        widthRatio >= 0.018 &&
        widthRatio <= 0.075 &&
        heightRatio >= 0.12 &&
        heightRatio <= 0.48 &&
        aspect >= 0.42 &&
        aspect <= 1.3 &&
        fill >= 0.45
      ) {
        boxes.push({
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2,
          width: rect.width,
        });
      }

      contour.delete();
    }

    let bestAligned = 0;
    let bestScore = 0;

    for (const seed of boxes) {
      const row = boxes.filter((box) => Math.abs(box.y - seed.y) < warped.rows * 0.11).sort((a, b) => a.x - b.x);
      const widths = row.map((box) => box.width).sort((a, b) => a - b);
      const medianWidth = widths[Math.floor(widths.length / 2)] || 1;
      const consistent = row.filter((box) => box.width > medianWidth * 0.55 && box.width < medianWidth * 1.65);
      const unique = [];

      for (const box of consistent) {
        const previous = unique[unique.length - 1];
        if (!previous || Math.abs(box.x - previous.x) > medianWidth * 0.65) {
          unique.push(box);
        }
      }

      const gaps = unique.slice(1).map((box, index) => box.x - unique[index].x);
      const sortedGaps = [...gaps].sort((a, b) => a - b);
      const medianGap = sortedGaps[Math.floor(sortedGaps.length / 2)] || 1;
      const regularGaps = gaps.filter((gap) => gap > medianGap * 0.55 && gap < medianGap * 1.45).length;
      const aligned = unique.length;
      const countScore = Math.max(0, 10 - Math.abs(10 - aligned)) * 5;
      const spacingScore = gaps.length ? (regularGaps / gaps.length) * 20 : 0;
      const score = countScore + spacingScore;

      if (score > bestScore) {
        bestScore = score;
        bestAligned = aligned;
      }
    }

    return { aligned: bestAligned, score: bestScore };
  } finally {
    grey.delete();
    binary.delete();
    contours.delete();
    hierarchy.delete();
  }
}

function detectAccessCodeRegion(sourceCanvas, cv) {
  const longestSide = Math.max(sourceCanvas.width, sourceCanvas.height);
  const detectionScale = Math.min(1, 1600 / longestSide);
  const detectionCanvas = document.createElement("canvas");
  detectionCanvas.width = Math.round(sourceCanvas.width * detectionScale);
  detectionCanvas.height = Math.round(sourceCanvas.height * detectionScale);
  detectionCanvas.getContext("2d")?.drawImage(sourceCanvas, 0, 0, detectionCanvas.width, detectionCanvas.height);

  const source = cv.imread(detectionCanvas);
  const grey = new cv.Mat();
  const blurred = new cv.Mat();
  const edges = new cv.Mat();
  const closed = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
  const candidates = [];

  try {
    cv.cvtColor(source, grey, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(grey, blurred, new cv.Size(3, 3), 0);
    cv.Canny(blurred, edges, 30, 110);
    cv.morphologyEx(edges, closed, cv.MORPH_CLOSE, kernel);
    cv.findContours(closed, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    const imageArea = detectionCanvas.width * detectionCanvas.height;

    for (let index = 0; index < contours.size(); index += 1) {
      const contour = contours.get(index);
      const area = Math.abs(cv.contourArea(contour));
      const areaRatio = area / imageArea;

      if (areaRatio < 0.0015 || areaRatio > 0.12) {
        contour.delete();
        continue;
      }

      const perimeter = cv.arcLength(contour, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(contour, approx, perimeter * 0.02, true);

      if (approx.rows === 4 && cv.isContourConvex(approx)) {
        const points = Array.from({ length: 4 }, (_, pointIndex) => ({
          x: approx.data32S[pointIndex * 2],
          y: approx.data32S[pointIndex * 2 + 1],
        }));
        const ordered = orderPoints(points);
        const width = Math.max(distance(ordered[0], ordered[1]), distance(ordered[3], ordered[2]));
        const height = Math.max(distance(ordered[0], ordered[3]), distance(ordered[1], ordered[2]));
        const ratio = Math.max(width, height) / Math.max(1, Math.min(width, height));

        if (ratio >= 3.4 && ratio <= 8) {
          const warpedCanvas = warpWideRegion(detectionCanvas, cv, points);
          const warped = cv.imread(warpedCanvas);
          const structure = scoreAccessCodeBoxes(warped, cv);
          warped.delete();

          if (structure.aligned >= 8 && structure.aligned <= 12 && structure.score >= 55) {
            candidates.push({
              points: points.map((point) => ({
                x: point.x / detectionScale,
                y: point.y / detectionScale,
              })),
              area,
              ...structure,
            });
          }
        }
      }

      approx.delete();
      contour.delete();
    }
  } finally {
    source.delete();
    grey.delete();
    blurred.delete();
    edges.delete();
    closed.delete();
    contours.delete();
    hierarchy.delete();
    kernel.delete();
  }

  if (!candidates.length) return null;

  const highestScore = Math.max(...candidates.map((candidate) => candidate.score));
  const best = candidates
    .filter((candidate) => candidate.score >= highestScore - 8)
    .sort((a, b) => b.area - a.area)[0];

  return {
    canvas: warpWideRegion(sourceCanvas, cv, best.points),
    alignedBoxes: best.aligned,
  };
}

function detectCard(sourceCanvas, cv) {
  const longestSide = Math.max(sourceCanvas.width, sourceCanvas.height);
  const detectionScale = Math.min(1, 1200 / longestSide);
  const detectionCanvas = document.createElement("canvas");
  detectionCanvas.width = Math.round(sourceCanvas.width * detectionScale);
  detectionCanvas.height = Math.round(sourceCanvas.height * detectionScale);
  detectionCanvas.getContext("2d")?.drawImage(sourceCanvas, 0, 0, detectionCanvas.width, detectionCanvas.height);

  const source = cv.imread(detectionCanvas);
  const grey = new cv.Mat();
  const blurred = new cv.Mat();
  const edges = new cv.Mat();
  const closed = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(7, 7));
  let bestQuad = null;
  let bestQuadArea = 0;
  let fallbackContour = null;
  let fallbackArea = 0;

  try {
    cv.cvtColor(source, grey, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(grey, blurred, new cv.Size(5, 5), 0);
    cv.Canny(blurred, edges, 45, 145);
    cv.morphologyEx(edges, closed, cv.MORPH_CLOSE, kernel);
    cv.findContours(closed, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    const imageArea = detectionCanvas.width * detectionCanvas.height;

    for (let index = 0; index < contours.size(); index += 1) {
      const contour = contours.get(index);
      const area = Math.abs(cv.contourArea(contour));

      if (area < imageArea * 0.1 || area > imageArea * 0.985) {
        contour.delete();
        continue;
      }

      if (area > fallbackArea) {
        fallbackContour?.delete();
        fallbackContour = contour.clone();
        fallbackArea = area;
      }

      const perimeter = cv.arcLength(contour, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(contour, approx, perimeter * 0.025, true);

      if (approx.rows === 4 && cv.isContourConvex(approx) && area > bestQuadArea) {
        const points = [];

        for (let pointIndex = 0; pointIndex < 4; pointIndex += 1) {
          points.push({
            x: approx.data32S[pointIndex * 2] / detectionScale,
            y: approx.data32S[pointIndex * 2 + 1] / detectionScale,
          });
        }

        const ordered = orderPoints(points);
        const width = Math.max(distance(ordered[0], ordered[1]), distance(ordered[3], ordered[2]));
        const height = Math.max(distance(ordered[0], ordered[3]), distance(ordered[1], ordered[2]));
        const ratio = Math.max(width, height) / Math.max(1, Math.min(width, height));

        if (ratio >= 1.25 && ratio <= 1.9) {
          bestQuad = points;
          bestQuadArea = area;
        }
      }

      approx.delete();
      contour.delete();
    }

    if (!bestQuad && fallbackContour && fallbackArea > imageArea * 0.1) {
      const rect = cv.minAreaRect(fallbackContour);
      const rectPoints = cv.RotatedRect.points(rect);
      const ratio = Math.max(rect.size.width, rect.size.height) / Math.max(1, Math.min(rect.size.width, rect.size.height));

      if (ratio >= 1.2 && ratio <= 2) {
        bestQuad = rectPoints.map((point) => ({
          x: point.x / detectionScale,
          y: point.y / detectionScale,
        }));
      }
    }
  } finally {
    fallbackContour?.delete();
    source.delete();
    grey.delete();
    blurred.delete();
    edges.delete();
    closed.delete();
    contours.delete();
    hierarchy.delete();
    kernel.delete();
  }

  if (!bestQuad) return null;
  return { canvas: warpCard(sourceCanvas, cv, bestQuad) };
}

function wholeImageFallback(source) {
  const landscape = source.width >= source.height ? cloneCanvas(source) : rotateCanvas(source, 270);
  const ratio = landscape.width / landscape.height;

  if (ratio <= 2.05) return landscape;

  const canvas = document.createElement("canvas");
  const targetRatio = 1.6;
  canvas.height = landscape.height;
  canvas.width = Math.round(landscape.height * targetRatio);
  const context = canvas.getContext("2d");

  if (!context) return landscape;

  context.drawImage(
    landscape,
    Math.max(0, (landscape.width - canvas.width) / 2),
    0,
    Math.min(canvas.width, landscape.width),
    landscape.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return canvas;
}

function otsuThreshold(histogram, total) {
  let sum = 0;

  for (let i = 0; i < 256; i += 1) {
    sum += i * histogram[i];
  }

  let backgroundWeight = 0;
  let backgroundSum = 0;
  let bestVariance = 0;
  let threshold = 128;

  for (let i = 0; i < 256; i += 1) {
    backgroundWeight += histogram[i];
    if (!backgroundWeight) continue;
    const foregroundWeight = total - backgroundWeight;
    if (!foregroundWeight) break;
    backgroundSum += i * histogram[i];
    const backgroundMean = backgroundSum / backgroundWeight;
    const foregroundMean = (sum - backgroundSum) / foregroundWeight;
    const variance = backgroundWeight * foregroundWeight * (backgroundMean - foregroundMean) ** 2;

    if (variance > bestVariance) {
      bestVariance = variance;
      threshold = i;
    }
  }

  return threshold;
}

function prepareCrop(source, crop, binary) {
  const sx = Math.round((crop.x / 100) * source.width);
  const sy = Math.round((crop.y / 100) * source.height);
  const sw = Math.max(1, Math.round((crop.width / 100) * source.width));
  const sh = Math.max(1, Math.round((crop.height / 100) * source.height));
  const scale = clamp(1500 / sw, 1.5, 4);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("Canvas unavailable");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const histogram = new Uint32Array(256);
  const greys = new Uint8Array(canvas.width * canvas.height);
  let mean = 0;

  for (let pixel = 0, index = 0; pixel < image.data.length; pixel += 4, index += 1) {
    const grey = Math.round(image.data[pixel] * 0.299 + image.data[pixel + 1] * 0.587 + image.data[pixel + 2] * 0.114);
    greys[index] = grey;
    histogram[grey] += 1;
    mean += grey;
  }

  const total = greys.length;
  const invert = mean / total < 128;
  let low = 0;
  let high = 255;
  let seen = 0;

  for (let i = 0; i < 256; i += 1) {
    seen += histogram[i];
    if (seen < total * 0.02) low = i;
    if (seen < total * 0.98) high = i;
  }

  const range = Math.max(24, high - low);
  const normalized = new Uint8Array(total);
  const normalizedHistogram = new Uint32Array(256);

  for (let index = 0; index < total; index += 1) {
    let value = clamp(Math.round(((greys[index] - low) / range) * 255), 0, 255);
    if (invert) value = 255 - value;
    normalized[index] = value;
    normalizedHistogram[value] += 1;
  }

  const threshold = otsuThreshold(normalizedHistogram, total);

  for (let pixel = 0, index = 0; pixel < image.data.length; pixel += 4, index += 1) {
    const value = binary ? (normalized[index] < threshold ? 0 : 255) : normalized[index];
    image.data[pixel] = value;
    image.data[pixel + 1] = value;
    image.data[pixel + 2] = value;
    image.data[pixel + 3] = 255;
  }

  context.putImageData(image, 0, 0);

  const padded = document.createElement("canvas");
  padded.width = canvas.width + 100;
  padded.height = canvas.height + 48;
  const paddedContext = padded.getContext("2d");

  if (!paddedContext) return canvas;

  paddedContext.fillStyle = "#ffffff";
  paddedContext.fillRect(0, 0, padded.width, padded.height);
  paddedContext.drawImage(canvas, 50, 24);
  return padded;
}

function splitIntoCodeGroups(source) {
  const outerPadding = 50;
  const contentWidth = source.width - outerPadding * 2;
  const groupWidth = contentWidth / 5;

  return Array.from({ length: 5 }, (_, index) => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(groupWidth) + 24;
    canvas.height = source.height;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas unavailable");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, outerPadding + index * groupWidth, 0, groupWidth, source.height, 12, 0, groupWidth, source.height);
    return canvas;
  });
}

function scoreCandidate(candidate) {
  if (candidate.digits.length === 20) return -10000 - candidate.confidence;
  return Math.abs(candidate.digits.length - 20) * 100 - candidate.confidence;
}

async function ensureOcrWorker(tesseract) {
  if (ocrWorker) return ocrWorker;

  ocrWorker = await tesseract.createWorker("eng", tesseract.OEM.LSTM_ONLY, {
    workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js",
    corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0",
    langPath: "https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int",
    gzip: true,
  });

  await ocrWorker.setParameters({
    tessedit_pageseg_mode: tesseract.PSM.RAW_LINE,
    tessedit_char_whitelist: "0123456789 ",
    preserve_interword_spaces: "1",
    user_defined_dpi: "300",
  });

  return ocrWorker;
}

async function recognizeAccessCodeFromCanvas(sourceCanvas) {
  setScannerStatusKey("scannerLoading");
  const [cv, tesseract] = await Promise.all([loadOpenCv(), loadTesseract()]);
  const worker = await ensureOcrWorker(tesseract);
  setScannerStatusKey("scannerDetecting");

  const detection = detectCard(sourceCanvas, cv);
  const normalizedCard = normalizeCardSize(detection?.canvas || wholeImageFallback(sourceCanvas));
  let best = null;
  let successful = false;
  let groupReviewSource = null;
  let groupReviewScore = Number.POSITIVE_INFINITY;

  const recognizeLine = async (prepared) => {
    setScannerStatusKey("scannerReading");
    const result = await worker.recognize(prepared);
    const candidate = {
      text: result.data.text.trim(),
      digits: result.data.text.replace(/\D/g, ""),
      confidence: result.data.confidence,
    };

    if (!best || scoreCandidate(candidate) < scoreCandidate(best)) {
      best = candidate;
    }

    if (candidate.digits.length >= 15 && candidate.digits.length < 20 && scoreCandidate(candidate) < groupReviewScore) {
      groupReviewSource = prepared;
      groupReviewScore = scoreCandidate(candidate);
    }

    if (candidate.digits.length === 20) {
      successful = true;
      return true;
    }

    return false;
  };

  if (detection) {
    const orientations = [normalizedCard, rotateCanvas(normalizedCard, 180)];

    fixedLayout: for (const binary of [false, true]) {
      for (const orientation of orientations) {
        for (const crop of codeCrops) {
          if (await recognizeLine(prepareCrop(orientation, crop, binary))) {
            break fixedLayout;
          }
        }
      }
    }
  }

  if (!successful) {
    const accessRegions = [
      detection ? detectAccessCodeRegion(normalizedCard, cv) : null,
      detectAccessCodeRegion(sourceCanvas, cv),
    ]
      .filter(Boolean)
      .sort((a, b) => b.alignedBoxes - a.alignedBoxes)
      .slice(0, 2);

    anchorSearch: for (const accessRegion of accessRegions) {
      for (const orientation of [accessRegion.canvas, rotateCanvas(accessRegion.canvas, 180)]) {
        if (await recognizeLine(prepareCrop(orientation, accessNumberCrop, false))) {
          break anchorSearch;
        }
      }
    }
  }

  if (!successful && groupReviewSource) {
    await worker.setParameters({
      tessedit_pageseg_mode: tesseract.PSM.SINGLE_WORD,
    });

    try {
      const groupResults = [];

      for (const group of splitIntoCodeGroups(groupReviewSource)) {
        const result = await worker.recognize(group);
        groupResults.push({
          text: result.data.text.trim(),
          digits: result.data.text.replace(/\D/g, ""),
          confidence: result.data.confidence,
        });
      }

      const grouped = {
        text: groupResults.map((group) => group.text).join(" "),
        digits: groupResults.map((group) => group.digits).join(""),
        confidence: groupResults.reduce((sum, group) => sum + group.confidence, 0) / groupResults.length,
      };

      if (!best || scoreCandidate(grouped) < scoreCandidate(best)) {
        best = grouped;
      }
    } finally {
      await worker.setParameters({
        tessedit_pageseg_mode: tesseract.PSM.RAW_LINE,
      });
    }
  }

  return best?.digits.length === 20 ? best.digits : "";
}

function stopScannerCamera() {
  scannerCameraRequestId += 1;
  scannerStream?.getTracks().forEach((track) => track.stop());
  scannerStream = null;
  scannerVideo.srcObject = null;
  unfreezeScannerFrame();
  captureScannerButton.disabled = true;
}

async function startScannerCamera() {
  stopScannerCamera();
  const requestId = scannerCameraRequestId;
  captureScannerButton.disabled = true;
  setScannerStatusKey("scannerCameraStarting");

  if (!navigator.mediaDevices?.getUserMedia) {
    setScannerStatusKey("scannerCameraFailed");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 3840 },
        height: { ideal: 2160 },
      },
      audio: false,
    });

    if (requestId !== scannerCameraRequestId || !scannerDialog.open) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    scannerStream = stream;
    scannerVideo.srcObject = scannerStream;
    await scannerVideo.play();
    captureScannerButton.disabled = false;
    setScannerStatusKey("scannerReady");
  } catch (error) {
    console.warn("Camera start failed:", error);
    stopScannerCamera();
    setScannerStatusKey("scannerCameraFailed");
  }
}

function captureScannerFrame() {
  if (!scannerVideo.videoWidth || !scannerVideo.videoHeight) {
    throw new Error("Video is not ready");
  }

  const stage = document.querySelector(".scanner-stage");
  const frame = document.querySelector(".scanner-card-frame");
  const stageRect = stage.getBoundingClientRect();
  const frameRect = frame.getBoundingClientRect();
  const viewportWidth = stageRect.width;
  const viewportHeight = stageRect.height;
  const coverScale = Math.max(viewportWidth / scannerVideo.videoWidth, viewportHeight / scannerVideo.videoHeight);
  const displayedWidth = scannerVideo.videoWidth * coverScale;
  const displayedHeight = scannerVideo.videoHeight * coverScale;
  const hiddenX = (displayedWidth - viewportWidth) / 2;
  const hiddenY = (displayedHeight - viewportHeight) / 2;
  const margin = Math.min(viewportWidth, viewportHeight) * 0.04;
  const visibleX = clamp(frameRect.left - stageRect.left - margin, 0, viewportWidth);
  const visibleY = clamp(frameRect.top - stageRect.top - margin, 0, viewportHeight);
  const visibleRight = clamp(frameRect.right - stageRect.left + margin, visibleX, viewportWidth);
  const visibleBottom = clamp(frameRect.bottom - stageRect.top + margin, visibleY, viewportHeight);
  const sx = (visibleX + hiddenX) / coverScale;
  const sy = (visibleY + hiddenY) / coverScale;
  const sw = (visibleRight - visibleX) / coverScale;
  const sh = (visibleBottom - visibleY) / coverScale;
  const canvas = document.createElement("canvas");
  const scale = clamp(1600 / Math.max(sw, sh), 1, 3);
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  canvas.getContext("2d")?.drawImage(scannerVideo, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function freezeScannerFrame() {
  const stage = document.querySelector(".scanner-stage");

  if (!scannerVideo.videoWidth || !scannerVideo.videoHeight) {
    return;
  }

  scannerFreezeCanvas.width = scannerVideo.videoWidth;
  scannerFreezeCanvas.height = scannerVideo.videoHeight;
  scannerFreezeCanvas.getContext("2d")?.drawImage(scannerVideo, 0, 0, scannerFreezeCanvas.width, scannerFreezeCanvas.height);
  stage.classList.add("is-frozen");
}

function unfreezeScannerFrame() {
  document.querySelector(".scanner-stage")?.classList.remove("is-frozen");
  const context = scannerFreezeCanvas.getContext("2d");
  context?.clearRect(0, 0, scannerFreezeCanvas.width, scannerFreezeCanvas.height);
}

function scheduleAvailabilityCountdown(nextAvailableAt) {
  clearAvailabilityTimer();

  const nextAvailableAtMs = new Date(nextAvailableAt).getTime();

  availabilityTimer = setInterval(() => {
    if (isBusy) {
      return;
    }

    const secondsLeft = Math.max(0, Math.ceil((nextAvailableAtMs - Date.now()) / 1000));
    setStatusKey("queueCountdown", secondsLeft);

    if (secondsLeft <= 0) {
      clearAvailabilityTimer();
      checkAvailability({ force: true });
    }
  }, 1000);
}

function cachedAvailability() {
  try {
    const cached = JSON.parse(localStorage.getItem(availabilityCacheKey) || "null");

    if (!cached || Date.now() - cached.cachedAt > availabilityCacheTtlMs) {
      return null;
    }

    return cached.result;
  } catch {
    return null;
  }
}

function cacheAvailability(result) {
  try {
    localStorage.setItem(
      availabilityCacheKey,
      JSON.stringify({
        cachedAt: Date.now(),
        result,
      }),
    );
  } catch {
    // Cache is only a resource saver; failing to persist it should not block the app.
  }
}

function clearAvailabilityCache() {
  try {
    localStorage.removeItem(availabilityCacheKey);
  } catch {
    // Ignore storage errors.
  }
}

function applyAvailabilityResult(result) {
  if (result.state === "ready") {
    clearAvailabilityTimer();
    setStatusKey("ready");
    return;
  }

  if (result.state === "queue" && result.nextAvailableAt) {
    scheduleAvailabilityCountdown(result.nextAvailableAt);
    return;
  }

  setStatusKey("noSlot");
}

async function checkAvailability(options = {}) {
  if (isBusy) {
    return;
  }

  if (!options.force) {
    const cached = cachedAvailability();

    if (cached) {
      applyAvailabilityResult(cached);
      return;
    }
  }

  setStatusKey("checking");

  try {
    const response = await fetch("/api/my-aime/status", {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.error || t("checkFailed"));
    }

    cacheAvailability(result);
    applyAvailabilityResult(result);
  } catch (error) {
    console.warn("Availability check failed:", error);
    setStatusKey("unavailable");
  }
}

function readCsvHeader(response, name) {
  return (response.headers.get(name) || "").split(",").filter(Boolean);
}

function errorMessageForCode(errorCode) {
  if (errorCode === "NO_AVAILABLE_SLOT") return t("noSlot");
  if (errorCode === "UNUSED_AIME") return t("unusedAime");
  if (errorCode === "INVALID_AIME_CODE") return t("invalidAimeCode");
  return "";
}

function restoreStatusAfterScoreDialog() {
  const generatedKeys = new Set(["generated", "existingSlot", "clearedExpired"]);

  if (!generatedKeys.has(statusText.dataset.statusKey)) {
    return;
  }

  setStatusKey("waiting");
  checkAvailability();
}

function resetMobileViewport() {
  clearTimeout(resetViewportTimer);
  resetViewportTimer = setTimeout(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  }, 180);
}

accessCodeInput.addEventListener("input", () => {
  accessCodeInput.value = formatAccessCode(accessCodeInput.value);
});

for (const control of [accessCodeInput, cmdTypeInput, languageSelect]) {
  control.addEventListener("blur", resetMobileViewport);
}

window.visualViewport?.addEventListener("resize", () => {
  if (!document.activeElement || document.activeElement === document.body) {
    resetMobileViewport();
  }
});

languageSelect.addEventListener("change", () => {
  localStorage.setItem("maiscore-language", languageSelect.value);
  applyLanguage(languageSelect.value);
});

scanButton.addEventListener("click", () => {
  if (isBusy || isScanning) {
    return;
  }

  setScannerStatusKey("scannerReady");
  scannerDialog.showModal();
  requestAnimationFrame(() => {
    scannerDialog.focus({ preventScroll: true });
    closeScannerButton.blur();
  });
  startScannerCamera();
});

closeScannerButton.addEventListener("click", () => {
  closeScannerDialog();
});

scannerDialog.addEventListener("click", (event) => {
  if (event.target === scannerDialog) {
    closeScannerDialog();
  }
});

scannerDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeScannerDialog();
});

captureScannerButton.addEventListener("click", async () => {
  if (isScanning || !scannerStream) {
    return;
  }

  isScanning = true;
  scanButton.disabled = true;
  queryButton.disabled = true;
  captureScannerButton.disabled = true;
  let shouldResumePreview = true;

  try {
    const scannerFrame = captureScannerFrame();
    freezeScannerFrame();
    const digits = await recognizeAccessCodeFromCanvas(scannerFrame);

    if (!digits) {
      setScannerStatusKey("scannerNoCode");
      return;
    }

    accessCodeInput.value = formatAccessCode(digits);
    setScannerStatusKey("scannerSuccess");
    setStatusKey("waiting");
    shouldResumePreview = false;
    window.setTimeout(() => closeScannerDialog(), 260);
  } catch (error) {
    console.warn("Scanner failed:", error);
    setScannerStatusKey("scannerFailed");
  } finally {
    if (shouldResumePreview) {
      unfreezeScannerFrame();
    }

    isScanning = false;
    scanButton.disabled = false;
    queryButton.disabled = false;
    captureScannerButton.disabled = !scannerStream;
  }
});

closeDialogButton.addEventListener("click", () => {
  closeScoreDialog();
});

scoreDialog.addEventListener("click", (event) => {
  if (event.target === scoreDialog) {
    closeScoreDialog();
  }
});

scoreDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeScoreDialog();
});

function closeScoreDialog(options = {}) {
  if (!scoreDialog.open) {
    return;
  }

  clearTimeout(dialogCloseTimer);

  if (options.immediate) {
    scoreDialog.classList.remove("is-closing");
    scoreDialog.close();
    restoreStatusAfterScoreDialog();
    return;
  }

  scoreDialog.classList.add("is-closing");
  dialogCloseTimer = setTimeout(() => {
    scoreDialog.classList.remove("is-closing");
    scoreDialog.close();
    restoreStatusAfterScoreDialog();
  }, 180);
}

function closeScannerDialog(options = {}) {
  if (!scannerDialog.open || isScanning) {
    return;
  }

  clearTimeout(scannerCloseTimer);
  stopScannerCamera();

  if (options.immediate) {
    scannerDialog.classList.remove("is-closing");
    scannerDialog.close();
    return;
  }

  scannerDialog.classList.add("is-closing");
  scannerCloseTimer = setTimeout(() => {
    scannerDialog.classList.remove("is-closing");
    scannerDialog.close();
  }, 190);
}

scoreForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const accessCode = normalizeAccessCode(accessCodeInput.value);

  if (!/^\d{20}$/.test(accessCode)) {
    setStatusKey("invalidCode");
    accessCodeInput.focus();
    return;
  }

  isBusy = true;
  queryButton.disabled = true;
  scanButton.disabled = true;
  clearAvailabilityTimer();
  clearAvailabilityCache();
  clearScoreImage();
  setStatusKey("working");

  try {
    const response = await fetch("/api/my-aime/score", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        accessCode,
        cmdType: cmdTypeInput.value,
        timezone: -new Date().getTimezoneOffset() / 60,
      }),
    });

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      const localMessage = errorMessageForCode(result.errorCode);

      if (localMessage) {
        if (result.errorCode === "NO_AVAILABLE_SLOT" && result.nextAvailableAt) {
          scheduleAvailabilityCountdown(result.nextAvailableAt);
        }

        throw new Error(localMessage);
      }

      throw new Error(result.error || t("queryFailed"));
    }

    const blob = await response.blob();
    const boundSlotNo = Number(response.headers.get("X-Bound-Slot-No"));
    const alreadyBound = response.headers.get("X-Already-Bound") === "1";
    const removedExpiredSlotNos = readCsvHeader(response, "X-Removed-Expired-Slot-Nos");

    setScoreImage(blob);
    if (alreadyBound) {
      setStatusKey("existingSlot", boundSlotNo);
      return;
    }

    if (removedExpiredSlotNos.length) {
      setStatusKey("clearedExpired", removedExpiredSlotNos);
      return;
    }

    setStatusKey("generated");
  } catch (error) {
    setStatus(error.message);
  } finally {
    isBusy = false;
    queryButton.disabled = false;
    scanButton.disabled = false;
  }
});

applyLanguage(preferredLanguage());
checkAvailability();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Service worker registration failed:", error);
    });
  });
}
