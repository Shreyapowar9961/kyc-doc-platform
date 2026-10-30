import urllib.request
import json
import uuid
import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = 'http://127.0.0.1:4000'

def request(method, path, data=None, token=None, content_type='application/json'):
    url = f'{BASE_URL}{path}'
    req = urllib.request.Request(url, method=method)
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    if data is not None:
        if content_type == 'application/json':
            req.add_header('Content-Type', 'application/json')
            body = json.dumps(data).encode('utf-8')
        else:
            req.add_header('Content-Type', content_type)
            body = data
    else:
        body = None
    try:
        with urllib.request.urlopen(req, data=body, timeout=30) as resp:
            content_type_header = resp.headers.get_content_type()
            raw = resp.read()
            if 'json' in content_type_header:
                return resp.status, json.loads(raw.decode('utf-8')) if raw else {}
            return resp.status, raw
    except urllib.error.HTTPError as e:
        try:
            err_body = json.loads(e.read().decode('utf-8'))
        except:
            err_body = str(e)
        return e.code, err_body

print('======================================================================')
print('KYC & LOAN DOCUMENT PLATFORM — COMPREHENSIVE VERIFICATION TEST SUITE')
print('======================================================================\n')

# ─────────────────────────────────────────────────────────────────────────────
# 1. REGISTRATION POLICY TESTS
# ─────────────────────────────────────────────────────────────────────────────
print('--- 1. REGISTRATION POLICY TESTS (APPLICANTS ONLY) ---')

suffix = str(uuid.uuid4())[:6]
applicant_email = f'applicant_{suffix}@test.local'

# 1.1 Applicant registration succeeds
status, res = request('POST', '/auth/register', {
    'email': applicant_email,
    'name': 'Test Applicant',
    'password': 'SecurePassword123!'
})
assert status == 201, f'Applicant registration failed with status {status}: {res}'
assert res['user']['role'] == 'APPLICANT', f'Expected role APPLICANT, got {res["user"]["role"]}'
print(f'✅ [PASS] 1.1 Applicant registration succeeds: {applicant_email} (Role: {res["user"]["role"]})')

# 1.2 Staff public registration is rejected (HTTP 403)
for attempted_role in ['OFFICER', 'MANAGER', 'FRAUD_ANALYST', 'AUDITOR', 'ADMIN']:
    status, res = request('POST', '/auth/register', {
        'email': f'hacker_{attempted_role.lower()}_{suffix}@test.local',
        'name': f'Fake {attempted_role}',
        'password': 'SecurePassword123!',
        'role': attempted_role
    })
    assert status == 403, f'Staff registration for {attempted_role} should return 403, got {status}: {res}'
    print(f'✅ [PASS] 1.2 Staff self-registration attempt ({attempted_role}) strictly rejected with HTTP {status}: {res.get("error")}')

# 1.3 Duplicate email registration is rejected (HTTP 409)
status, res = request('POST', '/auth/register', {
    'email': applicant_email,
    'name': 'Duplicate Applicant',
    'password': 'SecurePassword123!'
})
assert status == 409, f'Expected 409 for duplicate email, got {status}: {res}'
print(f'✅ [PASS] 1.3 Duplicate email registration rejected with HTTP {status}: {res.get("error")}')

# 1.4 Admin provisioning of staff accounts succeeds
status, admin_login = request('POST', '/auth/login', {
    'email': 'admin@demo.local',
    'password': 'DemoPassword123!'
})
assert status == 200, f'Admin login failed: {admin_login}'
admin_token = admin_login['token']

staff_email = f'provisioned_officer_{suffix}@bank.local'
status, prov_res = request('POST', '/admin/users', {
    'email': staff_email,
    'name': 'Provisioned Officer',
    'password': 'DemoPassword123!',
    'role': 'OFFICER'
}, token=admin_token)
assert status == 201, f'Staff provisioning failed: {prov_res}'
assert prov_res['user']['role'] == 'OFFICER', f'Expected OFFICER, got {prov_res["user"]["role"]}'
print(f'✅ [PASS] 1.4 Admin staff provisioning succeeds: {staff_email} (Role: {prov_res["user"]["role"]})')


# ─────────────────────────────────────────────────────────────────────────────
# 2. AUTHENTICATION TESTS
# ─────────────────────────────────────────────────────────────────────────────
print('\n--- 2. AUTHENTICATION & LOGIN TESTS ---')

# 2.1 Applicant login succeeds
status, app_login = request('POST', '/auth/login', {
    'email': applicant_email,
    'password': 'SecurePassword123!'
})
assert status == 200, f'Applicant login failed: {status}'
assert 'token' in app_login, 'Missing JWT token'
applicant_token = app_login['token']
applicant_id = app_login['user']['id']
print(f'✅ [PASS] 2.1 Applicant login succeeds (ID: {applicant_id}, Role: {app_login["user"]["role"]})')

# 2.2 Authorized staff login succeeds
status, staff_login = request('POST', '/auth/login', {
    'email': staff_email,
    'password': 'DemoPassword123!'
})
assert status == 200, f'Staff login failed: {status}'
staff_token = staff_login['token']
print(f'✅ [PASS] 2.2 Authorized staff login succeeds (Role: {staff_login["user"]["role"]})')

# 2.3 Invalid credentials are rejected
status, bad_login = request('POST', '/auth/login', {
    'email': applicant_email,
    'password': 'WrongPassword123!'
})
assert status == 401, f'Expected 401 for bad credentials, got {status}'
print(f'✅ [PASS] 2.3 Invalid credentials rejected with HTTP {status}: {bad_login.get("error")}')


# ─────────────────────────────────────────────────────────────────────────────
# 3. STRICT BACKEND AUTHORIZATION TESTS
# ─────────────────────────────────────────────────────────────────────────────
print('\n--- 3. STRICT BACKEND AUTHORIZATION & PRIVILEGE ESCALATION TESTS ---')

# 3.1 Applicant forbidden from accessing /admin/users
status, res = request('GET', '/admin/users', token=applicant_token)
assert status == 403, f'Applicant should get 403 on /admin/users, got {status}'
print(f'✅ [PASS] 3.1 Vertical privilege escalation blocked: Applicant cannot access /admin/users (HTTP {status})')

# 3.2 Applicant forbidden from accessing /admin/audit
status, res = request('GET', '/admin/audit', token=applicant_token)
assert status == 403, f'Applicant should get 403 on /admin/audit, got {status}'
print(f'✅ [PASS] 3.2 Vertical privilege escalation blocked: Applicant cannot access /admin/audit (HTTP {status})')

# 3.3 Officer forbidden from accessing admin role change endpoint
status, res = request('PATCH', f'/admin/users/{applicant_id}/role', {'role': 'ADMIN'}, token=staff_token)
assert status == 403, f'Officer should get 403 when updating roles, got {status}'
print(f'✅ [PASS] 3.3 Officer cannot modify administrative roles (HTTP {status})')

# 3.4 Auditor login and read-only verification
status, auditor_login = request('POST', '/auth/login', {
    'email': 'auditor@demo.local',
    'password': 'DemoPassword123!'
})
assert status == 200, f'Auditor login failed: {auditor_login}'
auditor_token = auditor_login['token']

status, audit_res = request('GET', '/admin/audit', token=auditor_token)
assert status == 200, f'Auditor failed to read audit logs: {status}'
print(f'✅ [PASS] 3.4 Auditor has read access to audit logs (HTTP {status}, {len(audit_res.get("logs", []))} entries)')

# Auditor attempting role update: must be forbidden
status, res = request('PATCH', f'/admin/users/{applicant_id}/role', {'role': 'ADMIN'}, token=auditor_token)
assert status == 403, f'Auditor should be forbidden from modifying roles, got {status}'
print(f'✅ [PASS] 3.5 Auditor cannot perform write/modification operations (HTTP {status})')


# ─────────────────────────────────────────────────────────────────────────────
# 4. HORIZONTAL PRIVILEGE ESCALATION & DOCUMENT OWNERSHIP TESTS
# ─────────────────────────────────────────────────────────────────────────────
print('\n--- 4. DOCUMENT STORAGE & HORIZONTAL PRIVILEGE ESCALATION TESTS ---')

# Register a second applicant (Applicant B)
applicant_b_email = f'applicant_b_{suffix}@test.local'
status, reg_b = request('POST', '/auth/register', {
    'email': applicant_b_email,
    'name': 'Applicant B',
    'password': 'SecurePassword123!'
})
status, login_b = request('POST', '/auth/login', {
    'email': applicant_b_email,
    'password': 'SecurePassword123!'
})
applicant_b_token = login_b['token']
print(f'✅ Registered and logged in second applicant: {applicant_b_email}')

# Applicant A creates application
status, app_a = request('POST', '/applications', {'title': 'Applicant A Loan Application'}, token=applicant_token)
assert status == 201, f'Failed to create application: {status}'
app_a_id = app_a['application']['id']
print(f'✅ Applicant A created application: {app_a_id}')

# Applicant B attempts to access Applicant A\'s application: MUST BE 404 (or 403)
status, res = request('GET', f'/applications/{app_a_id}', token=applicant_b_token)
assert status == 404, f'Applicant B should receive 404 for Applicant A application, got {status}'
print(f'✅ [PASS] 4.1 Horizontal privilege escalation blocked: Applicant B receives HTTP {status} for Applicant A application')

# Upload document to Applicant A application
png_bytes = bytes([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89,
    0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54,
    0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05,
    0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,
    0xAE, 0x42, 0x60, 0x82
])

boundary = '----FormBoundary' + uuid.uuid4().hex
crlf = '\r\n'
body = (
    f'--{boundary}{crlf}'.encode('utf-8') +
    f'Content-Disposition: form-data; name="files"; filename="applicant_pan.png"{crlf}'.encode('utf-8') +
    f'Content-Type: image/png{crlf}{crlf}'.encode('utf-8') +
    png_bytes +
    f'{crlf}--{boundary}--{crlf}'.encode('utf-8')
)

status, up_res = request('POST', f'/applications/{app_a_id}/documents', body, token=applicant_token, content_type=f'multipart/form-data; boundary={boundary}')
assert status == 201, f'Document upload failed: {status}'
docs = up_res['documents']
assert len(docs) > 0, 'No documents returned'
doc_id = docs[0]['id']
print(f'✅ [PASS] 4.2 Document uploaded (ID: {doc_id}, storage associated with application {app_a_id})')

# Applicant A downloads own document: MUST SUCCEED (200)
status, doc_content = request('GET', f'/documents/{doc_id}/file', token=applicant_token)
assert status == 200, f'Applicant A failed to download own document: {status}'
print(f'✅ [PASS] 4.3 Applicant A authenticated document download succeeds (HTTP {status})')

# Applicant B attempts to download Applicant A\'s document: MUST BE 404
status, res = request('GET', f'/documents/{doc_id}/file', token=applicant_b_token)
assert status == 404, f'Applicant B downloading Applicant A doc should return 404, got {status}'
print(f'✅ [PASS] 4.4 Horizontal privilege escalation blocked: Applicant B cannot download Applicant A document (HTTP {status})')

# Unauthenticated request to download document: MUST BE 401
status, res = request('GET', f'/documents/{doc_id}/file')
assert status == 401, f'Unauthenticated download should return 401, got {status}'
print(f'✅ [PASS] 4.5 Unauthenticated document download rejected (HTTP {status})')


# ─────────────────────────────────────────────────────────────────────────────
# 5. DOCUMENT AUTHENTICITY AND DOSSIER VERIFICATION
# ─────────────────────────────────────────────────────────────────────────────
print('\n--- 5. DOCUMENT AUTHENTICITY & VERIFICATION CHECKS ---')

status, app_detail = request('GET', f'/applications/{app_a_id}', token=applicant_token)
assert status == 200, f'Failed to fetch application detail: {status}'
app_data = app_detail['application']
detail_doc = app_data['documents'][0]

ver = detail_doc.get('verification')
assert ver is not None, 'Missing verification object on document'
print(f'✅ [PASS] 5.1 Document Authenticity Score computed: {ver.get("authenticityScore")} / 100')
print(f'✅ [PASS] 5.2 Verification Status: {ver.get("verificationStatus")}')
assert 'checks' in ver and len(ver['checks']) > 0, 'Missing granular verification checks'
for c in ver['checks']:
    print(f'    • {c["name"]}: {c["score"]}/{c["maxScore"]} pts | Passed: {c["passed"]} ({c["details"]})')

dossier = app_data.get('dossierVerification')
assert dossier is not None, 'Missing dossierVerification'
print(f'✅ [PASS] 5.3 Dossier Authenticity Health computed: {dossier.get("overallScore")}/100 ({dossier.get("status")})')

print('\n======================================================================')
print('ALL COMPREHENSIVE TESTS PASSED SUCCESSFULLY! (100% SUCCESS RATE)')
print('======================================================================\n')
