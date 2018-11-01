const Firestore = require('../firestore_handler')
const ActionHandler = require('../action_handler')
const Responder = require('../responder')

const steps = ['type', 'code']

class ExportConvo {
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
            message: this.responder.response('request', 'export', 'type')
        }
    }

    async complete(value) {
        let serviceID = this.commandConvo.id
        let type = this.commandConvo.data().type.toLowerCase()
        try {
            let secret = await new ActionHandler(
                this.service,
                this.serviceOptions
            ).export(this.user, type, value)
            await this.firestore.clearCommandPartial(serviceID)
            let message
            if (type === 'key') {
                message = this.serviceOptions.htmlSupport
                    ? `<pre>${secret}</pre>`
                    : secret
                return {
                    success: true,
                    message
                }
            } else if (type === 'phrase') {
                message = this.serviceOptions.htmlSupport
                    ? `<pre>${secret}</pre>`
                    : secret
                return {
                    success: true,
                    message
                }
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
            case steps[0]: //send 2fa code, and prompt user to enter it
                try {
                    await new ActionHandler(
                        this.service,
                        this.serviceOptions
                    ).request2FA(this.user.id)
                    return {
                        success: true,
                        message: this.responder.response('request', 'export', 'code')
                    }
                } catch (err) {
                    await this.clearStep(step)
                    return {
                        success: false,
                        message: err
                    }
                }

            case steps[1]: //check 2fa code, and prompt user to enter password
                try {
                    await new ActionHandler(
                        this.service,
                        this.serviceOptions
                    ).check2FA(serviceID, value, this.user.id)
                    return {
                        success: true,
                        message: this.responder.response(
                            'request',
                            'export',
                            'password'
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
            await this.firestore.setCommandPartial(
                this.commandConvo.id,
                params,
                true,
                false
            )
            return this.afterMessageForStep(step, value)
        } catch (err) {
            throw err
        }
    }

    async validateStep(step, value) {
        switch (step) {
            case steps[0]:
                let lowerCase = value.toLowerCase()
                return lowerCase === 'key' || lowerCase === 'phrase'
            case steps[1]:
                return true
            default:
                return false
        }
    }

    async clearStep(step) {
        await this.firestore.unsetCommandPartial(this.commandConvo.id, step)
    }
}

module.exports = ExportConvo
