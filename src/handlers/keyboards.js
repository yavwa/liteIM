const buttons = {
    clear: { text: 'Cancel', callback_data: '/clear' },
    cancel: { text: 'Cancel', callback_data: '/help' },
    back: { text: 'Back', callback_data: '/help' },
    securePassword: { type: 'securePassword', text: 'Secure Password' }
}

const page1 = [
    [
        { text: '💸 Send', callback_data: '/send' },
        { text: '💰 Receive', callback_data: '/receive' }
    ],
    [
        { text: '🏦 Balance', callback_data: '/balance' },
        { text: '📑 Transactions', callback_data: '/transactions' }
    ],
    [{ text: '➡️ More...', callback_data: '/more' }]
]

const page2 = [
    [
        {
            text: '🔒 Change Password',
            callback_data: '/changepassword'
        },
        { text: '📧 Change Email', callback_data: '/changeemail' }
    ],
    [
        { text: '👛 Export Wallet', callback_data: '/export' },
        { text: '🔙 Back', callback_data: '/main' }
    ]
]

const keyboards = {
    success: {
        '/start': [{ text: 'Register', callback_data: '/signup' }],
        '/start1': page1,
        '/help': page1,
        '/clear': page1,
        '/main': page1,
        '/more': page2,
        '/receive': [
            [
                { text: 'Wallet', callback_data: 'wallet' },
                { text: 'QR', callback_data: 'qr' },
                { text: 'Email', callback_data: 'email' }
            ],
            [buttons.cancel]
        ],
        '/receive1': page1,
        '/balance': page1,
        '/transactions': {
            main:
                '[ [ ${transactions} ], [ ${more} ' +
                JSON.stringify(buttons.back) +
                ' ] ]',
            transactions: '{ "text": "${txid}", "url": "${url}" }',
            more: { text: 'More...', callback_data: '/transactions more' }
        },
        '/transactions more': {
            main:
                '[ [ ${transactions} ], [ ${more} ' +
                JSON.stringify(buttons.back) +
                ' ] ]',
            transactions: '{ "text": "${txid}", "url": "${url}" }',
            more: { text: 'More...', callback_data: '/transactions more' }
        },
        '/changeemail': [buttons.clear],
        '/changeemail1': [
            { text: 'New Code', callback_data: '/new newEmail' },
            buttons.clear
        ],
        '/changeemail2': [buttons.securePassword, buttons.clear],
        '/changeemail3': page1,
        '/changepassword': [
            { text: 'New Code', callback_data: '/changepassword' },
            buttons.clear
        ],
        '/changepassword1': [buttons.securePassword, buttons.clear],
        '/changepassword2': page1,
        '/enable2fa': [],
        '/enable2fa1': [
            { text: 'Change Number', callback_data: '/enable2fa' },
            { text: 'New Code', callback_data: '/new number' }
        ],
        '/enable2fa2': [buttons.securePassword, { text: 'Cancel', callback_data: '/enable2fa' }],
        '/enable2fa3': page1,
        '/export': [
            [
                { text: '🗝 key', callback_data: 'key' },
                { text: '🔡 phrase', callback_data: 'phrase' }
            ],
            [buttons.clear]
        ],
        '/export1': [
            { text: 'New Code', callback_data: '/new type' },
            buttons.clear
        ],
        '/export2': [buttons.securePassword, buttons.clear],
        '/export3': page1,
        '/send': [buttons.clear],
        '/send1': [
            [{ text: '$', callback_data: '$' }, { text: 'Ł', callback_data: 'Ł' }],
            [buttons.clear]
        ],
        '/send2': [{ text: 'Send All', callback_data: 'all' }, buttons.clear],
        '/send3': [
            { text: 'New Code', callback_data: '/new amount' },
            buttons.clear
        ],
        '/send4': [buttons.securePassword, buttons.clear],
        '/send5':
            '[{ "text": "${txid}", "url": "${url}" }, { "text": "Main Menu", "callback_data": "/main" }]',
        '/signup': [{ text: 'Cancel', callback_data: '/signup' }],
        '/signup1': [{ text: 'Cancel', callback_data: '/signup' }],
        '/signup2': [
            { text: 'New Code', callback_data: '/new phone' },
            { text: 'Cancel', callback_data: '/signup' }
        ],
        '/signup3': [buttons.securePassword, { text: 'Cancel', callback_data: '/signup' }],
        '/signup4': [{ text: 'Lets Begin!', callback_data: '/help' }],
        '/linkaccount1': [{ text: 'Cancel', callback_data: '/signup' }],
        '/linkaccount2': [buttons.securePassword, { text: 'Cancel', callback_data: '/signup' }],
        '/linkaccount3': [{ text: 'Lets Begin!', callback_data: '/main' }]
    },
    error: {
        '/receive': page1,
        '/receive1': [
            [
                { text: 'Wallet', callback_data: 'wallet' },
                { text: 'QR', callback_data: 'qr' },
                { text: 'Email', callback_data: 'email' }
            ],
            [buttons.cancel]
        ],
        '/balance': page1,
        '/changeemail': [buttons.clear],
        '/changeemail1': [buttons.clear],
        '/changeemail2': [
            { text: 'New Code', callback_data: '/new newEmail' },
            buttons.clear
        ],
        '/changeemail3': [buttons.clear],
        '/changepassword': [buttons.clear],
        '/changepassword1': [
            { text: 'New Code', callback_data: '/changepassword' },
            buttons.clear
        ],
        '/changepassword2': [buttons.clear],
        '/enable2fa': [
            { text: 'Enable Two Factor Auth', callback_data: '/enable2fa' }
        ],
        '/enable2fa1': [{ text: 'Try Again', callback_data: '/enable2fa' }],
        '/enable2fa2': [
            { text: 'Change Number', callback_data: '/enable2fa' },
            { text: 'New Code', callback_data: '/new number' }
        ],
        '/enable2fa3': [{ text: 'Try Again', callback_data: '/enable2fa' }],
        '/export': [buttons.clear],
        '/export1': [buttons.clear],
        '/export2': [
            { text: 'New Code', callback_data: '/new type' },
            buttons.clear
        ],
        '/export3': [buttons.clear],
        '/send': [{ text: 'Receive', callback_data: '/receive' }, buttons.clear],
        '/send1': [buttons.clear],
        '/send2': [buttons.clear],
        '/send3': [buttons.clear],
        '/send4': [
            { text: 'New Code', callback_data: '/new amount' },
            buttons.clear
        ],
        '/send5': [buttons.clear],
        '/signup': [{ text: 'Cancel', callback_data: '/signup' }],
        '/signup1': [{ text: 'Cancel', callback_data: '/signup' }],
        '/signup2': [{ text: 'Cancel', callback_data: '/signup' }],
        '/signup3': [
            { text: 'New Code', callback_data: '/new phone' },
            { text: 'Cancel', callback_data: '/signup' }
        ],
        '/signup4': [{ text: 'Try Again', callback_data: '/signup' }],
        '/clear': page1,
        '/transactions': page1,
        '/transactions more': page1,
        uncaught: [{ text: 'Cancel', callback_data: '/help' }],
        '/uncaught': [{ text: 'Cancel', callback_data: '/help' }],
        '/linkaccount1': [{ text: 'Cancel', callback_data: '/signup' }],
        '/linkaccount2': [{ text: 'Cancel', callback_data: '/signup' }],
        '/linkaccount3': [{ text: 'Cancel', callback_data: '/signup' }]
    }
}

const flatten = items => {
    let keyboards = []
    items.forEach(item => {
        if (Array.isArray(item)) {
            item.forEach(i => {
                keyboards.push(i)
            })
        } else {
            keyboards.push(item)
        }
    })

    return keyboards
}

const getKeyboard = (
    success,
    command,
    step,
    isUser,
    data = {},
    shouldFlatten = false,
    res
) => {

    command = (command || '/uncaught').toLowerCase()

    try {
        let rootKeyboards = success ? keyboards.success : keyboards.error
        if (command === '/start') {
            if (!isUser) step = 0
            else step = 1
        }

        if (command === '/help') {
            step = 0
        }

        let keyboard
        if (step) {
            keyboard = rootKeyboards[`${command}${step}`]
            if (typeof keyboard === 'object' && keyboard.main) {
                keyboard = rootKeyboards[`${command}${step}`].main
            } else {
                keyboard = rootKeyboards[`${command}${step}`]
            }
        } else {
            keyboard = rootKeyboards[command]
                ? rootKeyboards[command].main
                    ? rootKeyboards[command].main
                    : rootKeyboards[command]
                : []
        }

        if (Object.keys(data).length > 0) {
            let rows = []
            for (let key in data) {
                if (!data.hasOwnProperty(key)) continue

                if (Array.isArray(data[key])) {
                    let template = rootKeyboards[command][key]
                    data[key].forEach(datum => {
                        let row = template
                        for (let k in datum) {
                            if (!datum.hasOwnProperty(k)) continue

                            row = row.replace('${' + k + '}', datum[k])
                        }
                        rows.push(row)
                    })
                    keyboard = keyboard.replace('${' + key + '}', rows)
                } else {
                    if (typeof data[key] === 'boolean') {
                        if (data[key]) {
                            keyboard = keyboard.replace(
                                '${' + key + '}',
                                JSON.stringify(rootKeyboards[command][key]) + ','
                            )
                        } else {
                            keyboard = keyboard.replace('${' + key + '}', '')
                        }
                    } else {
                        if (typeof keyboard === 'string') {
                            keyboard = keyboard.replace('${' + key + '}', data[key])
                        }
                    }
                }
            }
            if (typeof keyboard === 'string') {
                keyboard = JSON.parse(keyboard)
            }
        }

        if (!Array.isArray(keyboard) || typeof keyboard === 'string') {
            keyboard = JSON.parse(keyboard)
        }

        let i = 0
        keyboard.forEach(async button => {
            if (button.type === 'securePassword') {
                let email = ''
                if (command === '/linkaccount') {
                    isUser = true
                    email = res.locals.email
                } else {
                    email = isUser ? res.locals.user.email : ''
                }

                let urlPage = (command === '/changepassword') ? 'password-change' : 'password-form'
                let url = 'https://www.lite.im/' + urlPage + '?service=' + res.locals.service + '&serviceID=' + res.locals.serviceID + '&email=' + email + '&isUser=' + isUser

                button.url = url

                keyboard[i] = button
            }
            i++
        })

        if (shouldFlatten && keyboard) keyboard = flatten(keyboard)

        return keyboard
    } catch (err) {
        console.log("keyboard error: ", err)
        return ''
    }
}

module.exports = { getKeyboard }
