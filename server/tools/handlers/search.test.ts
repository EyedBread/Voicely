import { describe, it, expect } from "vitest";
import { searchBusiness } from "./search";

describe("searchBusiness", () => {
  it("should return mock restaurant results", () => {
    const result = searchBusiness("italian restaurant");
    expect(result.results).toHaveLength(3);
    expect(result.query).toBe("italian restaurant");
    expect(result.location).toBe("nearby");
  });

  it("should pass through the location when provided", () => {
    const result = searchBusiness("sushi", "San Francisco");
    expect(result.location).toBe("San Francisco");
    expect(result.query).toBe("sushi");
  });

  it("should default location to 'nearby' when not provided", () => {
    const result = searchBusiness("french bistro");
    expect(result.location).toBe("nearby");
  });

  it("should return results with required fields", () => {
    const result = searchBusiness("restaurant");
    for (const biz of result.results) {
      expect(biz).toHaveProperty("name");
      expect(biz).toHaveProperty("phone");
      expect(biz).toHaveProperty("rating");
      expect(biz).toHaveProperty("cuisine");
      expect(biz).toHaveProperty("address");
      expect(typeof biz.name).toBe("string");
      expect(typeof biz.phone).toBe("string");
      expect(typeof biz.rating).toBe("number");
      expect(biz.phone).toMatch(/^\+\d+$/);
    }
  });
});
