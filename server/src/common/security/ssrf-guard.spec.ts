import * as dns from 'dns/promises';
import { assertPublicHttpUrl, UnsafeUrlError } from './ssrf-guard';

jest.mock('dns/promises');

const mockedLookup = dns.lookup as jest.MockedFunction<typeof dns.lookup>;

describe('assertPublicHttpUrl', () => {
  afterEach(() => jest.resetAllMocks());

  it('rejects a literal loopback IP without a DNS lookup', async () => {
    await expect(assertPublicHttpUrl('http://127.0.0.1/x')).rejects.toThrow(
      UnsafeUrlError,
    );
    expect(mockedLookup).not.toHaveBeenCalled();
  });

  it('rejects a literal link-local / cloud-metadata IP (169.254.169.254)', async () => {
    await expect(
      assertPublicHttpUrl('http://169.254.169.254/latest/meta-data'),
    ).rejects.toThrow(UnsafeUrlError);
  });

  it('rejects a private RFC1918 IP', async () => {
    await expect(assertPublicHttpUrl('http://10.0.0.5/')).rejects.toThrow(
      UnsafeUrlError,
    );
    await expect(assertPublicHttpUrl('http://192.168.1.1/')).rejects.toThrow(
      UnsafeUrlError,
    );
  });

  it('rejects "localhost"', async () => {
    await expect(assertPublicHttpUrl('http://localhost/')).rejects.toThrow(
      UnsafeUrlError,
    );
  });

  it('rejects non-http(s) schemes', async () => {
    await expect(assertPublicHttpUrl('file:///etc/passwd')).rejects.toThrow(
      UnsafeUrlError,
    );
  });

  it('rejects a public hostname that resolves to a private address', async () => {
    mockedLookup.mockResolvedValue([
      { address: '127.0.0.1', family: 4 },
    ] as never);

    await expect(
      assertPublicHttpUrl('http://evil.example.com/'),
    ).rejects.toThrow(UnsafeUrlError);
  });

  it('accepts a public hostname resolving to a public address', async () => {
    mockedLookup.mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
    ] as never);

    await expect(
      assertPublicHttpUrl('https://example.com/page'),
    ).resolves.toBeInstanceOf(URL);
  });
});
