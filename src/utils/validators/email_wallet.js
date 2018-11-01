const Firestore = require('../../handlers/firestore_handler')
const Responder = require('../../handlers/responder')

class EmailWalletValidator {
    constructor(email, service, serviceOptions) {
        this.email = email
        this.firstore = new Firestore(service, serviceOptions)
        this.responder = new Responder(serviceOptions)
    }

    async validate() {
        if (!this.email) return false
        try {
            await this.firstore.fetchWalletByEmail(this.email)
            return true
        } catch (_) {
            throw this.responder.response('failure', 'send', 'notRegistered', { entry: this.email })
        }
    }
}

module.exports = EmailWalletValidator
