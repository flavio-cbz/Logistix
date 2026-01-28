<<<<<<< HEAD
import { describe, it, expect } from 'vitest';
import {
    encryptSecret,
    decryptSecret,
    hashPassword,
    comparePassword,
    sha256Hex,
    signHmacHex
} from '@/lib/utils/crypto';

describe('Crypto Utils', () => {

    describe('Encryption/Decryption', () => {
        it('should roundtrip encrypt and decrypt', async () => {
            const plain = "Sensitive Data 123";
            const userId = "user-123";

            const encrypted = await encryptSecret(plain, userId);
            const decrypted = await decryptSecret(encrypted, userId);

            expect(decrypted).toBe(plain);
            expect(encrypted).not.toBe(plain);
        });

        it('should produce different ciphertexts for same plain text (IV usage)', async () => {
            const plain = "Data";
            const enc1 = await encryptSecret(plain, 'u1');
            const enc2 = await encryptSecret(plain, 'u1');
            expect(enc1).not.toBe(enc2);
        });

        it('should fail to decrypt with wrong key/user', async () => {
            const plain = "Data";
            const encrypted = await encryptSecret(plain, 'userA');

            // Decrypt with diff user
            // Note: In AES-GCM, wrong key usually results in Auth Tag check failure
            await expect(decryptSecret(encrypted, 'userB')).rejects.toThrow();
        });
    });

    describe('Password Hashing', () => {
        it('should hash and verify password', async () => {
            const pwd = "mySecurePassword!";
            const hash = await hashPassword(pwd);

            expect(hash).not.toBe(pwd);

            const isValid = await comparePassword(pwd, hash);
            expect(isValid).toBe(true);

            const isInvalid = await comparePassword("wrong", hash);
            expect(isInvalid).toBe(false);
        });
    });

    describe('Hashing Helpers', () => {
        it('should generate sha256 hex', () => {
            const input = "test";
            const hash = sha256Hex(input);
            expect(hash).toHaveLength(64); // 32 bytes hex
        });

        it('should sign hmac', () => {
            const key = "secret";
            const data = "message";
            const sig = signHmacHex(key, data);
            expect(sig).toHaveLength(64);
        });
    });
});
=======
import { describe, it, expect } from 'vitest';
import {
    encryptSecret,
    decryptSecret,
    hashPassword,
    comparePassword,
    sha256Hex,
    signHmacHex
} from '@/lib/utils/crypto';

describe('Crypto Utils', () => {

    describe('Encryption/Decryption', () => {
        it('should roundtrip encrypt and decrypt', async () => {
            const plain = "Sensitive Data 123";
            const userId = "user-123";

            const encrypted = await encryptSecret(plain, userId);
            const decrypted = await decryptSecret(encrypted, userId);

            expect(decrypted).toBe(plain);
            expect(encrypted).not.toBe(plain);
        });

        it('should produce different ciphertexts for same plain text (IV usage)', async () => {
            const plain = "Data";
            const enc1 = await encryptSecret(plain, 'u1');
            const enc2 = await encryptSecret(plain, 'u1');
            expect(enc1).not.toBe(enc2);
        });

        it('should fail to decrypt with wrong key/user', async () => {
            const plain = "Data";
            const encrypted = await encryptSecret(plain, 'userA');

            // Decrypt with diff user
            // Note: In AES-GCM, wrong key usually results in Auth Tag check failure
            await expect(decryptSecret(encrypted, 'userB')).rejects.toThrow();
        });
    });

    describe('Password Hashing', () => {
        it('should hash and verify password', async () => {
            const pwd = "mySecurePassword!";
            const hash = await hashPassword(pwd);

            expect(hash).not.toBe(pwd);

            const isValid = await comparePassword(pwd, hash);
            expect(isValid).toBe(true);

            const isInvalid = await comparePassword("wrong", hash);
            expect(isInvalid).toBe(false);
        });
    });

    describe('Hashing Helpers', () => {
        it('should generate sha256 hex', () => {
            const input = "test";
            const hash = sha256Hex(input);
            expect(hash).toHaveLength(64); // 32 bytes hex
        });

        it('should sign hmac', () => {
            const key = "secret";
            const data = "message";
            const sig = signHmacHex(key, data);
            expect(sig).toHaveLength(64);
        });
    });
});
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
