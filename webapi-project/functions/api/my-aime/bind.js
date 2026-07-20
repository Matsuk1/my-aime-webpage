import {
  defaultHeaders,
  createSessionCookie,
  findErrorMessage,
  fetchMyAimeHome,
  fetchWithCookies,
  followRedirects,
  getSegaAccounts,
  json,
  loginSession,
  parseFirstForm,
  resolveLocation,
  sessionMaxAgeMs,
} from "./_shared.js";

const ADD_INPUT_URL = "https://my-aime.net/myaime/add/input";
const ADD_CONFIRM_URL = "https://my-aime.net/myaime/add/confirm";
const PROC_SWITCH_URL = "https://my-aime.net/myaime/procswitch";

function normalizeAccessCode(value) {
  return String(value || "").replace(/\D/g, "");
}

function formBodyFromInputs(inputs, overrides = {}) {
  const body = new URLSearchParams();

  for (const input of inputs) {
    if (input.type.toLowerCase() === "submit") {
      continue;
    }

    body.set(input.name, overrides[input.name] ?? input.value ?? "");
  }

  for (const [name, value] of Object.entries(overrides)) {
    body.set(name, value);
  }

  return body;
}

async function postForm(url, body, referer, cookieJar) {
  return fetchWithCookies(
    url,
    {
      method: "POST",
      headers: {
        ...defaultHeaders,
        Origin: "https://my-aime.net",
        Referer: referer,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
    cookieJar,
  );
}

async function removeSlotByBlockId(cookieJar, slot) {
  const confirmResponse = await postForm(
    PROC_SWITCH_URL,
    new URLSearchParams({
      blockId: slot.blockId,
      redirect: "remove/confirm",
    }),
    "https://my-aime.net/",
    cookieJar,
  );
  const confirmRedirect = resolveLocation(confirmResponse.headers.get("location"), PROC_SWITCH_URL);
  const confirmFinal = confirmRedirect
    ? await followRedirects(confirmRedirect, cookieJar)
    : { response: confirmResponse, finalUrl: PROC_SWITCH_URL };
  const confirmHtml = await confirmFinal.response.text();
  const confirmForm = parseFirstForm(confirmHtml);

  if (!confirmForm.action) {
    const confirmError = findErrorMessage(confirmHtml);
    throw new Error(confirmError || "没有找到删除确认表单。");
  }

  const doneUrl = resolveLocation(confirmForm.action, confirmFinal.finalUrl);
  const doneResponse = await postForm(
    doneUrl,
    formBodyFromInputs(confirmForm.inputs, {
      blockId: slot.blockId,
    }),
    confirmFinal.finalUrl,
    cookieJar,
  );
  const doneRedirect = resolveLocation(doneResponse.headers.get("location"), doneUrl);

  if (doneRedirect) {
    const doneFinal = await followRedirects(doneRedirect, cookieJar);
    const doneHtml = await doneFinal.response.text();
    const doneError = findErrorMessage(doneHtml);

    if (doneError) {
      throw new Error(doneError);
    }
  } else {
    const doneHtml = await doneResponse.text();
    const doneError = findErrorMessage(doneHtml);

    if (doneError) {
      throw new Error(doneError);
    }
  }
}

function slotContainsAccessCode(slot, accessCode) {
  return slot.registered && slot.blockId && slot.statusText.replace(/\D/g, "").includes(accessCode);
}

function findExpiredTimestampSlots(slots) {
  return slots
    .filter(
      (slot) =>
        slot.registered &&
        slot.blockId &&
        slot.aliasTimestamp &&
        Date.now() - slot.aliasTimestamp >= sessionMaxAgeMs,
    )
    .sort((a, b) => a.aliasTimestamp - b.aliasTimestamp);
}

function nextTemporarySlotAvailableAt(slots) {
  const activeTemporarySlots = slots
    .filter((slot) => slot.registered && slot.aliasTimestamp)
    .map((slot) => slot.aliasTimestamp + sessionMaxAgeMs)
    .filter((expiresAtMs) => expiresAtMs > Date.now())
    .sort((a, b) => a - b);

  return activeTemporarySlots[0] || null;
}

export async function replaceExpiredTimestampSlotWhenFull(cookieJar, home) {
  if (home.slots.some((slot) => !slot.registered)) {
    return null;
  }

  const [expiredSlot] = findExpiredTimestampSlots(home.slots);

  if (!expiredSlot) {
    return null;
  }

  await removeSlotByBlockId(cookieJar, expiredSlot);
  return expiredSlot;
}

async function bindAimeCardWithSession(env, request, accessCode, session, homeBefore) {
  const alreadyBoundSlot = homeBefore.slots.find((slot) => slotContainsAccessCode(slot, accessCode));

  if (alreadyBoundSlot) {
    return {
      ok: true,
      status: 200,
      account: session.account,
      boundSlotNo: alreadyBoundSlot.slotNo,
      alreadyBound: true,
      removedExpiredSlotNos: [],
      slots: homeBefore.slots,
    };
  }

  let replacedExpiredSlot = null;
  let emptySlot = homeBefore.slots.find((slot) => !slot.registered);

  if (!emptySlot) {
    replacedExpiredSlot = await replaceExpiredTimestampSlotWhenFull(session.cookieJar, homeBefore);
  }

  if (replacedExpiredSlot) {
    homeBefore = await fetchMyAimeHome(session.cookieJar);
    emptySlot = homeBefore.slots.find((slot) => !slot.registered);
  }

  if (!emptySlot) {
    return null;
  }

  const slotIndex = emptySlot.slotNo - 1;
  const inputUrl = `${ADD_INPUT_URL}?slotNo=${slotIndex}`;
  const inputResponse = await fetchWithCookies(
    inputUrl,
    {
      method: "GET",
      headers: defaultHeaders,
    },
    session.cookieJar,
  );
  const inputHtml = await inputResponse.text();
  const inputForm = parseFirstForm(inputHtml);
  const confirmUrl = resolveLocation(inputForm.action, inputUrl) || ADD_CONFIRM_URL;
  const aliasTimestamp = String(Date.now());

  const confirmResponse = await postForm(
    confirmUrl,
    formBodyFromInputs(inputForm.inputs, {
      slotNo: String(slotIndex),
      accessCode,
      comment: aliasTimestamp,
      regist: "",
    }),
    inputUrl,
    session.cookieJar,
  );
  const confirmRedirect = resolveLocation(confirmResponse.headers.get("location"), confirmUrl);
  const confirmFinal = confirmRedirect
    ? await followRedirects(confirmRedirect, session.cookieJar)
    : { response: confirmResponse, finalUrl: confirmUrl };
  const confirmHtml = await confirmFinal.response.text();
  const confirmError = findErrorMessage(confirmHtml);

  if (confirmError) {
    return {
      ok: false,
      status: 422,
      error: confirmError,
      slots: homeBefore.slots,
    };
  }

  const confirmForm = parseFirstForm(confirmHtml);

  if (!confirmForm.action) {
    const fallbackError = findErrorMessage(confirmHtml);

    return {
      ok: false,
      status: fallbackError ? 422 : 502,
      error: fallbackError || "没有找到绑定确认表单。",
      slots: homeBefore.slots,
    };
  }

  const doneUrl = resolveLocation(confirmForm.action, confirmFinal.finalUrl);
  const doneResponse = await postForm(
    doneUrl,
    formBodyFromInputs(confirmForm.inputs, {
      slotNo: String(slotIndex),
      accessCode,
      comment: aliasTimestamp,
      regist: "",
    }),
    confirmFinal.finalUrl,
    session.cookieJar,
  );

  const doneRedirect = resolveLocation(doneResponse.headers.get("location"), doneUrl);
  if (doneRedirect) {
    await followRedirects(doneRedirect, session.cookieJar);
  } else {
    await doneResponse.text();
  }

  const homeAfter = await fetchMyAimeHome(session.cookieJar);
  const createdSession = await createSessionCookie(env, request, session.cookieJar);

  return {
    ok: true,
    status: doneResponse.status,
    account: session.account,
    boundSlotNo: emptySlot.slotNo,
    alreadyBound: false,
    aliasTimestamp,
    removedExpiredSlotNos: replacedExpiredSlot ? [replacedExpiredSlot.slotNo] : [],
    session: {
      expiresAt: createdSession.expiresAt,
      maxAgeSeconds: createdSession.maxAgeSeconds,
    },
    sessionCookie: createdSession.header,
    slots: homeAfter.slots,
  };
}

export async function bindAimeCard(env, request, accessCode) {
  const normalizedAccessCode = normalizeAccessCode(accessCode);

  if (!/^\d{20}$/.test(normalizedAccessCode)) {
    return {
      ok: false,
      status: 400,
      error: "卡号需要是 20 位数字。",
    };
  }

  const accounts = getSegaAccounts(env);
  let nextAvailableAtMs = null;
  let lastSlots = [];
  let checkedAccountCount = 0;
  let lastAccountError = null;

  for (const account of accounts) {
    let session;
    let homeBefore;

    try {
      session = await loginSession(env, account);
      homeBefore = await fetchMyAimeHome(session.cookieJar, session.final);
    } catch (error) {
      lastAccountError = error;
      continue;
    }

    checkedAccountCount += 1;

    let result;

    try {
      result = await bindAimeCardWithSession(env, request, normalizedAccessCode, session, homeBefore);
    } catch (error) {
      lastAccountError = error;
      continue;
    }

    if (result) {
      return result;
    }

    lastSlots = homeBefore.slots;
    const accountNextAvailableAtMs = nextTemporarySlotAvailableAt(homeBefore.slots);

    if (accountNextAvailableAtMs && (!nextAvailableAtMs || accountNextAvailableAtMs < nextAvailableAtMs)) {
      nextAvailableAtMs = accountNextAvailableAtMs;
    }
  }

  if (checkedAccountCount === 0 && lastAccountError) {
    throw lastAccountError;
  }

  return {
    ok: false,
    status: 409,
    errorCode: "NO_AVAILABLE_SLOT",
    error: "没有可绑定的空卡槽。",
    nextAvailableAt: nextAvailableAtMs ? new Date(nextAvailableAtMs).toISOString() : null,
    slots: lastSlots,
  };
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await bindAimeCard(env, request, body.accessCode);
    const { account, sessionCookie, ...responseBody } = result;
    const headers = sessionCookie ? { "Set-Cookie": sessionCookie } : {};

    return json(responseBody, result.ok ? 200 : result.status || 500, headers);
  } catch (error) {
    return json(
      {
        ok: false,
        error: error.message,
      },
      500,
    );
  }
}

export async function onRequest() {
  return json({ ok: false, error: "Method not allowed." }, 405);
}
