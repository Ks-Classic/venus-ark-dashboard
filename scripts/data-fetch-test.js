"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv_1 = require("dotenv");
var googleapis_1 = require("googleapis");
var google_auth_library_1 = require("google-auth-library");
var client_1 = require("@notionhq/client");
// .envファイルをロード
(0, dotenv_1.config)({ path: '.env.local' });
// Google Sheets APIクライアントの初期化
var googleAuth = new google_auth_library_1.JWT({
    email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    key: (_a = process.env.GOOGLE_SHEETS_PRIVATE_KEY) === null || _a === void 0 ? void 0 : _a.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});
var sheets = googleapis_1.google.sheets({ version: 'v4', auth: googleAuth });
// Notion APIクライアントの初期化
var notion = new client_1.Client({
    auth: process.env.NOTION_API_KEY,
});
function fetchGoogleSheetData(spreadsheetId, sheetName) {
    return __awaiter(this, void 0, void 0, function () {
        var range, response, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    range = sheetName ? "".concat(sheetName, "!A:Z") : 'A:Z';
                    return [4 /*yield*/, sheets.spreadsheets.values.get({
                            spreadsheetId: spreadsheetId,
                            range: range,
                        })];
                case 1:
                    response = _a.sent();
                    return [2 /*return*/, response.data.values || []];
                case 2:
                    error_1 = _a.sent();
                    console.error("Google Sheet\u30C7\u30FC\u30BF\u53D6\u5F97\u30A8\u30E9\u30FC (".concat(spreadsheetId, ", ").concat(sheetName || '全シート', "):"), error_1);
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function fetchNotionDatabaseData(databaseId) {
    return __awaiter(this, void 0, void 0, function () {
        var response, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, notion.databases.query({
                            database_id: databaseId,
                            page_size: 5, // 最初の5件のみ取得
                        })];
                case 1:
                    response = _a.sent();
                    return [2 /*return*/, response.results];
                case 2:
                    error_2 = _a.sent();
                    console.error("Notion DB\u30C7\u30FC\u30BF\u53D6\u5F97\u30A8\u30E9\u30FC (".concat(databaseId, "):"), error_2);
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function getSpreadsheetSheetNames(spreadsheetId) {
    return __awaiter(this, void 0, void 0, function () {
        var response, error_3;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, sheets.spreadsheets.get({
                            spreadsheetId: spreadsheetId,
                            fields: 'sheets.properties.title',
                        })];
                case 1:
                    response = _b.sent();
                    return [2 /*return*/, ((_a = response.data.sheets) === null || _a === void 0 ? void 0 : _a.map(function (sheet) { var _a; return ((_a = sheet.properties) === null || _a === void 0 ? void 0 : _a.title) || ''; })) || []];
                case 2:
                    error_3 = _b.sent();
                    console.error("\u30B9\u30D7\u30EC\u30C3\u30C9\u30B7\u30FC\u30C8\u306E\u30B7\u30FC\u30C8\u540D\u53D6\u5F97\u30A8\u30E9\u30FC (".concat(spreadsheetId, "):"), error_3);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function runDataFetchTest() {
    return __awaiter(this, void 0, void 0, function () {
        var mainRecruitmentSheetId, sheetNames, _i, sheetNames_1, sheetName, data, googleFormSubmissionSheetId, data, notionMemberDbId, data, notionProjectDbId, data, notionMeetingDbId, data, notionMemberProjectStatusDbId, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('--- データ取得テスト開始 ---');
                    mainRecruitmentSheetId = process.env.MAIN_RECRUITMENT_SPREADSHEET_ID;
                    if (!mainRecruitmentSheetId) return [3 /*break*/, 8];
                    console.log("\n--- \u30E1\u30A4\u30F3\u63A1\u7528\u7BA1\u7406\u30B9\u30D7\u30EC\u30C3\u30C9\u30B7\u30FC\u30C8 (".concat(mainRecruitmentSheetId, ") ---"));
                    return [4 /*yield*/, getSpreadsheetSheetNames(mainRecruitmentSheetId)];
                case 1:
                    sheetNames = _a.sent();
                    if (!(sheetNames.length > 0)) return [3 /*break*/, 6];
                    _i = 0, sheetNames_1 = sheetNames;
                    _a.label = 2;
                case 2:
                    if (!(_i < sheetNames_1.length)) return [3 /*break*/, 5];
                    sheetName = sheetNames_1[_i];
                    console.log("  - \u30B7\u30FC\u30C8\u540D: ".concat(sheetName));
                    return [4 /*yield*/, fetchGoogleSheetData(mainRecruitmentSheetId, sheetName)];
                case 3:
                    data = _a.sent();
                    if (data && data.length > 0) {
                        console.log('    [データサンプル (最初の5行)]:', data.slice(0, 5));
                    }
                    else {
                        console.log('    [データなし、または取得失敗]');
                    }
                    _a.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: return [3 /*break*/, 7];
                case 6:
                    console.log('  シート名が見つかりませんでした。');
                    _a.label = 7;
                case 7: return [3 /*break*/, 9];
                case 8:
                    console.log('MAIN_RECRUITMENT_SPREADSHEET_ID が設定されていません。');
                    _a.label = 9;
                case 9:
                    googleFormSubmissionSheetId = process.env.GOOGLE_FORM_SUBMISSION_SPREADSHEET_ID;
                    if (!googleFormSubmissionSheetId) return [3 /*break*/, 11];
                    console.log("\n--- Google\u30D5\u30A9\u30FC\u30E0\u63D0\u51FA\u30B9\u30D7\u30EC\u30C3\u30C9\u30B7\u30FC\u30C8 (".concat(googleFormSubmissionSheetId, ") ---"));
                    return [4 /*yield*/, fetchGoogleSheetData(googleFormSubmissionSheetId)];
                case 10:
                    data = _a.sent();
                    if (data && data.length > 0) {
                        console.log('  [データサンプル (最初の5行)]:', data.slice(0, 5));
                    }
                    else {
                        console.log('  [データなし、または取得失敗]');
                    }
                    return [3 /*break*/, 12];
                case 11:
                    console.log('GOOGLE_FORM_SUBMISSION_SPREADSHEET_ID が設定されていません。');
                    _a.label = 12;
                case 12:
                    notionMemberDbId = process.env.NOTION_MEMBER_DB_ID;
                    if (!notionMemberDbId) return [3 /*break*/, 14];
                    console.log("\n--- Notion \u30E1\u30F3\u30D0\u30FCDB (".concat(notionMemberDbId, ") ---"));
                    return [4 /*yield*/, fetchNotionDatabaseData(notionMemberDbId)];
                case 13:
                    data = _a.sent();
                    if (data && data.length > 0) {
                        console.log('  [データサンプル (最初の5件のプロパティ)]:', data.map(function (item) { return item.properties; }).slice(0, 5));
                    }
                    else {
                        console.log('  [データなし、または取得失敗]');
                    }
                    return [3 /*break*/, 15];
                case 14:
                    console.log('NOTION_MEMBER_DB_ID が設定されていません。');
                    _a.label = 15;
                case 15:
                    notionProjectDbId = process.env.NOTION_PROJECT_DB_ID;
                    if (!notionProjectDbId) return [3 /*break*/, 17];
                    console.log("\n--- Notion \u6848\u4EF6DB (".concat(notionProjectDbId, ") ---"));
                    return [4 /*yield*/, fetchNotionDatabaseData(notionProjectDbId)];
                case 16:
                    data = _a.sent();
                    if (data && data.length > 0) {
                        console.log('  [データサンプル (最初の5件のプロパティ)]:', data.map(function (item) { return item.properties; }).slice(0, 5));
                    }
                    else {
                        console.log('  [データなし、または取得失敗]');
                    }
                    return [3 /*break*/, 18];
                case 17:
                    console.log('NOTION_PROJECT_DB_ID が設定されていません。');
                    _a.label = 18;
                case 18:
                    notionMeetingDbId = process.env.NOTION_MEETING_DB_ID;
                    if (!notionMeetingDbId) return [3 /*break*/, 20];
                    console.log("\n--- Notion \u9762\u8AC7\u8B70\u4E8B\u9332DB (".concat(notionMeetingDbId, ") ---"));
                    return [4 /*yield*/, fetchNotionDatabaseData(notionMeetingDbId)];
                case 19:
                    data = _a.sent();
                    if (data && data.length > 0) {
                        console.log('  [データサンプル (最初の5件のプロパティ)]:', data.map(function (item) { return item.properties; }).slice(0, 5));
                    }
                    else {
                        console.log('  [データなし、または取得失敗]');
                    }
                    return [3 /*break*/, 21];
                case 20:
                    console.log('NOTION_MEETING_DB_ID が設定されていません。');
                    _a.label = 21;
                case 21:
                    notionMemberProjectStatusDbId = process.env.NOTION_MEMBER_PROJECT_STATUS_DB_ID;
                    if (!notionMemberProjectStatusDbId) return [3 /*break*/, 23];
                    console.log("\n--- Notion \u30E1\u30F3\u30D0\u30FC\u5225\u6848\u4EF6\u72B6\u6CC1\u7BA1\u7406DB (".concat(notionMemberProjectStatusDbId, ") ---"));
                    return [4 /*yield*/, fetchNotionDatabaseData(notionMemberProjectStatusDbId)];
                case 22:
                    data = _a.sent();
                    if (data && data.length > 0) {
                        console.log('  [データサンプル (最初の5件のプロパティ)]:', data.map(function (item) { return item.properties; }).slice(0, 5));
                    }
                    else {
                        console.log('  [データなし、または取得失敗]');
                    }
                    return [3 /*break*/, 24];
                case 23:
                    console.log('NOTION_MEMBER_PROJECT_STATUS_DB_ID が設定されていません。');
                    _a.label = 24;
                case 24:
                    console.log('--- データ取得テスト終了 ---');
                    return [2 /*return*/];
            }
        });
    });
}
runDataFetchTest();
