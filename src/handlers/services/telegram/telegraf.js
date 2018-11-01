const Telegraf = require('telegraf')
const { Markup } = Telegraf

class TelegramBot {
    constructor() {
        let TelegramAPIKey = process.env.TELEGRAM_DEV_API_KEY
        if (process.env.STAGE === 'production') TelegramAPIKey =  process.env.TELEGRAM_PROD_API_KEY

        this.bot = new Telegraf(TelegramAPIKey)
        this.Markup = Markup
    }

    async sendMessage(id, text, opts) {
        return await this.bot.telegram.sendMessage(id, text, opts)
    }

    async sendPhoto(id, url, opts) {
        return await this.bot.telegram.sendPhoto(id, url, opts)
    }

    async answerCallback(id, text, alert = false, extra = null) {
        return await this.bot.telegram.answerCbQuery(id, text, alert, extra)
    }

    async editMessageText(id = null, messageId = null, text, extra) {
        return await this.bot.telegram.editMessageText(id, messageId, null, text, extra)
    }

    async deleteMessage(chatId, messageId) {
        return await this.bot.telegram.deleteMessage(chatId, messageId)
    }

    setWebhook(webhookUrl) {
        return this.bot.telegram.setWebhook(webhookUrl)
    }
}

module.exports = TelegramBot
