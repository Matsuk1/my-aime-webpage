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
let removeTimer = null;
let countdownTimer = null;
let availabilityTimer = null;
let scoreImageUrl = "";
let isBusy = false;
let currentLanguage = "zh-Hans";

const messages = {
  "zh-Hans": {
    navNote: "日服 maimai 成绩图",
    introLine1: "输入 Aime 卡号，",
    introLine2: "生成日服成绩图。",
    accessLabel: "Aime access code",
    queryButton: "查询",
    scoreTypeLabel: "成绩类型",
    waiting: "等待输入卡号。",
    removeStarted: "正在清理...",
    removeFailed: "清理失败。",
    removed: () => "已清理。",
    boundCountdown: (slotNo, seconds) => `${seconds}s 后自动清理。`,
    queueCountdown: (seconds) => `等待 ${seconds}s。`,
    checking: "检查中...",
    checkFailed: "无法检查当前排队状态。",
    ready: "现在可以查询。",
    noSlot: "暂无空位。",
    unavailable: "可直接查询。",
    invalidCode: "卡号需要是 20 位数字。",
    working: "生成中...",
    queryFailed: "查询失败。",
    existingSlot: () => "已生成。",
    clearedExpired: () => "已清理过期卡。",
    generated: "已生成。",
    closeDialog: "关闭",
    downloadScore: "下载",
  },
  en: {
    navNote: "JP maimai score image",
    introLine1: "Enter your Aime code,",
    introLine2: "get a JP score card.",
    accessLabel: "Aime access code",
    queryButton: "Get score",
    scoreTypeLabel: "Score type",
    waiting: "Waiting for an Aime code.",
    removeStarted: "Cleaning...",
    removeFailed: "Cleanup failed.",
    removed: () => "Cleaned.",
    boundCountdown: (slotNo, seconds) => `Auto cleanup in ${seconds}s.`,
    queueCountdown: (seconds) => `Wait ${seconds}s.`,
    checking: "Checking...",
    checkFailed: "Could not check queue status.",
    ready: "Ready to query.",
    noSlot: "No slot available.",
    unavailable: "Ready.",
    invalidCode: "The card code must be 20 digits.",
    working: "Generating...",
    queryFailed: "Query failed.",
    existingSlot: () => "Done.",
    clearedExpired: () => "Expired card cleared.",
    generated: "Done.",
    closeDialog: "Close",
    downloadScore: "Download",
  },
  "zh-Hant": {
    navNote: "日服 maimai 成績圖",
    introLine1: "輸入 Aime 卡號，",
    introLine2: "生成日服成績圖。",
    accessLabel: "Aime access code",
    queryButton: "查詢",
    scoreTypeLabel: "成績類型",
    waiting: "等待輸入卡號。",
    removeStarted: "正在清理...",
    removeFailed: "清理失敗。",
    removed: () => "已清理。",
    boundCountdown: (slotNo, seconds) => `${seconds}s 後自動清理。`,
    queueCountdown: (seconds) => `等待 ${seconds}s。`,
    checking: "檢查中...",
    checkFailed: "無法檢查目前排隊狀態。",
    ready: "現在可以查詢。",
    noSlot: "暫無空位。",
    unavailable: "可直接查詢。",
    invalidCode: "卡號需要是 20 位數字。",
    working: "生成中...",
    queryFailed: "查詢失敗。",
    existingSlot: () => "已生成。",
    clearedExpired: () => "已清理過期卡。",
    generated: "已生成。",
    closeDialog: "關閉",
    downloadScore: "下載",
  },
  ko: {
    navNote: "일본 서버 maimai 스코어 이미지",
    introLine1: "Aime 카드 번호를 입력하고,",
    introLine2: "일본 서버 성과 이미지를 생성하세요.",
    accessLabel: "Aime access code",
    queryButton: "조회",
    scoreTypeLabel: "성과 유형",
    waiting: "카드 번호 입력을 기다리는 중입니다.",
    removeStarted: "정리 중...",
    removeFailed: "정리 실패.",
    removed: () => "정리 완료.",
    boundCountdown: (slotNo, seconds) => `${seconds}초 후 자동 정리.`,
    queueCountdown: (seconds) => `${seconds}초 대기.`,
    checking: "확인 중...",
    checkFailed: "대기 상태를 확인할 수 없습니다.",
    ready: "지금 조회할 수 있습니다.",
    noSlot: "빈 슬롯 없음.",
    unavailable: "바로 조회 가능.",
    invalidCode: "카드 번호는 숫자 20자리여야 합니다.",
    working: "생성 중...",
    queryFailed: "조회에 실패했습니다.",
    existingSlot: () => "완료.",
    clearedExpired: () => "만료 카드 정리 완료.",
    generated: "완료.",
    closeDialog: "닫기",
    downloadScore: "다운로드",
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

function applyLanguage(language) {
  currentLanguage = messages[language] ? language : "zh-Hans";
  document.documentElement.lang = currentLanguage;
  languageSelect.value = currentLanguage;

  for (const element of document.querySelectorAll("[data-i18n]")) {
    element.textContent = t(element.dataset.i18n);
  }

  closeDialogButton.setAttribute("aria-label", t("closeDialog"));
  downloadScoreButton.setAttribute("aria-label", t("downloadScore"));

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
  }
}

function clearScoreImage() {
  if (scoreImageUrl) {
    URL.revokeObjectURL(scoreImageUrl);
  }

  scoreImageUrl = "";
  scoreImage.removeAttribute("src");
  downloadScoreButton.removeAttribute("href");

  if (scoreDialog.open) {
    scoreDialog.close();
  }
}

function clearRemoveTimers() {
  if (removeTimer) {
    clearTimeout(removeTimer);
  }

  if (countdownTimer) {
    clearInterval(countdownTimer);
  }

  removeTimer = null;
  countdownTimer = null;
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

async function removeBoundCard(boundSlotNo) {
  setStatusKey("removeStarted");

  const response = await fetch("/api/my-aime/remove", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ boundSlotNo }),
  });
  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(result.error || t("removeFailed"));
  }

  setStatusKey("removed", result.removedSlotNo);
}

function scheduleRemove(boundSlotNo, expiresAt) {
  clearRemoveTimers();

  const expiresAtMs = new Date(expiresAt).getTime();

  countdownTimer = setInterval(() => {
    const secondsLeft = Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000));
    setStatusKey("boundCountdown", boundSlotNo, secondsLeft);

    if (secondsLeft <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }, 1000);

  removeTimer = setTimeout(async () => {
    try {
      await removeBoundCard(boundSlotNo);
    } catch (error) {
      setStatus(error.message);
    } finally {
      clearRemoveTimers();
    }
  }, Math.max(0, expiresAtMs - Date.now()));
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
      checkAvailability();
    }
  }, 1000);
}

async function checkAvailability() {
  if (isBusy) {
    return;
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

    if (result.state === "ready") {
      clearAvailabilityTimer();
      setStatusKey("ready");
      return;
    }

    if (result.state === "queue" && result.nextAvailableAt) {
      scheduleAvailabilityCountdown(result.nextAvailableAt);
      return;
    }

    setStatus(result.message || t("noSlot"));
  } catch (error) {
    console.warn("Availability check failed:", error);
    setStatusKey("unavailable");
  }
}

function readCsvHeader(response, name) {
  return (response.headers.get(name) || "").split(",").filter(Boolean);
}

accessCodeInput.addEventListener("input", () => {
  accessCodeInput.value = formatAccessCode(accessCodeInput.value);
});

languageSelect.addEventListener("change", () => {
  localStorage.setItem("maiscore-language", languageSelect.value);
  applyLanguage(languageSelect.value);
});

closeDialogButton.addEventListener("click", () => {
  if (scoreDialog.open) {
    scoreDialog.close();
  }
});

scoreDialog.addEventListener("click", (event) => {
  if (event.target === scoreDialog) {
    scoreDialog.close();
  }
});

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
  clearAvailabilityTimer();
  clearRemoveTimers();
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
      if (result.boundSlotNo && result.session?.expiresAt) {
        scheduleRemove(result.boundSlotNo, result.session.expiresAt);
      }
      throw new Error(result.error || t("queryFailed"));
    }

    const blob = await response.blob();
    const boundSlotNo = Number(response.headers.get("X-Bound-Slot-No"));
    const alreadyBound = response.headers.get("X-Already-Bound") === "1";
    const expiresAt = response.headers.get("X-Expires-At");
    const removedExpiredSlotNos = readCsvHeader(response, "X-Removed-Expired-Slot-Nos");

    setScoreImage(blob);
    if (alreadyBound) {
      setStatusKey("existingSlot", boundSlotNo);
      return;
    }

    if (removedExpiredSlotNos.length) {
      setStatusKey("clearedExpired", removedExpiredSlotNos);
    }

    if (expiresAt) {
      scheduleRemove(boundSlotNo, expiresAt);
    } else {
      setStatusKey("generated");
    }
  } catch (error) {
    setStatus(error.message);
  } finally {
    isBusy = false;
    queryButton.disabled = false;
  }
});

applyLanguage(preferredLanguage());
checkAvailability();
