import asyncio
import getpass
import os
import secrets
from datetime import datetime, timezone

from pymongo.errors import DuplicateKeyError

from lib.db import client, db
from routers.auth import password_hash


def normalize_email(value: str) -> str:
    email = value.strip().lower()
    if len(email) > 254 or "@" not in email or email.startswith("@") or email.endswith("@"):
        raise ValueError("Format email tidak valid")
    return email


def select_superadmin_email(selection: str, available_emails: list[str]) -> str:
    if selection.isdigit():
        index = int(selection) - 1
        if 0 <= index < len(available_emails):
            return available_emails[index]
    else:
        email = normalize_email(selection)
        if email in available_emails:
            return email
    raise ValueError("Pilihan tidak cocok dengan akun superadmin yang ditampilkan")


async def reset_superadmin_credentials(old_email: str, new_email: str, new_password: str) -> None:
    user = await db.admin_users.find_one({"email": old_email, "role": "superadmin"})
    if not user:
        raise ValueError("Akun superadmin dengan email lama tidak ditemukan")

    if new_email != old_email and await db.admin_users.find_one({"email": new_email}):
        raise ValueError("Email baru sudah digunakan akun admin lain")

    await db.admin_sessions.delete_many({"email": old_email})
    try:
        result = await db.admin_users.update_one(
            {"_id": user["_id"], "role": "superadmin"},
            {"$set": {"email": new_email, "password_hash": password_hash(new_password)}},
        )
    except DuplicateKeyError:
        raise ValueError("Email baru sudah digunakan akun admin lain") from None
    if result.modified_count != 1:
        raise RuntimeError("Akun tidak berhasil diperbarui; jalankan ulang proses pemulihan")

    await db.audit_logs.insert_one({
        "id": secrets.token_hex(8),
        "action": "reset_superadmin_credentials",
        "target_id": new_email,
        "actor": "credential-recovery-cli",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


async def main() -> None:
    if not os.environ.get("MONGO_URL"):
        raise RuntimeError("MONGO_URL belum dikonfigurasi; hentikan agar tidak memakai database lokal yang salah")

    print(f"Database target: {db.name}")
    accounts = await db.admin_users.find(
        {"role": "superadmin"}, {"_id": 0, "email": 1}
    ).sort("email", 1).to_list(200)
    available_emails = [account["email"] for account in accounts]
    if not available_emails:
        raise RuntimeError("Tidak ditemukan akun superadmin di database ini")
    print("Akun superadmin yang ditemukan:")
    for index, email in enumerate(available_emails, start=1):
        print(f"  {index}. {email}")
    old_email = select_superadmin_email(
        input("Pilih nomor atau email akun yang akan dipulihkan: "),
        available_emails,
    )
    new_email = normalize_email(input("Email superadmin baru: "))
    new_password = getpass.getpass("Sandi baru (12-128 karakter, tidak ditampilkan): ")
    confirmation = getpass.getpass("Ulangi sandi baru: ")
    if new_password != confirmation:
        raise ValueError("Sandi tidak cocok")
    if not 12 <= len(new_password) <= 128:
        raise ValueError("Sandi harus memiliki panjang 12-128 karakter")
    if input('Ketik RESET untuk melanjutkan: ') != "RESET":
        print("Pemulihan dibatalkan.")
        return

    await reset_superadmin_credentials(old_email, new_email, new_password)
    print("Email dan sandi superadmin diperbarui; semua sesi admin lama telah dicabut.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    finally:
        client.close()
MONGO_URL="mongodb://localhost:27017"
