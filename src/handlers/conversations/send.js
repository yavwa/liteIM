const Firestore = require('../firestore_handler')
const ActionHandler = require('../action_handler')
const Responder = require('../responder')
const NumberValidator = require('../../utils/validators/number')
const PhoneWalletValidator = require('../../utils/validators/phone_wallet')
const EmailWalletValidator = require('../../utils/validators/email_wallet')

const steps = ['to', 'currency', 'amount', 'code']

class SendConvo {
    constructor(commandConvo, user, service, serviceOptions) {
        this.user = user
        this.service = service
        this.commandConvo = commandConvo
        this.firestore = new Firestore(service, serviceOptions)
        this.responder = new Responder(serviceOptions)
        this.serviceOptions = serviceOptions
    }

    currentStep() {
        for (let i = 0; i < steps.length; i++) {
            let step = steps[i]
            if (!this.commandConvo.data()[step]) return step
        }
    }

    async initialMessage(userID) {
        let balance = await new ActionHandler(
            this.service,
            this.serviceOptions
        ).balance(userID)
        if (typeof balance !== undefined) {
            if (Number(balance) > 0) {
                return {
                    success: true,
                    message: this.responder.response('request', 'send', 'to')
                }
            } else {
                return {
                    success: false,
                    message: this.responder.response(
                        'failure',
                        'send',
                        'zeroBalance'
                    )
                }
            }
        } else {
            return {
                success: false,
                message: this.responder.response('failure', 'send', 'fetchBalance')
            }
        }
    }

    async complete(value) {
        let serviceID = this.commandConvo.id
        let { to, amount } = this.commandConvo.data()

        try {
            let data = await new ActionHandler(
                this.service,
                this.serviceOptions
            ).send(to, amount, value, this.user)
            let { txid, toAddress } = data

            let subdomain =
                process.env.STAGE === 'production' || process.env.STAGE === 'staging'
                    ? 'insight'
                    : 'testnet'

            let extraData = {
                txid: txid,
                url: `https://${subdomain}.litecore.io/tx/${txid}/`
            }

            let notifier = {}
            if (toAddress) {
                notifier = {
                    address: toAddress,
                    sender: this.user.email,
                    txid,
                    amount
                }
            }

            await this.firestore.clearCommandPartial(serviceID)
            return {
                success: true,
                message: this.responder.response('success', 'send', 'sender'),
                extraData,
                notifier
            }
        } catch (err) {
            return {
                success: false,
                message: err
            }
        }
    }

    async afterMessageForStep(step, value) {
        let serviceID = this.commandConvo.id
        switch (step) {
            case steps[0]:
                return {
                    success: true,
                    message: this.responder.response('request', 'send', 'currency')
                }
            case steps[1]:
                let to = this.commandConvo.data().to
                let currency = value
                return {
                    success: true,
                    message: this.responder.response('request', 'send', 'amount', {
                        to,
                        currency
                    })
                }
            case steps[2]:
                let amount = value
                if (amount === 'all') {
                    let getBalance = await new ActionHandler(
                        this.service,
                        this.serviceOptions
                    ).balance(this.user.id)
                    if (getBalance) {
                        let balance = Number(getBalance)
                        amount = balance

                        if (this.commandConvo.data().currency === '$') {
                            try {
                                let rate = await require('../../utils/getPrice')()
                                amount = (amount * rate).toFixed(2)
                            } catch (err) {
                                throw err
                            }
                        }
                    } else {
                        return {
                            success: false,
                            message: this.responder.response(
                                'failure',
                                'send',
                                'fetchBalance'
                            )
                        }
                    }
                }

                if (this.commandConvo.data().currency === '$') {
                    if (typeof amount === 'string' && amount.charAt(0) === '$')
                        amount = amount.substr(1)
                    try {
                        let rate = await require('../../utils/getPrice')()
                        let amountLTC = (amount / rate).toFixed(4)
                        let params = {}
                        params['amount'] = amountLTC
                        await this.firestore.setCommandPartial(
                            this.commandConvo.id,
                            params,
                            true,
                            false
                        )
                    } catch (err) {
                        throw err
                    }
                }

                try {
                    await new ActionHandler(
                        this.service,
                        this.serviceOptions
                    ).request2FA(this.user.id)

                    let message =
                        amount === 'all'
                            ? this.responder.response('request', 'sendAll', 'code')
                            : this.responder.response('request', 'send', 'code')

                    return {
                        success: true,
                        message
                    }
                } catch (err) {
                    await this.clearStep(step)
                    return {
                        success: false,
                        message: err
                    }
                }
            case steps[3]:
                try {
                    await new ActionHandler(
                        this.service,
                        this.serviceOptions
                    ).check2FA(serviceID, value, this.user.id)
                    let amount = this.commandConvo.data().amount
                    let to = this.commandConvo.data().to

                    if (amount !== 'all') amount = `Ł${amount}`

                    return {
                        success: true,
                        message: this.responder.response(
                            'request',
                            'send',
                            'password',
                            { amount, to }
                        )
                    }
                } catch (err) {
                    await this.clearStep(step)
                    return {
                        success: false,
                        message: err
                    }
                }
            default:
                return {
                    success: false,
                    message: this.responder.response(
                        'failure',
                        'conversation',
                        'unexpectedInput'
                    )
                }
        }
    }

    async setCurrentStep(value) {
        let currentStep = this.currentStep()
        if (currentStep) {
            return await this.setStep(currentStep, value)
        } else {
            return await this.complete(value)
        }
    }

    async setStep(step, value) {
        let validated = await this.validateStep(step, value)
        if (!validated)
            throw this.responder.response('failure', 'conversation', 'invalidStep', {
                step
            })
        let params = {}
        params[step] = value
        try {

            let allowMenu = false
            if (step === 'to' || step ==='amount'){
                allowMenu = true
        }


            await this.firestore.setCommandPartial(
                this.commandConvo.id,
                params,
                true,
                allowMenu
            )
            return this.afterMessageForStep(step, value)
        } catch (err) {
            throw err
        }
    }

    async validateStep(step, value) {
        switch (step) {
            case steps[0]:
                let ah = new ActionHandler(this.service, this.serviceOptions)
                if (ah.isEmail(value)) {
                    return await new EmailWalletValidator(
                        value,
                        this.service,
                        this.serviceOptions.keyboardSupport
                    ).validate()
                } else if (ah.isPhoneNumber(value)) {
                    return await new PhoneWalletValidator(
                        value,
                        this.service,
                        this.serviceOptions.keyboardSupport
                    ).validate()
                } else return ah.isLitecoinAddress(value)
            case steps[1]:
                let lowerCase = value.toLowerCase()
                if (
                    lowerCase === 'usd' ||
                    lowerCase === 'u' ||
                    lowerCase === 'dollars'
                ) {
                    await this.firestore.setCommandPartial(
                        this.commandConvo.id,
                        { currency: '$' },
                        true,
                        false
                    )
                    value = '$'
                } else if (
                    lowerCase === 'l' ||
                    lowerCase === 'litecoin' ||
                    lowerCase === 'ltc'
                ) {
                    await this.firestore.setCommandPartial(
                        this.commandConvo.id,
                        { currency: 'Ł' },
                        true,
                        false
                    )
                    value = 'Ł'
                }

                return value === '$' || value === 'Ł'
            case steps[2]:
                if (value === 'all') return true
                if (value.charAt(0) === '$') value = value.substr(1)
                return new NumberValidator(value).validate()
            case steps[3]:
                return true
            default:
                return false
        }
    }

    async clearStep(step) {
        await this.firestore.unsetCommandPartial(this.commandConvo.id, step)
    }
}

module.exports = SendConvo
