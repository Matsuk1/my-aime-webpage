const scoreForm = document.querySelector("#scoreForm");
const queryButton = document.querySelector("#queryButton");
const accessCodeInput = document.querySelector("#accessCodeInput");
const cmdTypeInput = document.querySelector("#cmdTypeInput");
const statusText = document.querySelector("#statusText");
const scoreResult = document.querySelector("#scoreResult");
const scoreImage = document.querySelector("#scoreImage");
let removeTimer = null;
let countdownTimer = null;
let availabilityTimer = null;
let scoreImageUrl = "";
let isBusy = false;

function setStatus(message) {
  statusText.textContent = message;
}

function setScoreImage(blob) {
  if (scoreImageUrl) {
    URL.revokeObjectURL(scoreImageUrl);
  }

  scoreImageUrl = URL.createObjectURL(blob);
  scoreImage.src = scoreImageUrl;
  scoreResult.hidden = false;
}

function clearScoreImage() {
  if (scoreImageUrl) {
    URL.revokeObjectURL(scoreImageUrl);
  }

  scoreImageUrl = "";
  scoreImage.removeAttribute("src");
  scoreResult.hidden = true;
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
  setStatus("5 分钟已到，正在解除绑定...");

  const response = await fetch("/api/my-aime/remove", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ boundSlotNo }),
  });
  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(result.error || "解除绑定失败。");
  }

  setStatus(`已解除 No.${result.removedSlotNo} 的绑定。`);
}

function scheduleRemove(boundSlotNo, expiresAt) {
  clearRemoveTimers();

  const expiresAtMs = new Date(expiresAt).getTime();

  countdownTimer = setInterval(() => {
    const secondsLeft = Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000));
    setStatus(`绑定完成，已绑定到 No.${boundSlotNo}。将在 ${secondsLeft} 秒后自动解除绑定。`);

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
    setStatus(`当前需要排队，预计 ${secondsLeft} 秒后有空卡槽。`);

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

  setStatus("正在检查卡槽是否需要排队...");

  try {
    const response = await fetch("/api/my-aime/status", {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.error || "无法检查当前排队状态。");
    }

    if (result.state === "ready") {
      clearAvailabilityTimer();
      setStatus("现在可以查询。");
      return;
    }

    if (result.state === "queue" && result.nextAvailableAt) {
      scheduleAvailabilityCountdown(result.nextAvailableAt);
      return;
    }

    setStatus(result.message || "当前没有可用空卡槽。");
  } catch (error) {
    console.warn("Availability check failed:", error);
    setStatus("暂时无法预检排队状态，可以直接输入卡号查询。");
  }
}

function readCsvHeader(response, name) {
  return (response.headers.get(name) || "").split(",").filter(Boolean);
}

accessCodeInput.addEventListener("input", () => {
  accessCodeInput.value = formatAccessCode(accessCodeInput.value);
});

scoreForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const accessCode = normalizeAccessCode(accessCodeInput.value);

  if (!/^\d{20}$/.test(accessCode)) {
    setStatus("卡号需要是 20 位数字。");
    accessCodeInput.focus();
    return;
  }

  isBusy = true;
  queryButton.disabled = true;
  clearAvailabilityTimer();
  clearRemoveTimers();
  clearScoreImage();
  setStatus("正在绑定 Aime 卡并生成日服成绩图...");

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
      throw new Error(result.error || "查询失败。");
    }

    const blob = await response.blob();
    const boundSlotNo = Number(response.headers.get("X-Bound-Slot-No"));
    const alreadyBound = response.headers.get("X-Already-Bound") === "1";
    const expiresAt = response.headers.get("X-Expires-At");
    const removedExpiredSlotNos = readCsvHeader(response, "X-Removed-Expired-Slot-Nos");

    setScoreImage(blob);
    if (alreadyBound) {
      setStatus(`已使用账号内现有绑定卡槽 No.${boundSlotNo} 查询，不会自动解除绑定。`);
      return;
    }

    if (removedExpiredSlotNos.length) {
      setStatus(`已先清理过期卡槽：${removedExpiredSlotNos.join(", ")}。`);
    }

    if (expiresAt) {
      scheduleRemove(boundSlotNo, expiresAt);
    } else {
      setStatus("成绩图已生成。");
    }
  } catch (error) {
    setStatus(error.message);
  } finally {
    isBusy = false;
    queryButton.disabled = false;
  }
});

checkAvailability();
