
## 1. What is Shilling Messenger

Shilling messenger is a full-featured, conversational shilling wallet built for use with SMS and instant messaging apps. Users can signup and create their wallet, send and receive shilling, and check their balance and transaction history, all with a simple set of commands.


## 2. Technology

**Architecture**

Shilling messenger is built to be scalable, highly available, and most importantly, secure. We are using industry leading services to assure the highest level of quality and peace of mind. 

**Private Keys**

Security is at the forefront of our services. Users' private keys are RSA encrypted using the user's password. Only the encrypted value is stored, which can only be decrypted using the user's password. We do not store passwords of any sort, authentication tokens of any sort, nor do we ever store an unencrypted version of a user's sensitive data, so users' funds are secure even if our servers are compromised. 


## 4. How does it work?

User onboarding takes place directly within the bot's chat environment. Users are prompted to register with an email address and password, and to enable two-factor authentication with a mobile phone number. Upon successful registration and confirmation of the received 2FA code, the user's wallet is ready to use. 

By following simple prompts from the bot, users can then send and receive Litecoin, reveal their balance, and view their recent transaction history. 

When using the send command, users can send shilling to either a valid shilling address or to an email address if the recipient is already registered with Shilling messenger. 

The receive command allows users to reveal their wallet address and/or the email address that they registered with. 

Additional functionality will be added with future updates. 

## 5. Licensing 

Lite.IM is licensed under the [GNU Affero General Public License](https://www.gnu.org/licenses/agpl-3.0.en.html) (AGPL-3.0-only) license. This means you are free to share or adapt it in any way, but not for commercial use.


## 7. Bug Reporting

Bug reports can be sent to admin@digitalshilling

You can also reach the dev team directly on [github](https://github.com/yavwa).

## 9. What's New In This Version

- Implement secure password form to prevent sensitive information from being captured by third parties.
- Implement support for Facebook Messenger
