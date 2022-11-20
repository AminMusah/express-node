const mongoose = require('mongoose');

const PasswordResetSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
    },
    resetString: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
    },
    expiresAt: {
        type: Date,
    },
})

module.exports = mongoose.model('PasswordReset', PasswordResetSchema)