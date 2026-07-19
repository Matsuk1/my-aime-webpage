import {
  defaultHeaders,
  createSessionCookie,
  findErrorMessage,
  fetchMyAimeHome,
  fetchWithCookies,
  followRedirects,
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

export async function removeExpiredTimestampSlots(cookieJar, home) {
  const expiredSlots = home.slots.filter(
    (slot) =>
      slot.registered &&
      slot.blockId &&
      slot.aliasTimestamp &&
      Date.now() - slot.aliasTimestamp >= sessionMaxAgeMs,
  );

  for (const slot of expiredSlots) {
    await removeSlotByBlockId(cookieJar, slot);
  }

  return expiredSlots;
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

  const { cookieJar, final } = await loginSession(env);
  let homeBefore = await fetchMyAimeHome(cookieJar, final);
  const alreadyBoundSlot = homeBefore.slots.find((slot) => slotContainsAccessCode(slot, normalizedAccessCode));

  if (alreadyBoundSlot) {
    return {
      ok: true,
      status: 200,
      boundSlotNo: alreadyBoundSlot.slotNo,
      alreadyBound: true,
      removedExpiredSlotNos: [],
      slots: homeBefore.slots,
    };
  }

  const removedExpiredSlots = await removeExpiredTimestampSlots(cookieJar, homeBefore);

  if (removedExpiredSlots.length > 0) {
    homeBefore = await fetchMyAimeHome(cookieJar);
  }

  const emptySlot = homeBefore.slots.find((slot) => !slot.registered);

  if (!emptySlot) {
    return {
      ok: false,
      status: 409,
      error: "没有可绑定的空卡槽。",
      slots: homeBefore.slots,
    };
  }

  const slotIndex = emptySlot.slotNo - 1;
  const inputUrl = `${ADD_INPUT_URL}?slotNo=${slotIndex}`;
  const inputResponse = await fetchWithCookies(
    inputUrl,
    {
      method: "GET",
      headers: defaultHeaders,
    },
    cookieJar,
  );
  const inputHtml = await inputResponse.text();
  const inputForm = parseFirstForm(inputHtml);
  const confirmUrl = resolveLocation(inputForm.action, inputUrl) || ADD_CONFIRM_URL;
  const aliasTimestamp = String(Date.now());

  const confirmResponse = await postForm(
    confirmUrl,
    formBodyFromInputs(inputForm.inputs, {
      slotNo: String(slotIndex),
      accessCode: normalizedAccessCode,
      comment: aliasTimestamp,
      regist: "",
    }),
    inputUrl,
    cookieJar,
  );
  const confirmRedirect = resolveLocation(confirmResponse.headers.get("location"), confirmUrl);
  const confirmFinal = confirmRedirect
    ? await followRedirects(confirmRedirect, cookieJar)
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
      accessCode: normalizedAccessCode,
      comment: aliasTimestamp,
      regist: "",
    }),
    confirmFinal.finalUrl,
    cookieJar,
  );

  const doneRedirect = resolveLocation(doneResponse.headers.get("location"), doneUrl);
  if (doneRedirect) {
    await followRedirects(doneRedirect, cookieJar);
  } else {
    await doneResponse.text();
  }

  const homeAfter = await fetchMyAimeHome(cookieJar);
  const session = await createSessionCookie(env, request, cookieJar);

  return {
    ok: true,
    status: doneResponse.status,
    boundSlotNo: emptySlot.slotNo,
    alreadyBound: false,
    aliasTimestamp,
    removedExpiredSlotNos: removedExpiredSlots.map((slot) => slot.slotNo),
    session: {
      expiresAt: session.expiresAt,
      maxAgeSeconds: session.maxAgeSeconds,
    },
    sessionCookie: session.header,
    slots: homeAfter.slots,
  };
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await bindAimeCard(env, request, body.accessCode);
    const { sessionCookie, ...responseBody } = result;
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
