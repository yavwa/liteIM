const Firestore = require('../firestore_handler')
const ActionHandler = require('../action_handler')
const Responder = require('../responder')

const steps = ['type']

class ReceiveConvo {
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

    initialMessage() {
        return {
            success: true,
            message: this.responder.response('request', 'receive')
        }
    }

    async complete(value) {
        let serviceID = this.commandConvo.id
        let type = value.toLowerCase()
        type = type.trim()

        const ah = new ActionHandler(this.service, this.serviceOptions)
        let addresses = await ah.receive(this.user)

        await this.firestore.clearCommandPartial(serviceID)

        let { wallet, email } = addresses
        if (type === 'wallet') {
            return {
                success: true,
                message: wallet.toString()
            }
        } else if (type === 'qr') {
            let address = wallet.toString()
            let url = `https://chart.googleapis.com/chart?chs=250x250&cht=qr&chl=litecoin:${address}`

            return {
                success: true,
                extraData: { _type: 'image', caption: address, url },
                message: this.responder.response('success', 'receive', 'qr', {
                    url
                })
            }
        } else if (type === 'email') {
            return {
                success: true,
                message: email.toString()
            }
        }
    }

    async afterMessageForStep(step, value) {
        switch (step) {
            case steps[0]:
                let complete = await this.complete(value)
                return complete

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
            await this.firestore.setCommandPartial(this.commandConvo.id, params)
            return await this.afterMessageForStep(step, value)
        } catch (err) {
            throw err
        }
    }

    async validateStep(step, value) {
        value = value.trim()

        switch (step) {
            case steps[0]:
                let lowerCase = value.toLowerCase()
                return (
                    lowerCase === 'wallet' ||
                    lowerCase === 'qr' ||
                    lowerCase === 'email'
                )
            default:
                return false
        }
    }

    async clearStep(step) {
        await this.firestore.unsetCommandPartial(this.commandConvo.id, step)
    }
}

module.exports = ReceiveConvo
