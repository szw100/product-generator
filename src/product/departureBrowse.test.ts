import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { explainBrowseRequest } from "./departureFetch.ts";

const PRODUCT_URL = "https://www.backroads.com/trips/BCSI/spains-canary-islands-bike-tour";

describe("departure browse requests", () => {
  it("allows the product document and same-host fetch", () => {
    assert.equal(explainBrowseRequest(PRODUCT_URL, PRODUCT_URL, "document"), undefined);
    assert.equal(
      explainBrowseRequest("https://www.backroads.com/api/departures", PRODUCT_URL, "fetch"),
      undefined,
    );
  });

  it("rejects another host for documents and fetch calls", () => {
    assert.ok(explainBrowseRequest("https://evil.example/departures", PRODUCT_URL, "document"));
    assert.ok(explainBrowseRequest("https://evil.example/api", PRODUCT_URL, "xhr"));
    assert.ok(explainBrowseRequest("https://evil.example/socket", PRODUCT_URL, "websocket"));
  });

  it("allows public https assets from other hosts", () => {
    assert.equal(
      explainBrowseRequest("https://cdn.example/app.js", PRODUCT_URL, "script"),
      undefined,
    );
  });

  it("rejects insecure, local, and metadata assets", () => {
    assert.ok(explainBrowseRequest("http://cdn.example/app.js", PRODUCT_URL, "script"));
    assert.ok(explainBrowseRequest("https://localhost/app.js", PRODUCT_URL, "script"));
    assert.ok(
      explainBrowseRequest("https://169.254.169.254/latest/meta-data", PRODUCT_URL, "script"),
    );
  });
});
