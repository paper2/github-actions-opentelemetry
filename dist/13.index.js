export const id = 13;
export const ids = [13];
export const modules = {

/***/ 1223:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.execAsync = void 0;
const child_process = __webpack_require__(5317);
const util = __webpack_require__(9023);
exports.execAsync = util.promisify(child_process.exec);
//# sourceMappingURL=execAsync.js.map

/***/ }),

/***/ 13:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getMachineId = void 0;
const process = __webpack_require__(932);
const execAsync_1 = __webpack_require__(1223);
const api_1 = __webpack_require__(3914);
async function getMachineId() {
    const args = 'QUERY HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid';
    let command = '%windir%\\System32\\REG.exe';
    if (process.arch === 'ia32' && 'PROCESSOR_ARCHITEW6432' in process.env) {
        command = '%windir%\\sysnative\\cmd.exe /c ' + command;
    }
    try {
        const result = await (0, execAsync_1.execAsync)(`${command} ${args}`);
        const parts = result.stdout.split('REG_SZ');
        if (parts.length === 2) {
            return parts[1].trim();
        }
    }
    catch (e) {
        api_1.diag.debug(`error reading machine id: ${e}`);
    }
    return undefined;
}
exports.getMachineId = getMachineId;
//# sourceMappingURL=getMachineId-win.js.map

/***/ })

};

//# sourceMappingURL=13.index.js.map