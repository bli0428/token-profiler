import assert from "node:assert/strict";
import test from "node:test";
import { countTokens } from "../src/tokenizer.js";

test("counts text with o200k_base", () => {
  assert.equal(countTokens(""), 0);
  assert.equal(countTokens("hello world"), 2);
});

test("treats special-token-looking text as ordinary prompt content", () => {
  assert.doesNotThrow(() => countTokens("literal <|endoftext|> text"));
  assert.ok(countTokens("literal <|endoftext|> text") > 0);
});
