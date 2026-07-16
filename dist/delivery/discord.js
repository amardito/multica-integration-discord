"use strict";
/**
 * Discord delivery adapter.
 *
 * The actual HTTP transport is abstracted behind `DiscordTransport` so tests can
 * substitute a fake. The production transport uses Node's built-in `https` module
 * to avoid extra dependencies.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscordDelivery = void 0;
exports.renderMessage = renderMessage;
exports.sendToWebhook = sendToWebhook;
exports.truncateErrorBody = truncate;
class DiscordDelivery {
    transport;
    constructor(config = {}) {
        if (config.transport) {
            this.transport = config.transport;
        }
        else if (config.webhookUrl) {
            this.transport = createHttpTransport(config.webhookUrl);
        }
        else {
            throw new Error('DiscordDelivery requires either webhookUrl or transport');
        }
    }
    /**
     * Deliver a formatted alert to the configured channel.
     *
     * Swallows errors and returns a failure object so the caller can log safely
     * without crashing the bot.
     */
    async send(alert) {
        const message = [
            `**${alert.title}**`,
            '',
            alert.body,
            '',
            `_${alert.footer}_`,
        ].join('\n');
        try {
            return await this.transport.send(message);
        }
        catch (err) {
            const reason = err instanceof Error ? err.message : String(err);
            return { ok: false, error: `discord delivery failed: ${reason}` };
        }
    }
}
exports.DiscordDelivery = DiscordDelivery;
/** Render a normalized alert into a plain-text message suitable for Discord. */
function renderMessage(alert) {
    return [
        `**${alert.title}**`,
        '',
        alert.body,
        '',
        `_${alert.footer}_`,
    ].join('\n');
}
function createHttpTransport(webhookUrl) {
    return {
        async send(message) {
            return sendToWebhook(webhookUrl, message);
        },
    };
}
/** Production webhook sender using only built-in modules. */
function sendToWebhook(webhookUrl, content) {
    return new Promise((resolve) => {
        if (!webhookUrl.startsWith('https://')) {
            resolve({ ok: false, error: 'invalid webhook URL: must use https://' });
            return;
        }
        if (content.length === 0) {
            resolve({ ok: false, error: 'empty message content' });
            return;
        }
        // Dynamic import keeps the module loadable in test environments that may
        // stub Node's https module.
        Promise.resolve().then(() => __importStar(require('node:https'))).then(({ default: https, request }) => {
            const url = new URL(webhookUrl);
            const payload = JSON.stringify({ content });
            const req = request({
                hostname: url.hostname,
                port: url.port || 443,
                path: url.pathname + url.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload),
                },
            }, (res) => {
                const status = res.statusCode ?? 0;
                if (status >= 200 && status < 300) {
                    resolve({ ok: true });
                }
                else {
                    let body = '';
                    res.setEncoding('utf8');
                    res.on('data', (chunk) => {
                        body += chunk;
                    });
                    res.on('end', () => {
                        resolve({
                            ok: false,
                            error: `discord returned HTTP ${status}: ${truncate(body, 200)}`,
                        });
                    });
                    res.on('error', () => {
                        resolve({ ok: false, error: `discord returned HTTP ${status}` });
                    });
                }
            });
            req.on('error', (err) => {
                resolve({ ok: false, error: `request failed: ${err.message}` });
            });
            req.write(payload);
            req.end();
        })
            .catch((err) => {
            resolve({ ok: false, error: `transport unavailable: ${err instanceof Error ? err.message : String(err)}` });
        });
    });
}
function truncate(value, max) {
    if (value.length <= max)
        return value;
    return `${value.slice(0, max - 3)}...`;
}
//# sourceMappingURL=discord.js.map