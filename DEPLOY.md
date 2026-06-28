# Staqq — self-hosted monolith deploy

The whole app runs as one Docker stack on the VPS:

```
Cloudflare ──▶ web (Next.js standalone)
                 │ reads
               SRH ──▶ Redis (localhost, never exposed)
                 ▲ writes
               worker (Angel One → snapshot; scrapers later)
               Supabase (managed) — relational/durable
```

`web` is the only service that takes traffic; `redis`, `srh`, and `worker` are
internal to the compose network. Reads/writes to Redis go through SRH (an
Upstash-REST proxy) so the app keeps its existing `@upstash/redis` client — no
code change between Vercel and the VPS.

## 0. Region check (do this first)
Your users are in India; live-data latency depends on origin location. If the
VPS is in the EU/US, consider a Singapore or Mumbai box — Cloudflare caches
*content* at the edge, but live/API/WS calls hit the origin.

## 1. Install Docker (on the VPS, once)
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker deploy   # run docker without sudo; re-login after
```

## 2. Get the repo + secrets (as `deploy`)
```bash
cd ~ && git clone https://github.com/AdithyaVardan1/Staqq.in.git staqq && cd staqq
cp .env.docker.example .env.docker
nano .env.docker        # fill EVERYTHING (Supabase, Angel One, SRH_TOKEN=long random, etc.)
chmod 600 .env.docker
```

## 3. Build + run
```bash
docker compose --env-file .env.docker build
docker compose --env-file .env.docker up -d
docker compose logs -f worker        # expect "wrote snapshot: 500/500 priced"
curl -s localhost:3000/api/stocks/price?ticker=RELIANCE   # served from local Redis
```
`web` is now on `127.0.0.1:3000` (localhost only — not yet public).

## 4. Put it behind Cloudflare (no open ports — recommended)
Use a **Cloudflare Tunnel** so you never open 80/443 (UFW stays SSH-only):
```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cf.deb
sudo dpkg -i cf.deb
cloudflared tunnel login
cloudflared tunnel create staqq
# route the tunnel to the local web container:
cloudflared tunnel route dns staqq staqq.in
# config /etc/cloudflared/config.yml:  ingress -> http://localhost:3000
sudo cloudflared service install
```
The tunnel dials *out* to Cloudflare, so there's nothing inbound to attack.
(Alternative: Caddy on 80/443 + Cloudflare proxy — then open those ports.)

## 5. Cutover (zero downtime)
- Vercel stays live the whole time.
- Test the VPS via a temporary hostname (e.g. `beta.staqq.in` → tunnel) until it's solid.
- When happy, point `staqq.in` (Cloudflare DNS) at the tunnel and retire Vercel
  (or keep Vercel as a fallback).

## Update / redeploy
```bash
cd ~/staqq && git pull
docker compose --env-file .env.docker up -d --build
```

## Notes
- Redis is `localhost`/internal only — never exposed.
- `.env.docker` is gitignored; keep it `chmod 600`.
- Once this is live, the Vercel cron/QStash refresh is redundant (the worker owns it).
