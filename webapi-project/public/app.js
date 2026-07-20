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
let availabilityTimer = null;
let scoreImageUrl = "";
let isBusy = false;
let currentLanguage = "zh-Hans";
let resetViewportTimer = null;
let dialogCloseTimer = null;
const availabilityCacheKey = "maiscore-availability-cache";
const availabilityCacheTtlMs = 60 * 1000;

const messages = {
  "zh-Hans": {
    navNote: "日服 maimai 成绩图",
    introLine1: "输入 Aime 卡号，",
    introLine2: "生成日服成绩图。",
    accessLabel: "Aime access code",
    queryButton: "查询",
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
