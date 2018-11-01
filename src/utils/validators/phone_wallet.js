const Firestore = require('../../handlers/firestore_handler')
const Responder = require('../../handlers/responder')

class PhoneWalletValidator {
    constructor(phone, service, serviceOptions) {
        this.phone = phone
        this.firstore = new Firestore(service, serviceOptions)
        this.responder = new Responder(serviceOptions)
    }

    async validate() {
        if (!this.phone) return false
        try {
            await this.firstore.fetchWalletByPhone(this.phone)
            return true
        } catch (_) {
            throw this.responder.response('failure', 'send', 'notRegistered', { entry: this.phone })
        }
    }
}

module.exports = PhoneWalletValidator
