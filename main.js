import http from 'http';
import { existsSync } from 'fs';
import { program } from 'commander';

// CLI: обов'язкові параметри
program
  .name('lab4-server')
  .requiredOption('-i, --input <path>', 'path to input JSON file (required)')
  .requiredOption('-h, --host <host>', 'server host (required)')
  .requiredOption('-p, --port <port>', 'server port (required)', (v) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n <= 0 || n > 65535) throw new Error('Invalid port');
    return n;
  });

program.parse(process.argv);
const opts = program.opts();

// Перевірка наявності файлу (точний текст за ТЗ)
if (!existsSync(opts.input)) {
  console.error('Cannot find input file');
  process.exit(1);
}

// Найпростіший HTTP-сервер (у Частині 2 додаси читання JSON та XML)
const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Server is running\n');
});

// Запуск сервера з переданими host/port
server.listen(opts.port, opts.host, () => {
  console.log(`Server listening at http://${opts.host}:${opts.port}`);
  console.log(`Input file: ${opts.input}`);
});
