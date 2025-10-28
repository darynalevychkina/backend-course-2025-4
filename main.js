#!/usr/bin/env node
import http from 'http';
import { program } from 'commander';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { URL } from 'url';
import { XMLBuilder } from 'fast-xml-parser';
import path from 'path';

program
  .requiredOption('-i, --input <path>')
  .requiredOption('-h, --host <host>')
  .requiredOption('-p, --port <port>', v => {
    const n = Number(v);
    if (!Number.isInteger(n) || n <= 0 || n > 65535) throw new Error('Invalid port');
    return n;
  });
program.parse(process.argv);
const opts = program.opts();
if (!existsSync(opts.input)) { console.error('Cannot find input file'); process.exit(1); }

const builder = new XMLBuilder({ format: true, suppressEmptyNode: true, ignoreAttributes: false });
const OUT = path.resolve('./out');

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, `http://${opts.host}:${opts.port}`);
    const showMfo = (u.searchParams.get('mfo') || '').toLowerCase() === 'true';
    const onlyNormal = (u.searchParams.get('normal') || '').toLowerCase() === 'true';

    const raw = await readFile(opts.input, 'utf8');
    let data = JSON.parse(raw);
    if (!Array.isArray(data)) data = data.banks || data.items || data.data || data.list || [];
    let rows = data.filter(x => x && typeof x === 'object');

    if (onlyNormal) rows = rows.filter(r => Number(r.COD_STATE ?? r.STATE ?? r.state_code) === 1);

    const xmlBanks = rows.map(r => {
      const name = String(r.SHORTNAME ?? r.FULLNAME ?? r.NAME ?? '').trim();
      const state = r.COD_STATE ?? r.STATE ?? r.state_code;
      const mfo = String(r.MFO ?? r.ID_NBU ?? r.mfo_code ?? '').trim();
      const item = { name };
      if (onlyNormal || state !== undefined) item.state_code = Number(state ?? '');
      if (showMfo) item.mfo_code = mfo;
      return item;
    });

    const xml = builder.build({ banks: { bank: xmlBanks } });
    await mkdir(OUT, { recursive: true });
    await writeFile(path.join(OUT, 'last_response.xml'), xml, 'utf8');

    res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(xml);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(String(e.message || e));
  }
});

server.listen(opts.port, opts.host, () => {});
