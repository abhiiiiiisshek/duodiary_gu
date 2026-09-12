"""Check DuoDiary's promises against a live Supabase project.

Two real members, two sessions, no client code involved. It reads the raw REST
API, so if the interface were merely hiding a partner's entry rather than being
unable to fetch it, this would say so.

    supabase: Authentication -> Sign In / Providers -> Anonymous sign-ins -> on
    set -a; . ./.env.local; set +a
    python3 scripts/verify-rules.py
    # turn anonymous sign-ins back off

Anonymous sign-ins are only needed because creating confirmed email accounts
requires a mailbox. Turn them off again afterwards -- while they are on, anyone
can create an account in the project.

Exit codes: 0 all passed, 1 a promise is broken, 2 a migration is missing.
"""
import json, os, sys, urllib.request, urllib.error
from datetime import datetime, timedelta

URL = os.environ["VITE_SUPABASE_URL"].rstrip("/")
ANON = os.environ["VITE_SUPABASE_ANON_KEY"]

def call(method, path, token=None, body=None, prefer=None):
    req = urllib.request.Request(f"{URL}{path}", method=method)
    req.add_header("apikey", ANON)
    req.add_header("Content-Type", "application/json")
    if token: req.add_header("Authorization", f"Bearer {token}")
    if prefer: req.add_header("Prefer", prefer)
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data) as r:
            raw = r.read().decode()
            return r.status, (json.loads(raw) if raw.strip() else None)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try: return e.code, json.loads(raw)
        except Exception: return e.code, raw

results = []
def check(label, ok, detail=""):
    results.append(ok)
    print(f"  {'PASS' if ok else 'FAIL'}  {label}{(' — ' + str(detail)) if detail else ''}")

def anon_session(name):
    st, d = call("POST", "/auth/v1/signup", body={"data": {"display_name": name}})
    assert d and d.get("access_token"), f"anonymous sign-in failed: {st} {d}"
    return d["access_token"], d["user"]["id"]

print("\n== two members ==")
a_tok, a_id = anon_session("Aanya Rao")
b_tok, b_id = anon_session("Bea Lindqvist")
print(f"  A {a_id}\n  B {b_id}")

st, prof = call("GET", f"/rest/v1/profiles?id=eq.{a_id}&select=display_name", a_tok)
check("the sign-up trigger created a profile with the right name",
      bool(prof) and prof[0]["display_name"] == "Aanya Rao", prof)

print("\n== A starts a diary ==")
code = "DUO-E2E-" + a_id[:4].upper()
st, did = call("POST", "/rest/v1/rpc/create_diary", a_tok, {"title": "Two Truths", "invite_code": code})
if st != 200:
    print(f"  create_diary RPC unavailable ({st} {did}).")
    print("  Run supabase/migrations/0003_create_diary.sql, then re-run this.")
    sys.exit(2)
check("a diary and its first member are created together", isinstance(did, str), did)

st, out = call("POST", "/rest/v1/rpc/create_diary", a_tok, {"title": "Another", "invite_code": "DUO-DUPE-DUPE"})
check("you cannot start a second diary while you are in one", st >= 400, out)

st, seen = call("GET", f"/rest/v1/diaries?id=eq.{did}&select=title", b_tok)
check("B cannot see a diary they are not a member of", seen == [], seen)

print("\n== B redeems the invitation ==")
st, out = call("POST", "/rest/v1/rpc/redeem_invite", b_tok, {"code": code.lower()})
check("the code works case-insensitively", st == 200 and out == did, out)

st, seen = call("GET", f"/rest/v1/diaries?id=eq.{did}&select=title", b_tok)
check("B can now see the diary", len(seen or []) == 1, seen)

c_tok, c_id = anon_session("Cal Interloper")
st, out = call("POST", "/rest/v1/rpc/redeem_invite", c_tok, {"code": code})
check("a third person is refused", st >= 400 and "two people" in str(out), out)

print("\n== today's chapter ==")
now = datetime.now().astimezone()
midnight = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
st, chapter = call("POST", "/rest/v1/chapters", a_tok, {
    "diary_id": did, "date": now.strftime("%Y-%m-%d"), "day_number": 1, "title": "Chapter 1",
    "closes_at": midnight.isoformat(), "unlock_at": midnight.isoformat(),
}, prefer="return=representation")
assert st in (200, 201), f"create chapter: {st} {chapter}"
cid = chapter[0]["id"]

call("POST", "/rest/v1/entries", a_tok, {"chapter_id": cid, "user_id": a_id})
call("POST", "/rest/v1/entries", b_tok, {"chapter_id": cid, "user_id": b_id})

st, out = call("POST", "/rest/v1/entries", a_tok, {"chapter_id": cid, "user_id": b_id})
check("nobody can write a page on their partner's behalf", st >= 400, out)

print("\n== A writes and seals; B has not ==")
SECRET = "I met Priya at the studio and we argued about the north window."
call("PATCH", f"/rest/v1/entries?chapter_id=eq.{cid}&user_id=eq.{a_id}", a_tok,
     {"body": SECRET, "is_completed": True, "submitted_at": now.isoformat()})

st, rows = call("GET", f"/rest/v1/entries?chapter_id=eq.{cid}&select=user_id,body", b_tok)
bodies = json.dumps(rows)
check("A's sealed entry is ABSENT from B's query, not merely hidden",
      all(r["user_id"] != a_id for r in rows or []), rows)
check("its text appears nowhere in the response", SECRET not in bodies)

st, own = call("GET", f"/rest/v1/entries?chapter_id=eq.{cid}&user_id=eq.{a_id}&select=body", a_tok)
check("A can still read their own words", own and own[0]["body"] == SECRET)

print("\n== B writes too ==")
call("PATCH", f"/rest/v1/entries?chapter_id=eq.{cid}&user_id=eq.{b_id}", b_tok,
     {"body": "He was quiet on the walk home.", "is_completed": True, "submitted_at": now.isoformat()})

st, rows = call("GET", f"/rest/v1/entries?chapter_id=eq.{cid}&select=user_id,body", b_tok)
check("now the chapter is open, B sees A's entry",
      any(r["user_id"] == a_id and r["body"] == SECRET for r in rows or []), rows)

st, out = call("PATCH", f"/rest/v1/entries?chapter_id=eq.{cid}&user_id=eq.{a_id}", a_tok,
               {"body": "Actually, let me rewrite that now I have read yours."},
               prefer="return=representation")
check("A can no longer edit once the chapter has opened", out == [] or st >= 400, out)

st, still = call("GET", f"/rest/v1/entries?chapter_id=eq.{cid}&user_id=eq.{a_id}&select=body", a_tok)
check("and the original words are untouched", still and still[0]["body"] == SECRET)

print("\n== private reflections ==")
call("POST", "/rest/v1/reflections", a_tok, {
    "diary_id": did, "user_id": a_id, "chapter_date": now.strftime("%Y-%m-%d"),
    "ciphertext": "OPAQUE-CIPHERTEXT", "iv": "iv", "topic_tag": "Kyoto",
})
st, rows = call("GET", f"/rest/v1/reflections?diary_id=eq.{did}&select=*", b_tok)
check("B cannot read A's private reflections at all", rows == [], rows)

st, out = call("POST", "/rest/v1/reflections", b_tok, {
    "diary_id": did, "user_id": a_id, "chapter_date": now.strftime("%Y-%m-%d"),
    "ciphertext": "forged", "iv": "iv",
}, prefer="return=representation")
check("nor forge one in A's name", st >= 400, out)

print("\n== ownership ==")
st, out = call("POST", "/rest/v1/rpc/transfer_ownership", b_tok, {"target_diary": did})
check("a non-owner cannot transfer the diary", st >= 400, out)
# A void-returning function comes back 204 No Content, not 200 -- so assert on
# what actually changed rather than on the status line.
st, out = call("POST", "/rest/v1/rpc/transfer_ownership", a_tok, {"target_diary": did})
check("the owner can hand it over", st in (200, 204), f"status {st}: {out}")
st, after = call("GET", f"/rest/v1/diaries?id=eq.{did}&select=owner_id", a_tok)
check("and ownership really moved to the other member",
      bool(after) and after[0]["owner_id"] == b_id, after)
st, out = call("POST", "/rest/v1/rpc/transfer_ownership", a_tok, {"target_diary": did})
check("the former owner can no longer transfer it", st >= 400, out)

call("DELETE", f"/rest/v1/diaries?id=eq.{did}", b_tok)
print(f"\n{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
