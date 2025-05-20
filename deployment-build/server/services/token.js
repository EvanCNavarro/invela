"use strict";
/**
 * @file token.ts
 * @description Service for managing refresh tokens.
 * Handles token generation, verification, and revocation for the authentication system.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRefreshToken = generateRefreshToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.revokeRefreshToken = revokeRefreshToken;
exports.revokeAllUserRefreshTokens = revokeAllUserRefreshTokens;
const crypto_1 = __importDefault(require("crypto"));
const drizzle_orm_1 = require("drizzle-orm");
const db_adapter_1 = require("../utils/db-adapter");
// Token expiration time (30 days)
const REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days
/**
 * Generates a new refresh token for a user.
 * Creates a secure random token and stores it in the database with an expiration date.
 *
 * @param userId - The ID of the user to generate a token for
 * @returns The generated token string
 */
async function generateRefreshToken(userId) {
    // Generate a secure random token
    const token = crypto_1.default.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY);
    // Get database and schema objects from the adapter
    const db = (0, db_adapter_1.getDb)();
    const { refreshTokens } = (0, db_adapter_1.getSchemas)();
    // Store the token in the database
    await db.insert(refreshTokens).values({
        user_id: userId,
        token,
        expires_at: expiresAt
    });
    console.log(`[Auth] Generated refresh token for user ${userId}, expires: ${expiresAt.toISOString()}`);
    return token;
}
/**
 * Verifies a refresh token and returns the associated user ID if valid.
 * Checks if the token exists and has not expired.
 * Automatically deletes expired tokens.
 *
 * @param token - The refresh token to verify
 * @returns The user ID associated with the token, or null if invalid
 */
async function verifyRefreshToken(token) {
    console.log('[Auth] Verifying refresh token');
    // Using executeWithNeonRetry for resilient database operations
    return await (0, db_adapter_1.executeWithNeonRetry)(async (db) => {
        const { refreshTokens } = (0, db_adapter_1.getSchemas)();
        // Find the token in the database
        const result = await db.select()
            .from(refreshTokens)
            .where((0, drizzle_orm_1.eq)(refreshTokens.token, token))
            .limit(1);
        if (result.length === 0) {
            console.log('[Auth] Refresh token not found');
            return null;
        }
        const refreshToken = result[0];
        // Check if the token has expired
        if (new Date(refreshToken.expires_at) < new Date()) {
            console.log('[Auth] Refresh token expired, deleting');
            // Token expired, delete it
            await db.delete(refreshTokens)
                .where((0, drizzle_orm_1.eq)(refreshTokens.id, refreshToken.id));
            return null;
        }
        console.log(`[Auth] Refresh token valid for user ${refreshToken.user_id}`);
        return refreshToken.user_id;
    });
}
/**
 * Revokes a specific refresh token.
 * Deletes the token from the database, making it invalid for future use.
 *
 * @param token - The token to revoke
 */
async function revokeRefreshToken(token) {
    console.log('[Auth] Revoking refresh token');
    // Using executeWithNeonRetry for resilient database operations
    await (0, db_adapter_1.executeWithNeonRetry)(async (db) => {
        const { refreshTokens } = (0, db_adapter_1.getSchemas)();
        await db.delete(refreshTokens)
            .where((0, drizzle_orm_1.eq)(refreshTokens.token, token));
    });
}
/**
 * Revokes all refresh tokens for a specific user.
 * Used when changing passwords or during account security events.
 *
 * @param userId - The ID of the user whose tokens should be revoked
 */
async function revokeAllUserRefreshTokens(userId) {
    console.log(`[Auth] Revoking all refresh tokens for user ${userId}`);
    // Using executeWithNeonRetry for resilient database operations
    await (0, db_adapter_1.executeWithNeonRetry)(async (db) => {
        const { refreshTokens } = (0, db_adapter_1.getSchemas)();
        await db.delete(refreshTokens)
            .where((0, drizzle_orm_1.eq)(refreshTokens.user_id, userId));
    });
}
