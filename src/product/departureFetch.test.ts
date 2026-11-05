import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { explainDepartureUrlRejection, isPublicIpAddress } from "./departureFetch.ts";

const PRODUCT_URL = "https://agents.intrepidtravel.com/au/sri-lanka/premium-sri-lanka-166677";

describe("departure fetch allowlist", () => {
  it("allows https URLs on the product host", () => {
    assert.equal(
      explainDepartureUrlRejection(
        "https://agents.intrepidtravel.com/api/product/available-years-months-and-departures",
        PRODUCT_URL,
      ),
      undefined,
    );
  });

  it("rejects another host", () => {
    assert.ok(explainDepartureUrlRejection("https://evil.example/departures", PRODUCT_URL));
  });

  it("rejects http", () => {
    assert.ok(
      explainDepartureUrlRejection(
        "http://agents.intrepidtravel.com/au/sri-lanka/premium-sri-lanka-166677",
        PRODUCT_URL,
      ),
    );
  });

  it("rejects URL userinfo", () => {
    assert.ok(
      explainDepartureUrlRejection(
        "https://user:pass@agents.intrepidtravel.com/departures",
        PRODUCT_URL,
      ),
    );
  });

  it("rejects localhost", () => {
    assert.ok(explainDepartureUrlRejection("https://localhost/admin", "https://localhost/admin"));
  });

  it("rejects metadata and non-public addresses", () => {
    assert.equal(isPublicIpAddress("169.254.169.254"), false);
    assert.equal(isPublicIpAddress("127.0.0.1"), false);
    assert.equal(isPublicIpAddress("10.1.2.3"), false);
    assert.equal(isPublicIpAddress("8.8.8.8"), true);
    assert.equal(isPublicIpAddress("::ffff:169.254.169.254"), false);
    assert.ok(
      explainDepartureUrlRejection(
        "https://169.254.169.254/latest/meta-data",
        "https://169.254.169.254/latest/meta-data",
      ),
    );
  });
});
