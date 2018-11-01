const Firestore = require('../firestore_handler')
const ActionHandler = require('../action_handler')
const Responder = require('../responder')
const PhoneNumberValidator = require('../../utils/validators/phoneNumber')

const steps = ['number', 'code']

class Enable2FAConvo {
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
            message: this.responder.response('request', 'enable2FA', 'number')
        }
    }

    async complete(value) {
        let serviceID = this.commandConvo.id

        try {
            await new ActionHandler(this.service, this.serviceOptions).checkPassword(this.user.email, value)
            await this.firestore.updateIdOn2FA(serviceID)
            await this.firestore.clearCommandPartial(serviceID)
            return {
                success: true,
                message: this.responder.response('success', 'enable2fa')
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
                try {
                    let number = (value.charAt(0) === '+') ? value.substr(1) : value
                    await this.firestore.checkIfPhoneNumberExists(number)
                    await new ActionHandler(this.service, this.serviceOptions).enable2FA(serviceID, number)
                    return {
                        success: true,
                        message: this.responder.response('request', 'enable2FA', 'code', { number })
                    }
                } catch (err) {
                    return {
                        success: false,
                        message: err
                    }
                }

            case steps[1]:
                try {
                    await new ActionHandler(this.service, this.serviceOptions).check2FA(serviceID, value)
                    return {
                        success: true,
                        message: this.responder.response('request', 'enable2FA', 'password')
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
                    message: this.responder.response('failure', 'conversation', 'unexpectedInput')
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
        if (!validated) throw this.responder.response('failure', 'conversation', 'invalidStep', { step })
        let params = {}
        params[step] = value
        try {
            await this.firestore.setCommandPartial(this.commandConvo.id, params)
            return await this.afterMessageForStep(step, value)
        } catch (err) {
            throw error
        }
    }

    async validateStep(step, value) {
        switch (step) {
            case steps[0]:
                await this.firestore.unsetPartial2FA(
                    this.commandConvo.id
                )
                return new PhoneNumberValidator(value).validate()
            case steps[1]:
                return true
            default:
                return false
        }
    }

    async clearStep(step) {
        await this.firestore.unsetCommandPartial(
            this.commandConvo.id,
            step
        )
    }
}

module.exports = Enable2FAConvo
