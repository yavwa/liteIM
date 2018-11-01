const { parseNumber } = require('libphonenumber-js')

class NumberValidator {
    constructor(phone) {
        this.phone = phone
    }

    validate() {
        let parsed = parseNumber(this.phone)
        return Object.keys(parsed).length
    }
}

module.exports = NumberValidator
