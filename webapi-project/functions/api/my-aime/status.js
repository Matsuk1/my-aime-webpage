import { fetchMyAimeHome, getSegaAccounts, json, loginSession, sessionMaxAgeMs } from "./_shared.js";
import { removeExpiredTimestampSlots } from "./bind.js";

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

function mergeQueueStates(states) {
  const readyState = states.find((state) => state.state === "ready");

  if (readyState) {
    return {
      state: "ready",
      emptySlotCount: states.reduce((total, state) => total + (state.emptySlotCount || 0), 0),
      replaceableSlotCount: states.reduce((total, state) => total + (state.replaceableSlotCount || 0), 0),
      accountCount: states.length,
    };
  }

  const queuedStates = states
    .filter((state) => state.state === "queue" && state.nextAvailableAt)
    .sort((a, b) => new Date(a.nextAvailableAt).getTime() - new Date(b.nextAvailableAt).getTime());

  if (queuedStates.length > 0) {
    return {
      state: "queue",
      emptySlotCount: 0,
      nextAvailableAt: queuedStates[0].nextAvailableAt,
      accountCount: states.length,
    };
  }

  return {
    state: "full",
    emptySlotCount: 0,
    accountCount: states.length,
  };
}

export async function onRequestGet({ env }) {
  try {
    const states = [];
    const removedExpiredSlotNos = [];
    let lastAccountError = null;

    for (const account of getSegaAccounts(env)) {
      try {
        const { cookieJar, final } = await loginSession(env, account);
        let home = await fetchMyAimeHome(cookieJar, final);
        const removedExpiredSlots = await removeExpiredTimestampSlots(cookieJar, home);

        if (removedExpiredSlots.length > 0) {
          removedExpiredSlotNos.push(...removedExpiredSlots.map((slot) => slot.slotNo));
          home = await fetchMyAimeHome(cookieJar);
        }

        states.push(getQueueState(home.slots));
      } catch (error) {
        lastAccountError = error;
      }
    }

    if (states.length === 0 && lastAccountError) {
      throw lastAccountError;
    }

    return json({
      ok: true,
      removedExpiredSlotNos,
      ...mergeQueueStates(states),
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
