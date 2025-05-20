"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskStatusToProgress = exports.TaskStatus = void 0;
// Task status definitions
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["PENDING"] = "pending";
    TaskStatus["EMAIL_SENT"] = "email_sent";
    TaskStatus["COMPLETED"] = "completed";
    TaskStatus["FAILED"] = "failed";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
;
// Progress mapping for task statuses
exports.taskStatusToProgress = {
    [TaskStatus.PENDING]: 0,
    [TaskStatus.EMAIL_SENT]: 25,
    [TaskStatus.COMPLETED]: 100,
    [TaskStatus.FAILED]: 100,
};
