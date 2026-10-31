import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  isUsingDevPassword,
  passwordMatches,
  resolveAdminCredentials,
  sessionKey,
  SESSION_TTL_SECONDS,
  verifySessionToken,
} from "@/server/auth/token";
import { sniffImageType } from "@/server/images";

const key = sessionKey("a".repeat(40), "correct horse");

describe("session tokens", () => {
  it("verifies a fresh token", () => {
    expect(verifySessionToken(createSessionToken(key), key)).toBe(true);
  });

  it("rejects tampered, malformed and expired tokens", () => {
    const token = createSessionToken(key);
    const [data, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "admin", exp: 9_999_999_999 })).toString("base64url");
    expect(verifySessionToken(`${forged}.${sig}`, key)).toBe(false);
    expect(verifySessionToken(`${data}.${sig}x`, key)).toBe(false);
    expect(verifySessionToken(`${token}.extra`, key)).toBe(false);
    expect(verifySessionToken(undefined, key)).toBe(false);
    const later = Date.now() + (SESSION_TTL_SECONDS + 1) * 1000;
    expect(verifySessionToken(token, key, later)).toBe(false);
  });

  it("signs everyone out when the password changes", () => {
    const token = createSessionToken(key);
    expect(verifySessionToken(token, sessionKey("a".repeat(40), "new password"))).toBe(false);
  });

  it("compares passwords exactly", () => {
    expect(passwordMatches("secret", "secret")).toBe(true);
    expect(passwordMatches("secret ", "secret")).toBe(false);
  });
});

describe("admin credentials", () => {
  it("uses a development fallback only outside production", () => {
    expect(resolveAdminCredentials({ NODE_ENV: "development" })?.password).toBe("admin");
    expect(isUsingDevPassword({ NODE_ENV: "development" })).toBe(true);
    expect(resolveAdminCredentials({ NODE_ENV: "production" })).toBeNull();
    expect(resolveAdminCredentials({ NODE_ENV: "production", ADMIN_PASSWORD: "longpassword" })).toBeNull();
    expect(resolveAdminCredentials({ NODE_ENV: "production", ADMIN_PASSWORD: "longpassword", SESSION_SECRET: "s".repeat(32) })?.password).toBe(
      "longpassword",
    );
  });
});

describe("sniffImageType", () => {
  const bytes = (...values: (number | string)[]) =>
    new Uint8Array(values.flatMap((v) => (typeof v === "string" ? [...v].map((c) => c.charCodeAt(0)) : [v])).concat(Array(16).fill(0)));

  it("recognises the supported formats by their signature", () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffImageType(bytes(0x89, "PNG", 0x0d, 0x0a))).toBe("image/png");
    expect(sniffImageType(bytes("GIF89a"))).toBe("image/gif");
    expect(sniffImageType(bytes("RIFF", 0, 0, 0, 0, "WEBP"))).toBe("image/webp");
    expect(sniffImageType(bytes(0, 0, 0, 0x1c, "ftypavif"))).toBe("image/avif");
  });

  it("rejects SVG, HTML and anything else", () => {
    expect(sniffImageType(bytes('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull();
    expect(sniffImageType(bytes("<!doctype html><script>"))).toBeNull();
    expect(sniffImageType(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });
});
