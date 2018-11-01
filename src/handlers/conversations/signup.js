const Firestore = require('../firestore_handler')
const ActionHandler = require('../action_handler')
const PhoneNumberValidator = require('../../utils/validators/phoneNumber')
const Responder = require('../responder')

const steps = ['email', 'phone', 'code']

class SignupConvo {
    constructor(commandConvo, service, serviceOptions, res = null) {
        this.res = res
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
            message: this.responder.response('request', 'signup', 'email')
        }
    }

    async complete(value) {
        let serviceID = this.commandConvo.id
        let { email } = this.commandConvo.data()
        try {
            let address = await new ActionHandler(this.service, this.serviceOptions).signup(serviceID, email, value)
            await this.firestore.updateIdOn2FA(serviceID)
            await this.firestore.clearCommandPartial(serviceID)
            return {
                success: true,
                message: this.responder.response('success', 'signup', null, { address })
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
                    let email = value
                    let emailExists = await this.firestore.checkIfEmailExists(email)
                    if (!emailExists){
                        return {
                            success: true,
                            message: this.responder.response('request', 'signup', 'phone')
                        }
                    } else {
                        this.res.locals.command = '/linkAccount'
                        const LinkAccountConvo = require('./linkAccount')
                        return await this.firestore.setCommandPartial(serviceID, { command: '/linkAccount' })
                            .then(async () => {
                                let data = await new LinkAccountConvo(null, this.service, this.serviceOptions).initialMessage(serviceID, email)
                                return {
                                    success: data.success,
                                    message: data.message
                                }
                            })
                            .catch(async failure => {
                                return {
                                    success: false,
                                    content: failure.message || failure
                                }
                            })

                    }
                } catch (err) {
                    await this.clearStep(step)
                    return {
                        success: false,
                        message: err
                    }
                }

            case steps[1]:
                try {
                    let number = (value.charAt(0) === '+') ? value.substr(1) : value
                    let numberExists = await this.firestore.checkIfPhoneNumberExists(number)
                    if (!numberExists) {
                        await new ActionHandler(this.service, this.serviceOptions).enable2FA(serviceID, number)
                        return {
                            success: true,
                            message: this.responder.response('request', 'signup', 'code', {number})
                        }
                    } else {
                        await this.clearStep(step)
                        return {
                            success: false,
                            message: this.responder.response('failure', 'twoFactor', 'numberInUse')
                        }
                    }
                } catch (err) {
                    await this.clearStep(step)
                    return {
                        success: false,
                        message: err
                    }
                }

            case steps[2]:
                try {
                    await new ActionHandler(this.service, this.serviceOptions).check2FA(serviceID, value)
                    return {
                        success: true,
                        message: this.responder.response('request', 'signup', 'password')
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
        if (!validated) throw this.responder.response('failure', 'conversation', 'invalidStep', {step})
        let params = {}
        params[step] = value
        try {
            await this.firestore.setCommandPartial(this.commandConvo.id, params)
            return await this.afterMessageForStep(step, value)
        } catch (err) {
            throw {
                success: false,
                message: err
            }
        }
    }

    async validateStep(step, value) {
        let serviceID = this.commandConvo.id
        switch (step) {
            case steps[0]:
                await this.firestore.unsetPartial2FA(serviceID)
                return new ActionHandler(this.service, this.serviceOptions).isEmail(value)
            case steps[1]:
                await this.firestore.unsetPartial2FA(serviceID)
                return new PhoneNumberValidator(value).validate()
            case steps[2]:
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

module.exports = SignupConvo
