const scoreForm = document.querySelector("#scoreForm");
const queryButton = document.querySelector("#queryButton");
const accessCodeInput = document.querySelector("#accessCodeInput");
const cmdTypeInput = document.querySelector("#cmdTypeInput");
const languageSelect = document.querySelector("#languageSelect");
const statusText = document.querySelector("#statusText");
const scoreDialog = document.querySelector("#scoreDialog");
const scoreResult = document.querySelector("#scoreResult");
const scoreImage = document.querySelector("#scoreImage");
const closeDialogButton = document.querySelector("#closeDialogButton");
const downloadScoreButton = document.querySelector("#downloadScoreButton");
const scanButton = document.querySelector("#scanButton");
const scannerDialog = document.querySelector("#scannerDialog");
const scannerVideo = document.querySelector("#scannerVideo");
const scannerFrame = document.querySelector(".scanner-frame");
const scannerStatus = document.querySelector("#scannerStatus");
const closeScannerButton = document.querySelector("#closeScannerButton");
let availabilityTimer = null;
let scoreImageUrl = "";
let isBusy = false;
let isOcrBusy = false;
let currentLanguage = "zh-Hans";
let resetViewportTimer = null;
let dialogCloseTimer = null;
let scannerCloseTimer = null;
let scannerOpenTimer = null;
let scannerStream = null;
let scannerTimer = null;
let scannerWorkerPromise = null;
const availabilityCacheKey = "maiscore-availability-cache";
const availabilityCacheTtlMs = 60 * 1000;
const scannerIntervalMs = 1600;
const tesseractScriptUrl = "https://cdn.jsdelivr.net/npm/tesseract.js@4.1.1/dist/tesseract.min.js";

const messages = {
  "zh-Hans": {
    navNote: "日服 maimai 成绩图",
    introLine1: "输入 Aime 卡号，",
    introLine2: "生成日服成绩图。",
    accessLabel: "Aime access code",
    scanButton: "扫描",
    queryButton: "查询",
    scoreTypeLabel: "成绩类型",
    scannerTitle: "扫描 Aime",
    scannerReady: "对准卡号。",
    scannerCameraFailed: "无法打开相机。",
    scannerPermissionDenied: "请允许相机权限。",
    waiting: "等待输入卡号。",
    queueCountdown: (seconds) => `等待 ${seconds}s。`,
    checking: "检查中...",
    checkFailed: "无法检查当前排队状态。",
    ready: "现在可以查询。",
    noSlot: "暂无空位。",
    unavailable: "可直接查询。",
    ocrUnsupported: "当前浏览器无法读取图片。",
    ocrLoading: "正在加载扫描组件...",
    ocrReading: "正在识别卡号...",
    ocrNoCode: "没有识别到 20 位卡号。",
    ocrDone: "已识别卡号。",
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
    scanButton: "Scan",
    queryButton: "Get score",
    scoreTypeLabel: "Score type",
    scannerTitle: "Scan Aime",
    scannerReady: "Align the code.",
    scannerCameraFailed: "Could not open camera.",
    scannerPermissionDenied: "Please allow camera access.",
    waiting: "Waiting for an Aime code.",
    queueCountdown: (seconds) => `Wait ${seconds}s.`,
    checking: "Checking...",
    checkFailed: "Could not check queue status.",
    ready: "Ready to query.",
    noSlot: "No slot available.",
    unavailable: "Ready.",
    ocrUnsupported: "This browser cannot read images.",
    ocrLoading: "Loading scanner...",
    ocrReading: "Reading card code...",
    ocrNoCode: "Could not find a 20-digit card code.",
    ocrDone: "Card code detected.",
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
    scanButton: "掃描",
    queryButton: "查詢",
    scoreTypeLabel: "成績類型",
    scannerTitle: "掃描 Aime",
    scannerReady: "對準卡號。",
    scannerCameraFailed: "無法開啟相機。",
    scannerPermissionDenied: "請允許相機權限。",
    waiting: "等待輸入卡號。",
    queueCountdown: (seconds) => `等待 ${seconds}s。`,
    checking: "檢查中...",
    checkFailed: "無法檢查目前排隊狀態。",
    ready: "現在可以查詢。",
    noSlot: "暫無空位。",
    unavailable: "可直接查詢。",
    ocrUnsupported: "目前瀏覽器無法讀取圖片。",
    ocrLoading: "正在載入掃描元件...",
    ocrReading: "正在辨識卡號...",
    ocrNoCode: "沒有辨識到 20 位卡號。",
    ocrDone: "已辨識卡號。",
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
    scanButton: "스캔",
    queryButton: "조회",
    scoreTypeLabel: "성과 유형",
    scannerTitle: "Aime 스캔",
    scannerReady: "카드 번호를 맞춰 주세요.",
    scannerCameraFailed: "카메라를 열 수 없습니다.",
    scannerPermissionDenied: "카메라 권한을 허용해 주세요.",
    waiting: "카드 번호 입력을 기다리는 중입니다.",
    queueCountdown: (seconds) => `${seconds}초 대기.`,
    checking: "확인 중...",
    checkFailed: "대기 상태를 확인할 수 없습니다.",
    ready: "지금 조회할 수 있습니다.",
    noSlot: "빈 슬롯 없음.",
    unavailable: "바로 조회 가능.",
    ocrUnsupported: "현재 브라우저에서 이미지를 읽을 수 없습니다.",
    ocrLoading: "스캐너를 불러오는 중...",
    ocrReading: "카드 번호 인식 중...",
    ocrNoCode: "20자리 카드 번호를 찾지 못했습니다.",
    ocrDone: "카드 번호를 인식했습니다.",
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

function setScannerStatusKey(key) {
  scannerStatus.dataset.scannerStatusKey = key;
  scannerStatus.textContent = t(key);
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

  if (scannerStatus.dataset.scannerStatusKey) {
    scannerStatus.textContent = t(scannerStatus.dataset.scannerStatusKey);
  }

  if (statusText.dataset.statusKey) {
    const args = JSON.parse(statusText.dataset.statusArgs || "[]");
    setStatus(t(statusText.dataset.statusKey, ...args));
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

function loadScript(src) {
  const existing = document.querySelector(`script[src="${src}"]`);

  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.Tesseract) {
        resolve();
        return;
      }

      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });
}

function thresholdCanvas(canvas) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let index = 0; index < data.length; index += 4) {
    const gray = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    const value = gray > 146 ? 255 : 0;
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
  }

  context.putImageData(imageData, 0, 0);
  return canvas;
}

function enhanceAccessCodeCanvas(canvas) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let index = 0; index < data.length; index += 4) {
    const gray = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    const value = gray > 118 ? 0 : 255;
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
  }

  context.putImageData(imageData, 0, 0);
  return canvas;
}

function cropFrameToCanvas(frame, region, options = {}) {
  const sourceX = frame.x + frame.width * region.x;
  const sourceY = frame.y + frame.height * region.y;
  const sourceWidth = frame.width * region.width;
  const sourceHeight = frame.height * region.height;
  const scale = options.scale || 2.4;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));

  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(scannerVideo, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);

  return options.mode === "access-code" ? enhanceAccessCodeCanvas(canvas) : thresholdCanvas(canvas);
}

function clampRegion(region) {
  const x = Math.max(0, Math.min(1, region.x));
  const y = Math.max(0, Math.min(1, region.y));
  const right = Math.max(x, Math.min(1, region.x + region.width));
  const bottom = Math.max(y, Math.min(1, region.y + region.height));

  return {
    x,
    y,
    width: Math.max(0.01, right - x),
    height: Math.max(0.01, bottom - y),
  };
}

function expandedRegion(region, paddingX, paddingY) {
  return clampRegion({
    x: region.x - paddingX,
    y: region.y - paddingY,
    width: region.width + paddingX * 2,
    height: region.height + paddingY * 2,
  });
}

function scannerFrameRegionInVideo() {
  const videoRect = scannerVideo.getBoundingClientRect();
  const frameRect = scannerFrame.getBoundingClientRect();

  if (!videoRect.width || !videoRect.height) {
    return null;
  }

  const videoAspect = scannerVideo.videoWidth / scannerVideo.videoHeight;
  const viewAspect = videoRect.width / videoRect.height;
  let renderedWidth = videoRect.width;
  let renderedHeight = videoRect.height;
  let offsetX = 0;
  let offsetY = 0;

  if (videoAspect > viewAspect) {
    renderedWidth = videoRect.height * videoAspect;
    offsetX = (videoRect.width - renderedWidth) / 2;
  } else {
    renderedHeight = videoRect.width / videoAspect;
    offsetY = (videoRect.height - renderedHeight) / 2;
  }

  return clampRegion({
    x: (frameRect.left - videoRect.left - offsetX) / renderedWidth,
    y: (frameRect.top - videoRect.top - offsetY) / renderedHeight,
    width: frameRect.width / renderedWidth,
    height: frameRect.height / renderedHeight,
  });
}

function videoFrameToOcrCanvases() {
  if (!scannerVideo.videoWidth || !scannerVideo.videoHeight) {
    return [];
  }

  const frame = {
    x: 0,
    y: 0,
    width: scannerVideo.videoWidth,
    height: scannerVideo.videoHeight,
  };
  const frameRegion = scannerFrameRegionInVideo();

  if (!frameRegion) {
    return [];
  }

  const tightCodeRegion = expandedRegion(frameRegion, 0.015, 0.08);
  const widerCodeRegion = expandedRegion(frameRegion, 0.04, 0.18);

  return [
    cropFrameToCanvas(frame, tightCodeRegion, { mode: "access-code", scale: 4 }),
    cropFrameToCanvas(frame, widerCodeRegion, { mode: "access-code", scale: 3 }),
    cropFrameToCanvas(frame, widerCodeRegion, { scale: 2.2 }),
  ];
}

async function createOcrWorker() {
  await loadScript(tesseractScriptUrl);

  if (!window.Tesseract) {
    throw new Error(t("ocrUnsupported"));
  }

  const worker = await window.Tesseract.createWorker();

  if (typeof worker.load === "function") {
    await worker.load();
  }

  if (typeof worker.loadLanguage === "function") {
    await worker.loadLanguage("eng");
  }

  if (typeof worker.initialize === "function") {
    await worker.initialize("eng");
  }

  await worker.setParameters?.({
    preserve_interword_spaces: "1",
    tessedit_pageseg_mode: "7",
    tessedit_char_whitelist: "0123456789 ",
  });

  return worker;
}

function ensureOcrWorker() {
  scannerWorkerPromise ||= createOcrWorker();
  return scannerWorkerPromise;
}

function extractAccessCode(text) {
  const compact = text.replace(/\D/g, "");
  const match = compact.match(/\d{20}/);
  return match?.[0] || "";
}

async function scanVideoFrame() {
  if (!scannerDialog.open || isOcrBusy) {
    return;
  }

  const canvases = videoFrameToOcrCanvases();

  if (!canvases.length) {
    return;
  }

  isOcrBusy = true;
  setScannerStatusKey("ocrReading");

  try {
    const worker = await ensureOcrWorker();
    let accessCode = "";

    for (const canvas of canvases) {
      const result = await worker.recognize(canvas);
      accessCode = extractAccessCode(result.data.text || "");

      if (accessCode) {
        break;
      }
    }

    if (accessCode) {
      accessCodeInput.value = formatAccessCode(accessCode);
      setStatusKey("ocrDone");
      setScannerStatusKey("ocrDone");
      stopScanner({ close: true });
      return;
    }

    setScannerStatusKey("scannerReady");
  } catch (error) {
    scannerStatus.textContent = error.message || t("ocrNoCode");
  } finally {
    isOcrBusy = false;
  }
}

async function startScanner() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(t("ocrUnsupported"));
  }

  clearTimeout(scannerCloseTimer);
  clearTimeout(scannerOpenTimer);
  scannerDialog.classList.remove("is-closing", "is-visible");
  scannerDialog.classList.add("is-entering");

  if (!scannerDialog.open) {
    scannerDialog.showModal();
    scannerDialog.focus({ preventScroll: true });
  }

  // Force the off-screen state to paint before moving the sheet into view.
  scannerDialog.offsetHeight;
  scannerOpenTimer = setTimeout(() => {
    scannerDialog.classList.remove("is-entering");
    scannerDialog.classList.add("is-visible");
  }, 40);

  isOcrBusy = true;
  scanButton.disabled = true;
  queryButton.disabled = true;
  setScannerStatusKey("ocrLoading");

  try {
    scannerStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    });

    scannerVideo.srcObject = scannerStream;
    await scannerVideo.play();
    await ensureOcrWorker();

    isOcrBusy = false;
    setScannerStatusKey("scannerReady");
    clearInterval(scannerTimer);
    scannerTimer = setInterval(scanVideoFrame, scannerIntervalMs);
    scanVideoFrame();
  } catch (error) {
    isOcrBusy = false;
    scannerStatus.textContent =
      error.name === "NotAllowedError" || error.name === "PermissionDeniedError"
        ? t("scannerPermissionDenied")
        : error.message || t("scannerCameraFailed");
    stopScanner({ close: false });
  }
}

function stopScanner(options = {}) {
  clearInterval(scannerTimer);
  scannerTimer = null;

  if (scannerStream) {
    for (const track of scannerStream.getTracks()) {
      track.stop();
    }
  }

  scannerStream = null;
  scannerVideo.pause();
  scannerVideo.srcObject = null;
  isOcrBusy = false;
  scanButton.disabled = isBusy;
  queryButton.disabled = isBusy;

  if (!options.close || !scannerDialog.open) {
    return;
  }

  clearTimeout(scannerCloseTimer);
  clearTimeout(scannerOpenTimer);
  scannerDialog.classList.remove("is-visible", "is-entering");
  scannerDialog.classList.add("is-closing");
  scannerCloseTimer = setTimeout(() => {
    scannerDialog.classList.remove("is-closing");
    scannerDialog.close();
    setScannerStatusKey("scannerReady");
  }, 200);
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

closeDialogButton.addEventListener("click", () => {
  closeScoreDialog();
});

scanButton.addEventListener("click", () => {
  if (isBusy || isOcrBusy) {
    return;
  }

  startScanner().catch((error) => {
    setStatus(error.message || t("ocrUnsupported"));
  });
});

closeScannerButton.addEventListener("click", () => {
  stopScanner({ close: true });
});

scannerDialog.addEventListener("click", (event) => {
  if (event.target === scannerDialog) {
    stopScanner({ close: true });
  }
});

scannerDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  stopScanner({ close: true });
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
    return;
  }

  scoreDialog.classList.add("is-closing");
  dialogCloseTimer = setTimeout(() => {
    scoreDialog.classList.remove("is-closing");
    scoreDialog.close();
  }, 180);
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
