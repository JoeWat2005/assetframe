"""Upload locked Pro report files to a private Cloudflare R2 bucket.

Free Snapshots ship inside the public Cloudflare Pages deploy (built by
build_site.py). Pro files do NOT — they live in private R2 and are served only
through the gating Function in web/functions/pro/ after a licence check.

R2 is S3-compatible, so this uses boto3. Install once:  pip install boto3

Set these environment variables (from the Cloudflare dashboard - see LAUNCH.md):
  R2_ACCOUNT_ID         your Cloudflare account id
  R2_ACCESS_KEY_ID      R2 API token access key
  R2_SECRET_ACCESS_KEY  R2 API token secret
  R2_BUCKET             the private bucket name (e.g. assetframe-pro)

Usage:
  python scripts/publish.py            upload every edition's pro.html + pro.pdf
  python scripts/publish.py --dry-run  show what would upload, change nothing
  python scripts/publish.py --date 2026-06-13   only that edition date

Object keys mirror the site paths the Function requests: <date>/<slug>/pro.html
"""
import argparse
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPORTS = ROOT / "reports"
PRO_FILES = {"pro.html": "text/html; charset=utf-8", "pro.pdf": "application/pdf"}


def discover(date_filter):
    items = []
    for meta in sorted(REPORTS.glob("*/*/metadata.json")):
        date, slug = meta.parent.parent.name, meta.parent.name
        if date.startswith("_"):
            continue
        if date_filter and date != date_filter:
            continue
        for name, ctype in PRO_FILES.items():
            f = meta.parent / name
            if f.exists():
                items.append((f, f"{date}/{slug}/{name}", ctype))
    return items


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--date", default=None, help="only upload this edition date (YYYY-MM-DD)")
    a = ap.parse_args()

    items = discover(a.date)
    if not items:
        print("No Pro files found under reports/. Generate an edition first.")
        return

    if a.dry_run:
        print(f"DRY RUN - would upload {len(items)} file(s):")
        for _, key, _ in items:
            print(f"  {key}")
        return

    env = {k: os.environ.get(k, "") for k in
           ("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET")}
    missing = [k for k, v in env.items() if not v]
    if missing:
        print("Missing environment variables: " + ", ".join(missing) +
              "\nSet them (see LAUNCH.md) or use --dry-run.", file=sys.stderr)
        sys.exit(2)

    try:
        import boto3  # noqa
    except ImportError:
        print("boto3 is required:  pip install boto3", file=sys.stderr)
        sys.exit(2)

    client = boto3.client(
        "s3",
        endpoint_url=f"https://{env['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        aws_access_key_id=env["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=env["R2_SECRET_ACCESS_KEY"],
        region_name="auto",
    )
    for path, key, ctype in items:
        client.put_object(Bucket=env["R2_BUCKET"], Key=key,
                          Body=path.read_bytes(), ContentType=ctype)
        print(f"uploaded  {key}")
    print(f"Done - {len(items)} file(s) to bucket '{env['R2_BUCKET']}'.")


if __name__ == "__main__":
    main()
