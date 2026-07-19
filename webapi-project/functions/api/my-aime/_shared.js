export const LOGIN_URL =
  "https://tgk-aime-gw.sega.jp/common_auth/login?site_id=aimess&redirect_url=https%3A%2F%2Fmy-aime.net%2Flogin%2Fauth%2Fcauth";
export const LOGIN_POST_URL = "https://tgk-aime-gw.sega.jp/common_auth/login/sid";
export const MY_AIME_URL = "https://my-aime.net/";

export const defaultHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
};

const sessionCookieName = "my_aime_session";
const sessionMaxAgeSeconds = 300;
export const sessionMaxAgeMs = sessionMaxAgeSeconds * 1000;

export function json(data, status = 200, headers = {}) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

function base64UrlEncode(bytes) {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function sessionKey(env) {
  const secret = env.SESSION_SECRET;

  if (!secret) {
    throw new Error("Missing SESSION_SECRET environment variable.");
  }

  const secretHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", secretHash, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function createSessionCookie(env, request, cookieJar) {
  const expiresAt = new Date(Date.now() + sessionMaxAgeSeconds * 1000);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await sessionKey(env);
  const payload = new TextEncoder().encode(
    JSON.stringify({
      expiresAt: expiresAt.toISOString(),
      cookies: [...cookieJar.entries()],
    }),
  );
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, payload));
  const token = `${base64UrlEncode(iv)}.${base64UrlEncode(encrypted)}`;
  const secure = new URL(request.url).protocol === "https:" ? " Secure;" : "";

  return {
    expiresAt: expiresAt.toISOString(),
    maxAgeSeconds: sessionMaxAgeSeconds,
    header: `${sessionCookieName}=${token}; Max-Age=${sessionMaxAgeSeconds}; Expires=${expiresAt.toUTCString()}; HttpOnly;${secure} SameSite=Strict; Path=/`,
  };
}

export async function readSessionCookie(env, request) {
  const cookieHeaderValue = request.headers.get("Cookie") || "";
  const cookieMatch = cookieHeaderValue
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${sessionCookieName}=`));

  if (!cookieMatch) {
    return null;
  }

  const token = cookieMatch.slice(sessionCookieName.length + 1);
  const [ivValue, encryptedValue] = token.split(".");

  if (!ivValue || !encryptedValue) {
    return null;
  }

  try {
    const key = await sessionKey(env);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64UrlDecode(ivValue) },
      key,
      base64UrlDecode(encryptedValue),
    );
    const payload = JSON.parse(new TextDecoder().decode(decrypted));

    if (!payload.expiresAt || Date.now() > new Date(payload.expiresAt).getTime()) {
      return null;
    }

    return {
      expiresAt: payload.expiresAt,
      cookieJar: new Map(payload.cookies || []),
    };
  } catch {
    return null;
  }
}

export function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function findErrorMessage(html) {
  const formErrorMatch = html.match(
    /<div[^>]*class=["'][^"']*c-form__error[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  );

  if (formErrorMatch) {
    return stripTags(formErrorMatch[1]);
  }

  const errorMatch = html.match(
    /<(?:p|div|li|span)[^>]*class=["'][^"']*(?:error|alert)[^"']*["'][^>]*>([\s\S]*?)<\/(?:p|div|li|span)>/i,
  );

  if (errorMatch) {
    return stripTags(errorMatch[1]);
  }

  const text = stripTags(html);
  const knownMessages = [
    "このアクセスコードはこのアカウントにすでに登録されています。",
    "アクセスコードが間違っています。",
  ].filter((message) => text.includes(message));
  const errorNoMatch = text.match(/\(エラーNo\.\s*[^)]+\)/);

  if (knownMessages.length > 0 || errorNoMatch) {
    return [...knownMessages, errorNoMatch?.[0]].filter(Boolean).join(" ");
  }

  return "";
}

export function getAttribute(html, name) {
  const match = html.match(new RegExp(`${name}=["']([^"']+)["']`, "i"));
  return match?.[1] || "";
}

export function resolveLocation(location, baseUrl) {
  if (!location) {
    return null;
  }

  return new URL(location, baseUrl).toString();
}

export function parseInputs(html) {
  const inputs = html.match(/<input\b[^>]*>/gi) || [];

  return inputs
    .map((input) => ({
      name: getAttribute(input, "name"),
      type: getAttribute(input, "type") || "text",
      value: getAttribute(input, "value"),
    }))
    .filter((input) => input.name);
}

export function parseFirstForm(html) {
  const formHtml = html.match(/<form\b[\s\S]*?<\/form>/i)?.[0] || "";
  const formStart = formHtml.match(/<form\b[^>]*>/i)?.[0] || "";

  return {
    html: formHtml,
    action: getAttribute(formStart, "action"),
    method: (getAttribute(formStart, "method") || "get").toUpperCase(),
    inputs: parseInputs(formHtml),
  };
}

export function parseAimeSlots(html) {
  const targetMatch = html.match(
    /<ul[^>]*class=["'][^"']*c-myaime__target[^"']*["'][^>]*>([\s\S]*?)<\/ul>/i,
  );
  const targetHtml = targetMatch?.[1] || "";
  const itemMatches = targetHtml.match(/<li\b[\s\S]*?<\/li>/gi) || [];

  return itemMatches.slice(0, 3).map((itemHtml, index) => {
    const className = getAttribute(itemHtml, "class");
    const slotMatch = itemHtml.match(/No\.(\d+)/i);
    const registerMatch = itemHtml.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>\s*登録する\s*<\/a>/i);
    const blockIdMatch = itemHtml.match(/<input\b[^>]*name=["']blockId["'][^>]*value=["']([^"']+)["'][^>]*>/i);
    const text = stripTags(itemHtml);
    const isUnregistered = text.includes("Aimeカードが未登録です");
    const timestampMatch = text.match(/\b(1[6-9]\d{11}|2\d{12})\b/);
    const aliasTimestamp = timestampMatch ? Number(timestampMatch[1]) : null;

    return {
      slotNo: slotMatch ? Number(slotMatch[1]) : index + 1,
      visible: className.includes("isShow"),
      registered: !isUnregistered,
      statusText: isUnregistered ? "Aime卡未注册" : text || "已注册",
      registerUrl: registerMatch?.[1] || null,
      blockId: blockIdMatch?.[1] || null,
      aliasTimestamp,
    };
  });
}

function getSetCookie(headers) {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const cookie = headers.get("set-cookie");
  return cookie ? [cookie] : [];
}

function addCookies(cookieJar, response) {
  for (const setCookie of getSetCookie(response.headers)) {
    const cookiePair = setCookie.split(";")[0];
    const separatorIndex = cookiePair.indexOf("=");

    if (separatorIndex > 0) {
      cookieJar.set(cookiePair.slice(0, separatorIndex), cookiePair.slice(separatorIndex + 1));
    }
  }
}

function cookieHeader(cookieJar) {
  return [...cookieJar.entries()]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

export async function fetchWithCookies(url, options, cookieJar) {
  const headers = new Headers(options.headers || {});
  const cookies = cookieHeader(cookieJar);

  if (cookies) {
    headers.set("Cookie", cookies);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    redirect: "manual",
  });

  addCookies(cookieJar, response);
  return response;
}

export async function followRedirects(startUrl, cookieJar, maxRedirects = 8) {
  let currentUrl = startUrl;
  let response = null;

  for (let index = 0; index < maxRedirects; index += 1) {
    response = await fetchWithCookies(
      currentUrl,
      {
        method: "GET",
        headers: defaultHeaders,
      },
      cookieJar,
    );

    if (response.status < 300 || response.status >= 400) {
      return { response, finalUrl: currentUrl };
    }

    const nextUrl = resolveLocation(response.headers.get("location"), currentUrl);
    if (!nextUrl) {
      return { response, finalUrl: currentUrl };
    }

    currentUrl = nextUrl;
  }

  return { response, finalUrl: currentUrl };
}

export async function loginSession(env) {
  const segaId = env.SEGA_ID || env.segaid;
  const segaPassword = env.SEGA_PASSWORD || env.segapwd;

  if (!segaId || !segaPassword) {
    throw new Error("Missing SEGA_ID or SEGA_PASSWORD environment variables.");
  }

  const cookieJar = new Map();

  const loginPage = await fetchWithCookies(
    LOGIN_URL,
    {
      method: "GET",
      headers: defaultHeaders,
    },
    cookieJar,
  );

  if (!loginPage.ok) {
    throw new Error(`Could not open login page. Status: ${loginPage.status}`);
  }

  const loginResponse = await fetchWithCookies(
    LOGIN_POST_URL,
    {
      method: "POST",
      headers: {
        ...defaultHeaders,
        Origin: "https://tgk-aime-gw.sega.jp",
        Referer: LOGIN_URL,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        retention: "0",
        sid: segaId,
        password: segaPassword,
      }),
    },
    cookieJar,
  );

  const redirectUrl = resolveLocation(loginResponse.headers.get("location"), LOGIN_POST_URL);
  const final = redirectUrl
    ? await followRedirects(redirectUrl, cookieJar)
    : { response: loginResponse, finalUrl: LOGIN_POST_URL };

  return {
    cookieJar,
    final,
  };
}

export async function fetchMyAimeHome(cookieJar, final) {
  const response =
    final?.response?.ok && final.finalUrl === MY_AIME_URL
      ? final.response
      : await fetchWithCookies(
          MY_AIME_URL,
          {
            method: "GET",
            headers: defaultHeaders,
          },
          cookieJar,
        );

  const html = await response.text();

  return {
    response,
    html,
    slots: parseAimeSlots(html),
  };
}
