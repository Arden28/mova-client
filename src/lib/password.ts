import { hash, verify } from "@node-rs/argon2"

export async function hasPasword(plain: string) {
    return hash(plain, {
        memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32,
        salt: crypto.getRandomValues(new Uint8Array(16)),
        variant: 2, // Argon2id
    })
}

export async function verifyPassword(hashStr: string, plain: string) {
    try { return await verify(hashStr, plain) } catch { return false }
}