"""
store-openai-key.py
───────────────────
Run this ONCE from a PowerShell / terminal window:

    cd d:\folio\jayant-angular-ui
    python store-openai-key.py

It will prompt for your new OpenAI key (input is hidden), encrypt it with
AES-256-GCM (same algorithm as the .NET backend), and upsert it directly into
MongoDB.  The raw key is NEVER written to disk or returned by any API.

After running, delete this file.
"""

import sys, hashlib, secrets, base64, datetime, getpass

# ── Install check ────────────────────────────────────────────────────────────
try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from pymongo import MongoClient
except ImportError:
    sys.exit("Run:  pip install pymongo cryptography  then try again.")

# ── Config (from appsettings.json — no secrets here) ────────────────────────
MONGO_URI  = (
    "mongodb://jbadmin:1ZC7Lts7%2Csaeb%29Y0H4%40n"
    "@76.13.244.113:27017/jayant-portfolio?authSource=admin"
)
DB_NAME    = "jayant-portfolio"
COLLECTION = "llmproviders"
ENC_RAW    = "ChangeThisToAStrong256BitKeyInProduction!"   # appsettings.json

# ── Derive 32-byte encryption key (SHA-256, same as .NET) ───────────────────
enc_key = hashlib.sha256(ENC_RAW.encode("utf-8")).digest()

# ── AES-256-GCM  (matches .NET Encrypt method exactly) ──────────────────────
# .NET packs: nonce(12) + tag(16) + ciphertext → Base64
# Python cryptography AESGCM.encrypt returns: ciphertext + tag(16)
def encrypt(plain: str) -> str:
    nonce      = secrets.token_bytes(12)
    aesgcm     = AESGCM(enc_key)
    ct_tag     = aesgcm.encrypt(nonce, plain.encode("utf-8"), None)
    ciphertext = ct_tag[:-16]
    tag        = ct_tag[-16:]
    packed     = nonce + tag + ciphertext     # must match .NET layout
    return base64.b64encode(packed).decode("utf-8")

# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    print("\n=== OpenAI Key → MongoDB (encrypted) ===\n")
    api_key = getpass.getpass("Paste your NEW OpenAI API key (hidden): ").strip()

    if not api_key:
        sys.exit("No key entered. Aborted.")
    if not api_key.startswith("sk-"):
        sys.exit("That doesn't look like an OpenAI key (should start with sk-). Aborted.")

    print("\nEncrypting & connecting to MongoDB…")
    try:
        encrypted = encrypt(api_key)
        now       = datetime.datetime.utcnow()

        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10_000)
        col    = client[DB_NAME][COLLECTION]

        result = col.update_one(
            {"provider_name": "openai"},
            {
                "$set": {
                    "provider_name":     "openai",
                    "display_name":      "OpenAI GPT",
                    "api_key_encrypted": encrypted,
                    "enabled":           True,
                    "model":             "gpt-4o-mini",
                    "base_url":          "https://api.openai.com/v1",
                    "allowed_user_ids":  [],
                    "updated_at":        now,
                },
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
        )
        client.close()

        if result.upserted_id:
            print(f"\n✅ Created new 'openai' provider (id={result.upserted_id})")
        else:
            print(f"\n✅ Updated existing 'openai' provider")

        print("   Key is AES-256-GCM encrypted — raw key never stored.")
        print("\nDelete this file now (store-openai-key.py).\n")

    except Exception as e:
        sys.exit(f"ERROR: {e}")

if __name__ == "__main__":
    main()
