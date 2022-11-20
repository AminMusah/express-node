const mongoose = require("mongoose");
require('dotenv').config()

async function connect () {
    try {
       await mongoose.connect(process.env.MONGO_URI)
       console.log('Connected to db')
    } catch (error) {
        console.log(error)
    }
}

connect()