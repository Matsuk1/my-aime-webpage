import { fetchMyAimeHome, json, loginSession, sessionMaxAgeMs } from "./_shared.js";

function getQueueState(slots) {
  const emptySlotCount = slots.filter((slot) => !slot.registered).length;

  if (emptySlotCount > 0) {
    return {
      state: "ready",
      emptySlotCount,
      message: "现在可以查询。",
    };
  }

  const activeTemporarySlots = slots
    .filter((slot) => slot.registered && slot.aliasTimestamp)
    .map((slot) => ({
      slotNo: slot.slotNo,
      expiresAtMs: slot.aliasTimestamp + sessionMaxAgeMs,
    }))
    .filter((slot) => slot.expiresAtMs > Date.now())
    .sort((a, b) => a.expiresAtMs - b.expiresAtMs);

  if (activeTemporarySlots.length > 0) {
    return {
      state: "queue",
      emptySlotCount: 0,
      nextAvailableAt: new Date(activeTemporarySlots[0].expiresAtMs).toISOString(),
      message: "当前临时卡槽都在使用，需要等待。",
    };
  }

  return {
    state: "full",
    emptySlotCount: 0,
    message: "当前没有可用空卡槽。",
  };
}

export async function onRequestGet({ env }) {
  try {
    const { cookieJar, final } = await loginSession(env);
    const home = await fetchMyAimeHome(cookieJar, final);

    return json({
      ok: true,
      ...getQueueState(home.slots),
    });
  } catch (error) {
    return json(
      {
        ok: true,
        state: "unknown",
        message: "暂时无法预检排队状态，可以直接输入卡号查询。",
      },
      200,
    );
  }
}

export async function onRequest() {
  return json({ ok: false, error: "Method not allowed." }, 405);
}
