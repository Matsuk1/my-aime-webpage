import { fetchMyAimeHome, json, loginSession, sessionMaxAgeMs } from "./_shared.js";

function getQueueState(slots) {
  const emptySlotCount = slots.filter((slot) => !slot.registered).length;

  if (emptySlotCount > 0) {
    return {
      state: "ready",
      emptySlotCount,
    };
  }

  const temporarySlots = slots
    .filter((slot) => slot.registered && slot.aliasTimestamp)
    .map((slot) => ({
      slotNo: slot.slotNo,
      expiresAtMs: slot.aliasTimestamp + sessionMaxAgeMs,
    }));
  const expiredTemporarySlots = temporarySlots.filter((slot) => slot.expiresAtMs <= Date.now());

  if (expiredTemporarySlots.length > 0) {
    return {
      state: "ready",
      emptySlotCount: 0,
      replaceableSlotCount: expiredTemporarySlots.length,
    };
  }

  const activeTemporarySlots = temporarySlots
    .filter((slot) => slot.expiresAtMs > Date.now())
    .sort((a, b) => a.expiresAtMs - b.expiresAtMs);

  if (activeTemporarySlots.length > 0) {
    return {
      state: "queue",
      emptySlotCount: 0,
      nextAvailableAt: new Date(activeTemporarySlots[0].expiresAtMs).toISOString(),
    };
  }

  return {
    state: "full",
    emptySlotCount: 0,
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
      },
      200,
    );
  }
}

export async function onRequest() {
  return json({ ok: false, error: "Method not allowed." }, 405);
}
