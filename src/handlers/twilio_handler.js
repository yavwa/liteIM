class TwilioHandler {
    constructor() {
        this.client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    }

    send(to, body) {
        return this.client.messages.create({
            body,
            to,
            from: process.env.TWILIO_FROM_NUMBER
        })
    }
}

module.exports = TwilioHandler