import {
  defaultHeaders,
  findErrorMessage,
  fetchMyAimeHome,
  fetchWithCookies,
  followRedirects,
  json,
  loginSession,
  parseFirstForm,
  readSessionCookie,
  resolveLocation,
} from "./_shared.js";

const PROC_SWITCH_URL = "https://my-aime.net/myaime/procswitch";

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

async function sessionOrLogin(env, request) {
  const session = await readSessionCookie(env, request);

  if (session) {
    return {
      cookieJar: session.cookieJar,
      final: null,
      reusedSession: true,
    };
  }

  return {
    ...(await loginSession(env)),
    reusedSession: false,
  };
}

async function removeAimeCard(env, request, slotNo) {
  const session = await sessionOrLogin(env, request);
  const homeBefore = await fetchMyAimeHome(session.cookieJar, session.final);
  const targetSlot =
    homeBefore.slots.find((slot) => slot.slotNo === slotNo && slot.registered) ||
    homeBefore.slots.find((slot) => slot.registered);

  if (!targetSlot?.blockId) {
    return {
      ok: false,
      status: 404,
      error: "没有找到可删除的已绑定卡槽。",
      slots: homeBefore.slots,
    };
  }

  const confirmResponse = await postForm(
    PROC_SWITCH_URL,
    new URLSearchParams({
      blockId: targetSlot.blockId,
      redirect: "remove/confirm",
    }),
    "https://my-aime.net/",
    session.cookieJar,
  );
  const confirmRedirect = resolveLocation(confirmResponse.headers.get("location"), PROC_SWITCH_URL);
  const confirmFinal = confirmRedirect
    ? await followRedirects(confirmRedirect, session.cookieJar)
    : { response: confirmResponse, finalUrl: PROC_SWITCH_URL };
  const confirmHtml = await confirmFinal.response.text();
  const confirmForm = parseFirstForm(confirmHtml);

  if (!confirmForm.action) {
    const fallbackError = findErrorMessage(confirmHtml);

    return {
      ok: false,
      status: fallbackError ? 422 : 502,
      error: fallbackError || "没有找到删除确认表单。",
      slots: homeBefore.slots,
    };
  }

  const doneUrl = resolveLocation(confirmForm.action, confirmFinal.finalUrl);
  const doneResponse = await postForm(
    doneUrl,
    formBodyFromInputs(confirmForm.inputs, {
      blockId: targetSlot.blockId,
    }),
    confirmFinal.finalUrl,
    session.cookieJar,
  );
  const doneRedirect = resolveLocation(doneResponse.headers.get("location"), doneUrl);

  if (doneRedirect) {
    const doneFinal = await followRedirects(doneRedirect, session.cookieJar);
    const doneHtml = await doneFinal.response.text();
    const doneError = findErrorMessage(doneHtml);

    if (doneError) {
      return {
        ok: false,
        status: 422,
        error: doneError,
        slots: homeBefore.slots,
      };
    }
  } else {
    const doneHtml = await doneResponse.text();
    const doneError = findErrorMessage(doneHtml);

    if (doneError) {
      return {
        ok: false,
        status: 422,
        error: doneError,
        slots: homeBefore.slots,
      };
    }
  }

  const homeAfter = await fetchMyAimeHome(session.cookieJar);

  return {
    ok: true,
    status: doneResponse.status,
    removedSlotNo: targetSlot.slotNo,
    reusedSession: session.reusedSession,
    slots: homeAfter.slots,
  };
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    const slotNo = Number(body.boundSlotNo || body.slotNo || 0);
    const result = await removeAimeCard(env, request, slotNo);

    return json(result, result.ok ? 200 : result.status || 500);
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
