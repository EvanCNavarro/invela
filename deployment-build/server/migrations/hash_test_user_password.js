"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashTestUserPassword = hashTestUserPassword;
const _db_1 = require("@db");
const drizzle_orm_1 = require("drizzle-orm");
const bcrypt_1 = __importDefault(require("bcrypt"));
const SALT_ROUNDS = 10;
async function hashPassword(password) {
    try {
        console.log('[Migration] Starting to hash password');
        const hashedPassword = await bcrypt_1.default.hash(password, SALT_ROUNDS);
        console.log('[Migration] Password hashed successfully:', {
            hashLength: hashedPassword.length,
            startsWithBcrypt: hashedPassword.startsWith('$2b$'),
            rounds: SALT_ROUNDS
        });
        return hashedPassword;
    }
    catch (error) {
        console.error('[Migration] Error hashing password:', error);
        throw error;
    }
}
async function hashTestUserPassword() {
    try {
        console.log('[Migration] Starting test user password update');
        // Hash the password 'password123' with bcrypt
        const hashedPassword = await hashPassword('password123');
        console.log('[Migration] Updating test user password in database');
        // Update John Doe's password
        await _db_1.db.execute((0, drizzle_orm_1.sql) `
      UPDATE users 
      SET password = ${hashedPassword}
      WHERE email = 'john.doe@testcompany.com';
    `);
        console.log('[Migration] Successfully updated test user password');
    }
    catch (error) {
        console.error('[Migration] Error updating test user password:', error);
        throw error;
    }
}
