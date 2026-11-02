// backend/tests/sanitizeSensitiveData.test.js
const {
  maskAadhaar,
  maskAadhaarInText,
  maskPAN,
  hasRawPAN,
  sanitizeSensitiveData,
  hasRawAadhaar,
} = require("../utils/sanitizeSensitiveData");

describe("Sensitive Data Sanitization & Aadhaar Masking", () => {
  describe("maskAadhaar / maskAadhaarInText", () => {
    test("masks space-separated 12-digit Aadhaar", () => {
      const input = "Aadhaar Number: 1234 5678 9012";
      const expected = "Aadhaar Number: XXXX XXXX 9012";
      expect(maskAadhaar(input)).toBe(expected);
      expect(maskAadhaarInText(input)).toBe(expected);
    });

    test("masks hyphen-separated 12-digit Aadhaar", () => {
      const input = "Aadhaar Number: 1234-5678-9012";
      const expected = "Aadhaar Number: XXXX-XXXX-9012";
      expect(maskAadhaar(input)).toBe(expected);
    });

    test("masks continuous 12-digit Aadhaar", () => {
      const input = "Aadhaar Number: 123456789012";
      const expected = "Aadhaar Number: XXXX-XXXX-9012";
      expect(maskAadhaar(input)).toBe(expected);
    });

    test("masks multiple Aadhaar occurrences in the same OCR document text", () => {
      const text = `
        GOVERNMENT OF INDIA
        Mera Aadhaar, Meri Pehchaan
        Holder 1: 1234 5678 9012
        Holder 2 (Continuous): 987654321098
        Holder 3 (Hyphenated): 4321-8765-2109
      `;
      const result = maskAadhaar(text);
      expect(result).toContain("Holder 1: XXXX XXXX 9012");
      expect(result).toContain("Holder 2 (Continuous): XXXX-XXXX-1098");
      expect(result).toContain("Holder 3 (Hyphenated): XXXX-XXXX-2109");
      expect(result).not.toContain("1234 5678 9012");
      expect(result).not.toContain("987654321098");
      expect(result).not.toContain("4321-8765-2109");
    });

    test("preserves non-Aadhaar numbers such as phone numbers, card numbers, and accounts", () => {
      const phone = "Mobile: 9876543210";
      expect(maskAadhaar(phone)).toBe(phone);

      const account = "Account Number: 123456789";
      expect(maskAadhaar(account)).toBe(account);

      const card = "Card: 1234 5678 9012 3456";
      expect(maskAadhaar(card)).toBe(card);

      const longContinuous = "Ref: 123456789012345678";
      expect(maskAadhaar(longContinuous)).toBe(longContinuous);
    });

    test("does not corrupt already masked Aadhaar numbers", () => {
      const alreadyMasked1 = "Aadhaar: XXXX XXXX 9012";
      expect(maskAadhaar(alreadyMasked1)).toBe(alreadyMasked1);

      const alreadyMasked2 = "Aadhaar: XXXX-XXXX-9012";
      expect(maskAadhaar(alreadyMasked2)).toBe(alreadyMasked2);
    });

    test("handles non-string, empty, null and undefined inputs safely", () => {
      expect(maskAadhaar("")).toBe("");
      expect(maskAadhaar(null)).toBe(null);
      expect(maskAadhaar(undefined)).toBe(undefined);
      expect(maskAadhaar(12345)).toBe(12345);
    });
  });

  describe("sanitizeSensitiveData", () => {
    test("deeply sanitizes nested objects and arrays", () => {
      const payload = {
        applicant: {
          name: "John Doe",
          aadhaar: "123456789012",
          notes: "Applicant Aadhaar is 1234 5678 9012 on card copy",
        },
        documents: [
          {
            type: "aadhaar_card",
            ocrText: "UIDAI Aadhaar 5555-6666-7777 verified",
          },
        ],
        status: "PENDING",
      };

      const sanitized = sanitizeSensitiveData(payload);
      expect(sanitized.applicant.aadhaar).toBe("XXXX-XXXX-9012");
      expect(sanitized.applicant.notes).toBe(
        "Applicant Aadhaar is XXXX XXXX 9012 on card copy"
      );
      expect(sanitized.documents[0].ocrText).toBe(
        "UIDAI Aadhaar XXXX-XXXX-7777 verified"
      );
      expect(sanitized.status).toBe("PENDING");
    });

    test("masks PAN numbers in text and object properties", () => {
      const data = {
        pan: "ABCDE1234F",
        summary: "PAN ABCDE1234F verified against ITD database",
      };
      const result = sanitizeSensitiveData(data);
      expect(result.pan).toBe("ABCDE****F");
      expect(result.summary).toBe("PAN ABCDE****F verified against ITD database");
    });
  });

  describe("maskPAN / hasRawPAN", () => {
    test("masks standard 10-char PAN correctly to ABCDE****F", () => {
      expect(maskPAN("ABCDE1234F")).toBe("ABCDE****F");
      expect(hasRawPAN("ABCDE1234F")).toBe(true);
      expect(hasRawPAN("ABCDE****F")).toBe(false);
    });

    test("masks multiple PANs in unstructured text", () => {
      const text = "Found PAN: ABCDE1234F and another: FGHIJ5678K in document";
      expect(maskPAN(text)).toBe("Found PAN: ABCDE****F and another: FGHIJ****K in document");
    });

    test("preserves non-PAN alphabetic or alphanumeric strings", () => {
      expect(maskPAN("ABCDEF1234")).toBe("ABCDEF1234");
      expect(maskPAN("1234ABCDE")).toBe("1234ABCDE");
    });
  });
});
