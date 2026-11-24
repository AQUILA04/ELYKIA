import { LoggerService } from './logger.service';

describe('LoggerService — rotation, utilisateur, export', () => {
  let files: Record<string, string>;
  let logger: LoggerService;

  beforeEach(() => {
    files = {};
    const fs: any = {};
    fs.stat = (async (o: any) => {
      if (!(o.path in files)) { throw new Error('absent'); }
      return { size: files[o.path].length, mtime: 0 };
    }) as any;
    fs.writeFile = (async (o: any) => { files[o.path] = o.data; return {}; }) as any;
    fs.appendFile = (async (o: any) => { files[o.path] = (files[o.path] ?? '') + o.data; }) as any;
    fs.readFile = (async (o: any) => {
      if (!(o.path in files)) { throw new Error('absent'); }
      return { data: files[o.path] };
    }) as any;
    fs.deleteFile = (async (o: any) => { delete files[o.path]; }) as any;
    fs.rename = (async (o: any) => {
      if (!(o.from in files)) { throw new Error('absent'); }
      files[o.to] = files[o.from]; delete files[o.from];
    }) as any;
    logger = new LoggerService();
    (logger as any).fs = fs;
    (logger as any).approxLogBytes = 0;
  });

  afterEach(() => LoggerService.setCurrentUsername(null));

  it('prefixes each line with the current username', async () => {
    LoggerService.setCurrentUsername('rm.test');
    logger.trace('hello');
    await new Promise(r => setTimeout(r, 20));
    expect(files['elykia/app_logs.txt']).toMatch(/\] \[rm\.test\] hello\n/);
  });

  it('rotates files once the size limit is reached and keeps three files', async () => {
    const chunk = 'x'.repeat(400_000);
    for (let i = 0; i < 9; i++) {
      logger.trace(chunk + i);
    }
    await new Promise(r => setTimeout(r, 100));
    const names = Object.keys(files).filter(n => n.startsWith('elykia/app_logs'));
    expect(names.sort()).toEqual(['elykia/app_logs.1.txt', 'elykia/app_logs.2.txt', 'elykia/app_logs.txt']);
    expect(files['elykia/app_logs.txt'].length).toBeLessThan(2 * LoggerService.MAX_LOG_BYTES);
  });

  it('exports the kept files oldest first into one file named after the user', async () => {
    files['elykia/app_logs.2.txt'] = 'old\n';
    files['elykia/app_logs.1.txt'] = 'mid\n';
    files['elykia/app_logs.txt'] = 'new\n';
    const path = await logger.exportLogs('rm.test');
    expect(path).toMatch(/^elykia\/journal-rm\.test-.*\.txt$/);
    expect(files[path!]).toBe('old\nmid\nnew\n');
  });

  it('exports nothing when there is no log', async () => {
    files = {};
    expect(await logger.exportLogs(null)).toBeNull();
  });
});
