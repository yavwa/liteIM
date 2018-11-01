const TelegramBot = require('./telegraf')
const Firestore = require('../../firestore_handler')

class TelegramMessenger {
    constructor(telegramID, callbackMessageID = null) {
        this.telegramID = telegramID
        this.callbackMessageID = callbackMessageID
        this.bot = new TelegramBot()
    }

    // send message to telegram user
    async sendMessage(text, opts = {}) {
        opts.parse_mode = 'html'
        await this.bot
            .sendMessage(this.telegramID, text, opts)
            .then(async success => {
                // console.log("OUT:")
                // console.log(success)
                await new Firestore('telegram', true).setBotMessageID(
                    this.telegramID,
                    success.message_id
                )
            })
            .catch(failure => {
                console.log(`Error sending message to ${this.telegramID}`, failure)
            })
    }

    async sendPhoto(url, caption, opts = {}) {
        if (caption) opts.caption = caption
        await this.bot
            .sendPhoto(this.telegramID, url, opts)
            .then(async success => {
                await new Firestore('telegram', true).setBotMessageID(
                    this.telegramID,
                    success.message_id
                )
            })
            .catch(failure => {
                console.log(`Error sending message to ${this.telegramID}`, failure)
            })
    }

    async editMessage(text, opts = {}) {
        let messageID = this.callbackMessageID
        if (!messageID) {
            let messageIdToEdit = await new Firestore(
                'telegram',
                true
            ).getBotMessageID(this.telegramID)
            messageID = messageIdToEdit.messageID
        }

        opts.parse_mode = 'html'
        await this.bot
            .editMessageText(this.telegramID, messageID, text, opts)
            .then(success => {
                // console.log("OUT:")
                // console.log(success)
            })
            .catch(failure => {
                console.log(
                    `Error editing message to ${
                        this.telegramID
                    }, message: ${messageID}`,
                    failure
                )
                throw 'Could not edit message.'
            })
    }

    async deleteMessage(messageID = null) {
        if (!messageID) {
            let messageIdToDelete = await new Firestore(
                'telegram',
                true
            ).getBotMessageID(this.telegramID)
            messageID = messageIdToDelete.messageID
        }

        await this.bot
            .deleteMessage(this.telegramID, messageID)
            .then(() => {
                return true
            })
            .catch(failure => {
                console.log(
                    `Could not delete message ${messageID} for ${this.telegramID}.`
                )
                return false
            })
    }

    inlineKeyboard(buttonLayout) {
        if (buttonLayout) {
            return this.bot.Markup.inlineKeyboard(buttonLayout).extra()
        } else {
            return []
        }
    }
}

module.exports = TelegramMessenger
