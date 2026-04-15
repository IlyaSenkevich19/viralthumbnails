#!/usr/bin/env bash
set -euo pipefail

# Pipeline hardening checks helper.
# Uses the same scenarios as docs/pipeline-hardening-runbook.md
#
# Required env for full run:
#   API   (default: http://localhost:3001/api)
#   TOKEN (Bearer JWT)
#
# Optional env:
#   VIDEO_FILE           absolute path to local video file
#   VIDEO_URL            public http(s) video URL
#   TEMPLATE_ID          valid template id
#   AVATAR_ID            valid avatar id
#   EXPECT_RATE_LIMIT    number of requests to send in throttling test (default: 9)
#   DRY_RUN=1            print actions only, no protected calls
#
# Examples:
#   DRY_RUN=1 ./scripts/run-pipeline-hardening.sh
#   TOKEN=... VIDEO_FILE=/tmp/video.mp4 ./scripts/run-pipeline-hardening.sh

API="${API:-http://localhost:3001/api}"
TOKEN="${TOKEN:-}"
VIDEO_FILE="${VIDEO_FILE:-}"
VIDEO_URL="${VIDEO_URL:-}"
TEMPLATE_ID="${TEMPLATE_ID:-}"
AVATAR_ID="${AVATAR_ID:-}"
EXPECT_RATE_LIMIT="${EXPECT_RATE_LIMIT:-9}"
DRY_RUN="${DRY_RUN:-0}"

log() { printf "\n[%s] %s\n" "pipeline-hardening" "$*"; }
warn() { printf "\n[%s] WARNING: %s\n" "pipeline-hardening" "$*" >&2; }
die() { printf "\n[%s] ERROR: %s\n" "pipeline-hardening" "$*" >&2; exit 1; }

check_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

json_post() {
  local path="$1"
  local body="$2"
  curl -sS -w "\nHTTP_STATUS:%{http_code}\n" \
    -X POST "$API/$path" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$body"
}

multipart_post() {
  local path="$1"
  shift
  curl -sS -w "\nHTTP_STATUS:%{http_code}\n" \
    -X POST "$API/$path" \
    -H "Authorization: Bearer $TOKEN" \
    "$@"
}

parse_http_status() {
  sed -n 's/^HTTP_STATUS://p'
}

require_token_or_dry() {
  if [[ "$DRY_RUN" == "1" ]]; then
    return 0
  fi
  [[ -n "$TOKEN" ]] || die "TOKEN is required (or run with DRY_RUN=1)."
}

check_cmd curl
check_cmd python3

log "API base: $API"
log "Health check"
health="$(curl -sS -w "\nHTTP_STATUS:%{http_code}\n" "$API/health" || true)"
health_status="$(printf "%s" "$health" | parse_http_status)"
if [[ "$health_status" != "200" ]]; then
  warn "Health check is not 200 (got: ${health_status:-none})."
  warn "If backend is not running, start it before full checks."
else
  log "Health is OK."
fi

if [[ "$DRY_RUN" == "1" ]]; then
  log "DRY_RUN=1 -> printing planned checks only."
  cat <<'EOF'
Planned checks:
1) POST /thumbnails/pipeline/run success path
2) POST /thumbnails/pipeline/run-video success path
3) unresolved refs warnings (fake template_id/avatar_id)
4) throttling burst check (expect 429 near end)
5) payload limit checks:
   - oversized JSON for /pipeline/run
   - oversized multipart for /pipeline/run-video (if VIDEO_FILE > 80MB provided)
6) billing balance before/after helper snapshot
EOF
  exit 0
fi

require_token_or_dry

log "Fetching credits before checks"
credits_before="$(curl -sS -w "\nHTTP_STATUS:%{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  "$API/billing/credits")"
credits_before_status="$(printf "%s" "$credits_before" | parse_http_status)"
[[ "$credits_before_status" == "200" ]] || die "Failed to fetch credits before checks (HTTP $credits_before_status)."

log "Check #1: JSON pipeline run with persistence"
payload1='{"user_prompt":"High CTR thumbnail for productivity video","variant_count":2,"generate_images":true,"persist_project":true}'
res1="$(json_post "thumbnails/pipeline/run" "$payload1")"
status1="$(printf "%s" "$res1" | parse_http_status)"
if [[ "$status1" != "200" ]]; then
  warn "Check #1 failed (HTTP $status1)."
else
  log "Check #1 OK."
fi

if [[ -n "$VIDEO_FILE" || -n "$VIDEO_URL" ]]; then
  log "Check #2: video pipeline run-video"
  args=()
  if [[ -n "$VIDEO_FILE" ]]; then
    [[ -f "$VIDEO_FILE" ]] || die "VIDEO_FILE does not exist: $VIDEO_FILE"
    args+=(-F "file=@$VIDEO_FILE")
  fi
  if [[ -n "$VIDEO_URL" ]]; then
    args+=(-F "videoUrl=$VIDEO_URL")
  fi
  args+=(-F "count=2" -F "prompt=Emphasize reaction and bold text")
  if [[ -n "$TEMPLATE_ID" ]]; then args+=(-F "template_id=$TEMPLATE_ID"); fi
  if [[ -n "$AVATAR_ID" ]]; then args+=(-F "avatar_id=$AVATAR_ID" -F "prioritize_face=true"); fi

  res2="$(multipart_post "thumbnails/pipeline/run-video" "${args[@]}")"
  status2="$(printf "%s" "$res2" | parse_http_status)"
  if [[ "$status2" != "200" ]]; then
    warn "Check #2 failed (HTTP $status2)."
  else
    log "Check #2 OK."
  fi
else
  warn "Skipping Check #2 (set VIDEO_FILE or VIDEO_URL)."
fi

log "Check #3: unresolved refs warnings"
payload3='{"user_prompt":"Tech review thumbnail","variant_count":1,"generate_images":true,"persist_project":true,"template_id":"missing-template-id","avatar_id":"missing-avatar-id"}'
res3="$(json_post "thumbnails/pipeline/run" "$payload3")"
status3="$(printf "%s" "$res3" | parse_http_status)"
if [[ "$status3" != "200" ]]; then
  warn "Check #3 failed (HTTP $status3)."
else
  if printf "%s" "$res3" | rg -q '"warnings"'; then
    log "Check #3 OK (warnings present)."
  else
    warn "Check #3 response did not include warnings."
  fi
fi

log "Check #4: throttling burst (${EXPECT_RATE_LIMIT} requests)"
throttle_hits=0
for i in $(seq 1 "$EXPECT_RATE_LIMIT"); do
  r="$(json_post "thumbnails/pipeline/run" '{"user_prompt":"throttle check","variant_count":1,"generate_images":false,"persist_project":false}')"
  s="$(printf "%s" "$r" | parse_http_status)"
  if [[ "$s" == "429" ]]; then
    throttle_hits=$((throttle_hits + 1))
  fi
done
if [[ "$throttle_hits" -gt 0 ]]; then
  log "Check #4 OK (saw $throttle_hits throttled responses)."
else
  warn "Check #4 did not observe 429. This can happen if prior traffic is low / limits differ by environment."
fi

log "Check #5a: oversized JSON payload"
huge="$(python3 - <<'PY'
payload = "A" * (16 * 1024 * 1024)
print('{"user_prompt":"x","base_image_data_url":"data:image/png;base64,' + payload + '"}')
PY
)"
res5a="$(json_post "thumbnails/pipeline/run" "$huge" || true)"
status5a="$(printf "%s" "$res5a" | parse_http_status)"
if [[ "$status5a" == "413" || "$status5a" == "400" || "$status5a" == "422" ]]; then
  log "Check #5a OK (payload rejected with HTTP $status5a)."
else
  warn "Check #5a unexpected status: ${status5a:-none}."
fi

if [[ -n "$VIDEO_FILE" ]]; then
  size_bytes="$(wc -c < "$VIDEO_FILE" | tr -d ' ')"
  if [[ "$size_bytes" -gt $((80 * 1024 * 1024)) ]]; then
    log "Check #5b: oversized multipart file"
    res5b="$(multipart_post "thumbnails/pipeline/run-video" -F "file=@$VIDEO_FILE" -F "count=1" || true)"
    status5b="$(printf "%s" "$res5b" | parse_http_status)"
    if [[ "$status5b" == "413" || "$status5b" == "400" || "$status5b" == "422" ]]; then
      log "Check #5b OK (oversized file rejected with HTTP $status5b)."
    else
      warn "Check #5b unexpected status: ${status5b:-none}."
    fi
  else
    warn "Skipping Check #5b (VIDEO_FILE <= 80MB)."
  fi
else
  warn "Skipping Check #5b (no VIDEO_FILE provided)."
fi

log "Fetching credits after checks"
credits_after="$(curl -sS -w "\nHTTP_STATUS:%{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  "$API/billing/credits")"
credits_after_status="$(printf "%s" "$credits_after" | parse_http_status)"
if [[ "$credits_after_status" != "200" ]]; then
  warn "Failed to fetch credits after checks (HTTP $credits_after_status)."
else
  before_balance="$(printf "%s" "$credits_before" | rg -o '"balance"\s*:\s*[0-9]+' | rg -o '[0-9]+' | head -n 1 || true)"
  after_balance="$(printf "%s" "$credits_after" | rg -o '"balance"\s*:\s*[0-9]+' | rg -o '[0-9]+' | head -n 1 || true)"
  log "Credits balance before: ${before_balance:-unknown}, after: ${after_balance:-unknown}"
fi

log "Done. Review warnings above and backend logs for OpenRouter/Storage/refund behavior."
