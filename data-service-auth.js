const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Schema = mongoose.Schema;

// Create Schema
const userSchema = new Schema({
    userName: {
        type: String,
        unique: true
    },
    password: {
        type: String,
    },
    email: {
        type: String
    },
    loginHistory: [{
        dateTime: Date,
        userAgent: String
    }]
});

let User; // to be defined on new connection

module.exports.initialize = () => {
    return new Promise(function (resolve, reject) {
        let db = mongoose.createConnection("mongodb+srv://GurtarnjitSingh:MkMjmA3hvCeyyuVr@cluster0.nelsfqe.mongodb.net/web322", {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        db.on('error', (err) => {
            reject(err);
        });
        db.once('open', () => {
            User = db.model("users", userSchema);
            resolve();
        });
    });
};


module.exports.registerUser = (userData) => {
    let { userName, email, password, password2 } = userData;

    return new Promise((resolve, reject) => {
        if (!email || email?.trim() === "") return reject("Error: Email cannot be empty or only white spaces!");

        if (!userName || userName?.trim() === "") return reject("Error: user name cannot be empty or only white spaces!");

        if (password !== password2) return reject("Error: Passwords do not match");

        bcrypt.hash(password, 10).then(hash => {
            password = hash;
            let newUser = new User({ userName, password, email });

            newUser.save().then(() => {
                resolve();
            }).catch(err => {
                (err.code === 11000) ? reject("User Name already taken") : reject(`There was an error creating the user:  ${err}`);
            });

        }).catch(err => {
            reject(`Something went wrong while encrypting the password. Error: ${err}`);
        })
    })
}

module.exports.checkUser = (userData) => {
    let { userName, password } = userData;
    return new Promise((resolve, reject) => {
        User.findOne({
            userName
        }).exec().then((doc) => {
            if (!doc) {
                reject(`Unable to find user: ${userName}`)
            } else {
                bcrypt.compare(password, doc.password).then((result) => {
                    if (!result) {
                        reject(`Incorrect Password for user: ${userName}`);
                    } else {
                        User.updateOne({
                            userName
                        }, {
                            $push: {
                                loginHistory: [{
                                    dateTime: new Date(),
                                    userAgent: userData.userAgent
                                }]
                            }
                        })
                            .exec()
                            .then(() => {
                                doc.loginHistory.push({
                                    dateTime: new Date(),
                                    userAgent: userData.userAgent
                                })
                                resolve(doc);
                            })
                            .catch((err) => {
                                reject(`There was an error verifying the user: ${err}`)
                            })
                    }
                });
            }

        }).catch((err) => {
            reject("There was an error while finding the user from the database.")
        })
    });
}