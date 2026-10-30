# backend/scripts/patch-applications.py
with open("backend/routes/applications.js", "r", encoding="utf-8") as f:
    content = f.read()

old_snippet = """    } else if (["OFFICER", "MANAGER", "FRAUD_ANALYST"].includes(user.role)) {
      // Staff see submitted applications
      where = { status: { in: ["SUBMITTED", "UNDER_REVIEW", "RECOMMENDED"] } };
    } else {
      return res.status(403).json({ error: "Access denied" });
    }"""

new_snippet = """    } else if (["OFFICER", "MANAGER", "FRAUD_ANALYST"].includes(user.role)) {
      // Staff see submitted applications
      where = { status: { in: ["SUBMITTED", "UNDER_REVIEW", "RECOMMENDED"] } };
    } else if (["ADMIN", "AUDITOR"].includes(user.role)) {
      // Admins and Auditors have platform-wide oversight to view applications
      where = {};
    } else {
      return res.status(403).json({ error: "Access denied" });
    }"""

if old_snippet.replace("\n", "\r\n") in content:
    content = content.replace(old_snippet.replace("\n", "\r\n"), new_snippet.replace("\n", "\r\n"))
    print("Replaced with CRLF")
elif old_snippet in content:
    content = content.replace(old_snippet, new_snippet)
    print("Replaced with LF")
else:
    print("Snippet not found!")

with open("backend/routes/applications.js", "w", encoding="utf-8") as f:
    f.write(content)
