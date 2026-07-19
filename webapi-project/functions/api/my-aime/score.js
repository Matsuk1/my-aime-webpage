import { bindAimeCard } from "./bind.js";
import { json } from "./_shared.js";

const JIETNG_DEMO_ENDPOINT = "https://jietng-endpoint.matsuk1.com/linebot/demo";
const validCommandTypes = new Set([
  "best50",
  "best40",
  "best35",
  "best15",
  "allb35",
  "allb50",
  "apb50",
  "fdxb50",
  "idlb50",
  "sun50",
]);

function getCredential(env, upperName, lowerName) {
  return env[upperName] || env[lowerName];
}

function normalizeCommandType(value) {
  return validCommandTypes.has(value) ? value : "best50";
}

async function readJietngError(response) {
  const contentType = response.headers.get("Content-Type") || "";

  if (contentType.includes("application/json")) {
    const body = await response.json().catch(() => ({}));
    return body.error || `JiETNG 查询失败，状态码 ${response.status}。`;
  }

  const text = await response.text().catch(() => "");
  return text.trim() || `JiETNG 查询失败，状态码 ${response.status}。`;
}

function jietngError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function queryJietngScore(env, options) {
  const segaId = getCredential(env, "SEGA_ID", "segaid");
  const segaPassword = getCredential(env, "SEGA_PASSWORD", "segapwd");

  if (!segaId || !segaPassword) {
    throw new Error("Missing SEGA_ID or SEGA_PASSWORD environment variables.");
  }

  const form = new FormData();
  form.append("segaid", segaId);
  form.append("password", segaPassword);
  form.append("ver", "jp");
  form.append("aime", String(options.aimeIndex));
  form.append("timezone", String(options.timezone ?? 9));
  form.append("cmd_type", normalizeCommandType(options.cmdType));
  form.append("params", String(options.params || ""));

  const response = await fetch(JIETNG_DEMO_ENDPOINT, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(55000),
  });

  if (!response.ok) {
    const message =
      response.status === 504
        ? "JiETNG 生成成绩图超时，请稍后重试。"
        : await readJietngError(response);
    throw jietngError(message, response.status);
  }

  return response.arrayBuffer();
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    const bindResult = await bindAimeCard(env, request, body.accessCode);

    if (!bindResult.ok) {
      const { slots, ...safeBindResult } = bindResult;
      return json(safeBindResult, bindResult.status || 500);
    }

    let imageBuffer;

    try {
      imageBuffer = await queryJietngScore(env, {
        aimeIndex: bindResult.boundSlotNo - 1,
        timezone: body.timezone,
        cmdType: body.cmdType,
        params: body.params,
      });
    } catch (error) {
      const status = error.name === "TimeoutError" ? 504 : error.status || 502;
      return json(
        {
          ok: false,
          error:
            status === 504
              ? "JiETNG 生成成绩图超时，请稍后重试。"
              : error.message,
          boundSlotNo: bindResult.boundSlotNo,
          alreadyBound: bindResult.alreadyBound,
          session: bindResult.session,
          removedExpiredSlotNos: bindResult.removedExpiredSlotNos,
        },
        status,
        bindResult.sessionCookie ? { "Set-Cookie": bindResult.sessionCookie } : {},
      );
    }

    const headers = {
      "Cache-Control": "no-store",
      "Content-Type": "image/png",
      "X-Bound-Slot-No": String(bindResult.boundSlotNo),
      "X-Already-Bound": bindResult.alreadyBound ? "1" : "0",
      "X-Removed-Expired-Slot-Nos": bindResult.removedExpiredSlotNos.join(","),
    };

    if (bindResult.sessionCookie && bindResult.session?.expiresAt) {
      headers["Set-Cookie"] = bindResult.sessionCookie;
      headers["X-Expires-At"] = bindResult.session.expiresAt;
    }

    return new Response(imageBuffer, {
      status: 200,
      headers,
    });
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
