"use strict";
/**
 * @file tasks.ts
 * @description Task related types for client-server communication
 * These types ensure consistent task formats between the client and server.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskStatus = void 0;
/**
 * Enumeration of all possible task statuses
 * Represents the lifecycle of a task from creation to completion
 */
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["PENDING"] = "pending";
    TaskStatus["PROCESSING"] = "processing";
    TaskStatus["COMPLETED"] = "completed";
    TaskStatus["FAILED"] = "failed";
    TaskStatus["CANCELLED"] = "cancelled";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
