# backend/scripts/patch-ownership.py
with open("backend/middleware/ownership.js", "r", encoding="utf-8") as f:
    content = f.read()

old_block = """    } else if (["AUDITOR", "ADMIN"].includes(user.role)) {
      // Auditors & Admins cannot access raw applications/documents
      return sendError(res, 403, "This role cannot access application details");
    } else {"""

new_block = """    } else if (["ADMIN", "AUDITOR"].includes(user.role)) {
      // Admins and Auditors have platform oversight to inspect application details & checks
    } else {"""

old_owner = """function requireDraftOwner(req, res, next) {
  if (!req.application) return sendError(res, 400, "Application context missing");
  const user = req.user;

  if (user.role !== "APPLICANT" || req.application.applicantId !== user.id) {
    return sendError(res, 403, "Only the applicant can modify this application");
  }"""

new_owner = """function requireDraftOwner(req, res, next) {
  if (!req.application) return sendError(res, 400, "Application context missing");
  const user = req.user;

  const isOwner = req.application.applicantId === user.id;
  const isAllowed = ["APPLICANT", "ADMIN"].includes(user.role);

  if (!isAllowed || (!isOwner && user.role !== "ADMIN")) {
    return sendError(res, 403, "Only the applicant or administrator can modify this application");
  }"""

for target, replacement in [(old_block, new_block), (old_owner, new_owner)]:
    if target.replace("\n", "\r\n") in content:
        content = content.replace(target.replace("\n", "\r\n"), replacement.replace("\n", "\r\n"))
        print("Replaced CRLF")
    elif target in content:
        content = content.replace(target, replacement)
        print("Replaced LF")
    else:
        print("Target block not found:", target[:40])

with open("backend/middleware/ownership.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated backend/middleware/ownership.js")
