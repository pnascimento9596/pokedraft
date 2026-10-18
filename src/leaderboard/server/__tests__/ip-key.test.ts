import { describe, expect, it } from "vitest";
import { hashIp } from "../handlers";

const SECRET = "test-secret-0123456789abcdef01234567";

// Literals from `printf '%s' <key> | openssl dgst -sha256 -hmac <SECRET>`, not from the code.
const V6_2001_DB8_1_2 = "1ca97fdb744d33526ee43120fa61244e77d786ab222757ea69df3835f6a5dc10";
const V4_203_0_113_7 = "a3f44a585b68d73be09a10c3fd364c23d94fe2b7490b49b357357502e71a5edd";
const V4_198_51_100_1 = "08132e53f74181387910c31bcdaf902851d490930f8fe04d93672ad2702551c0";

describe("hashIp keys IPv6 by its /64 (catches SE-12, every address of one client getting its own bucket)", () => {
  it("hashes every spelling of an address in 2001:db8:1:2::/64 to the /64 key", () => {
    for (const ip of [
      "2001:db8:1:2::1",
      "2001:db8:1:2:ffff:ffff:ffff:ffff",
      "2001:0DB8:0001:0002:0000:0000:0000:abcd",
      "2001:db8:1:2:a:b:c:d",
      "2001:db8:1:2::7%eth0",
    ]) {
      expect([ip, hashIp(ip, SECRET)]).toEqual([ip, V6_2001_DB8_1_2]);
    }
  });

  it("gives the next /64 a different bucket", () => {
    expect(hashIp("2001:db8:1:3::1", SECRET)).not.toBe(V6_2001_DB8_1_2);
  });

  it("leaves IPv4 keyed by the exact address", () => {
    expect(hashIp("203.0.113.7", SECRET)).toBe(V4_203_0_113_7);
  });

  it("keys an IPv4-mapped IPv6 address as its IPv4 address, not as ::/64 shared by every mapped client", () => {
    expect(hashIp("::ffff:198.51.100.1", SECRET)).toBe(V4_198_51_100_1);
    expect(hashIp("::ffff:c633:6401", SECRET)).toBe(V4_198_51_100_1);
  });
});
