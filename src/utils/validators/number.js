class NumberValidator {
    constructor(number) {
        this.number = number
    }

    validate() {
        let type = typeof this.number
        switch (type) {
            case 'string':
                let trimmedString = this.number.trim()
                if (trimmedString.length === 0) return false
                let number = Number(trimmedString)
                return !isNaN(number)
            case 'number':
                return true
            default:
                return false
        }
    }
}

module.exports = NumberValidator
