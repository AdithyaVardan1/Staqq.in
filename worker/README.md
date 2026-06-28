# Staqq price worker

A single long-lived Node process that keeps the live price snapshot fresh.

- Logs into Angel One **once**, holds the session.
- Every 30s (market hours) / 10min (closed) fetches all 500 NIFTY prices
  (50/call, spaced to Angel One's 1 req/sec limit) and writes **one** snapshot
  to Upstash Redis   the same `stocks:snapshot` key the Vercel app reads.

The Vercel app is unchanged; it just reads the snapshot. This recreates the
"one persistent session + warm cache" setup that worked on a laptop, on a server.

## Deploy on the VPS (as the `deploy` user)

```bash
# 1. Get the repo (or your deploy.sh already does this)
cd ~ && git clone https://github.com/AdithyaVardan1/Staqq.in.git staqq
cd staqq

# 2. Install dependencies (the worker reuses the repo's node_modules)
npm install

# 3. Configure secrets
cp worker/.env.example worker/.env
nano worker/.env            # fill in Angel One + Upstash values
chmod 600 worker/.env

# 4. Smoke test   should print "500/500 priced" and write the snapshot
RUN_ONCE=1 node --env-file=worker/.env worker/price-worker.mjs

# 5. Install the systemd service
sudo cp worker/staqq-price-worker.service /etc/systemd/system/
# edit WorkingDirectory in the unit if your repo path isn't /home/deploy/staqq
sudo nano /etc/systemd/system/staqq-price-worker.service
sudo systemctl daemon-reload
sudo systemctl enable --now staqq-price-worker

# 6. Watch it run
journalctl -u staqq-price-worker -f
```

## Verify it's working
- `journalctl -u staqq-price-worker -f` should log `wrote snapshot: 500/500 priced` every ~30s during market hours.
- Hit the app: `curl https://www.staqq.in/api/stocks/price?ticker=HDFCBANK`   fresh price, served from the snapshot.

## Update / restart
```bash
cd ~/staqq && git pull && npm install
sudo systemctl restart staqq-price-worker
```

## Notes
- Once this worker is live, the QStash `/api/stocks/refresh` schedule is
  redundant   you can delete that one schedule (keep the others). The Vercel
  `/api/stocks/refresh` endpoint can stay as a manual/backup trigger.
- The worker only makes **outbound** connections, so no inbound firewall ports
  are needed.
