import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { signHmacHex } from '../../utils/crypto';

let generateToken: (payload: Record<string, any>, expiresInMs?: number) => string;
let verifyToken: any;
let parseTokenUnsafe: any;

beforeAll(async () => {
  // Définir la clé avant l'import pour garantir des signatures déterministes
  (process.env as any)['AUTH_TOKEN_SECRET'] = 'test-secret';
  const mod = await import('./token-manager');
  generateToken = mod.generateToken;
  verifyToken = mod.verifyToken;
  parseTokenUnsafe = mod.parseTokenUnsafe;
});

afterAll(() => {
  delete process.env['AUTH_TOKEN_SECRET']!;
});

describe('token-manager', () => {
  it('génère et vérifie un token nominal', () => {
    const payload = { userId: 'u1', role: 'admin' };
    const token = generateToken(payload, 10000);
    expect(typeof token).toBe('string');
    const parts = token.split('.');
    expect(parts.length).toBe(3);

    const res = verifyToken(token);
    expect(res.valid).toBe(true);
    if ((res as any).valid) expect((res as any).payload).toMatchObject(payload);
  });

  it('détecte token mal formé ou vide', () => {
    expect(verifyToken('')).toEqual({ valid: false, reason: 'invalid_token' });
    const r = verifyToken('abc.def');
    expect(r.valid).toBe(false);
    expect((r as any).reason).toBe('invalid_format');
  });

  it('détecte expiration de token', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1600000000000);
    const token = generateToken({ x: 1 }, 1000); // expire in 1s
    vi.setSystemTime(1600000000000 + 2000); // avancer le temps au-delà de l'expiration
    const res = verifyToken(token);
    expect(res.valid).toBe(false);
    expect((res as any).reason).toBe('expired');
    vi.useRealTimers();
  });

  it('détecte signature modifiée', () => {
    const payload = { foo: 'bar' };
    const token = generateToken(payload, 10000);
    const parts = token.split('.');
    // Altérer légèrement la signature
    (parts as any)[2] = parts[2]!!.slice(0, -1) + (parts[2]!!.slice(-1) === 'a' ? 'b' : 'a');
    const tampered = parts.join('.');
    const res = verifyToken(tampered);
    expect(res.valid).toBe(false);
    expect((res as any).reason).toBe('bad_signature');
  });

  it('parseTokenUnsafe retourne le payload sans vérifier la signature', () => {
    const payload = { hello: 'world' };
    const token = generateToken(payload, 10000);
    const parsed = parseTokenUnsafe(token);
    expect(parsed).toMatchObject(payload);
    expect(parseTokenUnsafe('invalid')).toBeNull();
  });

  it('retourne invalid_expiry pour un expiry non numérique même si signature valide', () => {
    const payload = { a: 1 };
    const tokenParts = generateToken(payload, 10000).split('.');
    const payloadB64 = tokenParts[0]!;
    const fakeExpiry = 'notanumber';
    const sig = signHmacHex(process.env['AUTH_TOKEN_SECRET']! || 'test-secret', `${payloadB64}.${fakeExpiry}`);
    const token = `${payloadB64}.${fakeExpiry}.${sig}`;
    const res = verifyToken(token);
    expect(res.valid).toBe(false);
    expect((res as any).reason).toBe('invalid_expiry');
  });

  it('retourne invalid_payload pour un payload non JSON', () => {
    const invalidPayloadBuf = Buffer.from('}{', 'utf8');
    const b64 = invalidPayloadBuf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const expiry = String(Date.now() + 10000);
    const sig = signHmacHex(process.env['AUTH_TOKEN_SECRET']! || 'test-secret', `${b64}.${expiry}`);
    const token = `${b64}.${expiry}.${sig}`;
    const res = verifyToken(token);
    expect(res.valid).toBe(false);
    expect((res as any).reason).toBe('invalid_payload');
  });

  it('retourne signature_error si la signature n’est pas hex valide', () => {
    const token = generateToken({ x: 2 }, 10000);
    const parts = token.split('.');
    // Remplacer la signature par une chaîne non hex pour provoquer l'erreur
    const badSig = 'zz';
    const tampered = `${parts[0]!}.${parts[1]!}.${badSig}`;
    const res = verifyToken(tampered);
    expect(res.valid).toBe(false);
    expect((res as any).reason).toBe('signature_error');
  });
});